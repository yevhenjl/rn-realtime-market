import { FakeSocket } from '../test/FakeSocket';
import { RealtimeClient, type ConnectionSnapshot, type RealtimeClientOptions } from './RealtimeClient';

const URL = 'wss://example.test/stream';
const BTC = 'btcusdt@miniTicker';
const ETH = 'ethusdt@miniTicker';

type Control = { method: string; params?: string[]; id: number };
const controls = (s: FakeSocket) => s.sent as Control[];
const methods = (s: FakeSocket) => controls(s).map((m) => m.method);

class ThrowingCloseSocket extends FakeSocket {
  close(): void {
    throw new Error('close boom');
  }
}

class FlakySendSocket extends FakeSocket {
  failuresLeft = 1;
  send(data: string): void {
    if (this.failuresLeft > 0) {
      this.failuresLeft -= 1;
      throw new Error('send boom');
    }
    super.send(data);
  }
}

function setup(extra: Partial<RealtimeClientOptions> = {}) {
  const errors: string[] = [];
  const statuses: ConnectionSnapshot[] = [];
  const client = new RealtimeClient({
    url: URL,
    createSocket: (url) => new FakeSocket(url) as unknown as WebSocket,
    random: () => 0.5,
    onStatus: (s) => statuses.push(s),
    onError: (e) => errors.push(e.message),
    ...extra,
  });
  return { client, errors, statuses };
}

/** Advances `seconds` one second at a time; BTC data arrives each second, nothing else does. */
function flowBtc(ws: FakeSocket, seconds: number) {
  for (let i = 0; i < seconds; i++) {
    jest.advanceTimersByTime(1_000);
    ws.serverSend({ stream: BTC, data: {} });
  }
}

beforeEach(() => {
  jest.useFakeTimers();
  FakeSocket.instances = [];
});
afterEach(() => jest.useRealTimers());

describe('F2: per-stream reconcile while data flows', () => {
  test('a lost stream is re-subscribed after 30 s although BTC keeps flowing', () => {
    const { client } = setup();
    client.subscribe(BTC, jest.fn());
    client.subscribe(ETH, jest.fn());
    client.start();
    const ws = FakeSocket.last();
    ws.serverOpen();
    flowBtc(ws, 29);
    expect(methods(ws)).toEqual(['SUBSCRIBE']);
    flowBtc(ws, 1);
    const probe = controls(ws).find((m) => m.method === 'LIST_SUBSCRIPTIONS');
    expect(probe).toBeDefined();
    ws.serverSend({ result: [BTC], id: probe?.id });
    jest.advanceTimersByTime(250);
    expect(controls(ws).at(-1)).toMatchObject({ method: 'SUBSCRIBE', params: [ETH] });
  });

  test('no probe when every stream flows (60 s)', () => {
    const { client } = setup();
    client.subscribe(BTC, jest.fn());
    client.start();
    const ws = FakeSocket.last();
    ws.serverOpen();
    flowBtc(ws, 60);
    expect(methods(ws)).toEqual(['SUBSCRIBE']);
  });

  test('at most one stream-silence probe per 30 s, even when it is never answered', () => {
    const { client } = setup();
    client.subscribe(BTC, jest.fn());
    client.subscribe(ETH, jest.fn()); // never delivers
    client.start();
    const ws = FakeSocket.last();
    ws.serverOpen();
    flowBtc(ws, 59);
    expect(methods(ws).filter((m) => m === 'LIST_SUBSCRIPTIONS')).toHaveLength(1);
    flowBtc(ws, 30);
    expect(methods(ws).filter((m) => m === 'LIST_SUBSCRIPTIONS')).toHaveLength(2);
  });

  test('a rejected SUBSCRIBE drops the streams from serverStreams; the next probe re-subscribes them', () => {
    const { client, errors } = setup();
    client.subscribe(BTC, jest.fn());
    client.start();
    const ws = FakeSocket.last();
    ws.serverOpen();
    jest.advanceTimersByTime(0);
    flowBtc(ws, 5);
    client.subscribe(ETH, jest.fn());
    flowBtc(ws, 1); // ETH SUBSCRIBE goes out
    const eth = controls(ws).at(-1);
    expect(eth).toMatchObject({ method: 'SUBSCRIBE', params: [ETH] });
    ws.serverSend({ error: { code: 2, msg: 'Invalid request' }, id: eth?.id });
    expect(errors).toEqual(['Binance error 2: Invalid request']);

    flowBtc(ws, 20); // no immediate re-flush
    expect(controls(ws).filter((m) => m.method === 'SUBSCRIBE')).toHaveLength(2);

    flowBtc(ws, 10); // 30 s after ETH was sent: probe
    const probe = controls(ws).find((m) => m.method === 'LIST_SUBSCRIPTIONS');
    expect(probe).toBeDefined();
    ws.serverSend({ result: [BTC], id: probe?.id });
    jest.advanceTimersByTime(250);
    expect(controls(ws).at(-1)).toMatchObject({ method: 'SUBSCRIBE', params: [ETH] });
  });
});

describe('F3: a throwing collaborator does not stop the recovery', () => {
  test('close() throwing in the stale path still reconnects', () => {
    const { client, errors } = setup({
      createSocket: (url) => new ThrowingCloseSocket(url) as unknown as WebSocket,
    });
    client.start();
    FakeSocket.last().serverOpen();
    jest.advanceTimersByTime(15_000);
    expect(errors).toContain('close boom');
    expect(client.getSnapshot().status).toBe('reconnecting');
    jest.advanceTimersByTime(250);
    expect(FakeSocket.instances).toHaveLength(2);
  });

  test('onStatus throwing during a reconnect still reconnects', () => {
    const { client, errors } = setup({
      onStatus: (s) => {
        if (s.status === 'reconnecting') throw new Error('status boom');
      },
    });
    client.start();
    FakeSocket.last().serverOpen();
    expect(() => FakeSocket.last().serverClose(1006)).not.toThrow();
    expect(errors).toContain('status boom');
    jest.advanceTimersByTime(250);
    expect(FakeSocket.instances).toHaveLength(2);
  });

  test('onError throwing is swallowed', () => {
    const { client } = setup({
      onError: () => {
        throw new Error('error handler boom');
      },
    });
    client.subscribe(BTC, () => {
      throw new Error('listener boom');
    });
    client.start();
    const ws = FakeSocket.last();
    ws.serverOpen();
    expect(() => ws.serverSend({ stream: BTC, data: {} })).not.toThrow();
    expect(() => ws.serverSendRaw('not json')).not.toThrow();
  });
});

describe('F4: explicit undefined options keep the defaults', () => {
  test('backoff: undefined and random: undefined connect and reconnect', () => {
    const client = new RealtimeClient({
      url: URL,
      backoff: undefined,
      random: undefined,
      heartbeatMs: undefined,
      createSocket: (url) => new FakeSocket(url) as unknown as WebSocket,
    });
    client.start();
    FakeSocket.last().serverOpen();
    FakeSocket.last().serverClose(1006);
    expect(client.getSnapshot()).toMatchObject({ status: 'reconnecting', attempt: 1 });
    jest.advanceTimersByTime(500); // default base 500 ms is the ceiling for attempt 0
    expect(FakeSocket.instances).toHaveLength(2);
    client.stop();
  });
});

describe('F5: url validation', () => {
  test.each(['ws://example.test/stream', 'https://example.test', 'example.test', ''])(
    'rejects %p',
    (url) => {
      expect(() => new RealtimeClient({ url })).toThrow(/wss:\/\//);
    },
  );

  test('accepts wss://', () => {
    expect(() => new RealtimeClient({ url: URL })).not.toThrow();
  });
});

describe('F6: a failed send is retried', () => {
  test('the first send throws, the SUBSCRIBE goes out one interval later', () => {
    const { client, errors } = setup({
      createSocket: (url) => new FlakySendSocket(url) as unknown as WebSocket,
    });
    client.subscribe(BTC, jest.fn());
    client.start();
    const ws = FakeSocket.last();
    ws.serverOpen();
    jest.advanceTimersByTime(0);
    expect(errors).toEqual(['send boom']);
    expect(ws.sent).toEqual([]);
    jest.advanceTimersByTime(249);
    expect(ws.sent).toEqual([]);
    jest.advanceTimersByTime(1);
    expect(ws.sent).toEqual([{ method: 'SUBSCRIBE', params: [BTC], id: 1 }]);
  });

  test('a permanently failing send retries at most once per interval', () => {
    const { client, errors } = setup({
      createSocket: (url) => {
        const ws = new FlakySendSocket(url);
        ws.failuresLeft = Infinity;
        return ws as unknown as WebSocket;
      },
    });
    client.subscribe(BTC, jest.fn());
    client.start();
    FakeSocket.last().serverOpen();
    jest.advanceTimersByTime(1_000);
    expect(errors.length).toBeLessThanOrEqual(5);
    client.stop();
  });
});

describe('F7: error reply with id null', () => {
  test('is reported as a Binance error, not as an invalid message', () => {
    const { client, errors } = setup();
    client.start();
    const ws = FakeSocket.last();
    ws.serverOpen();
    ws.serverSend({ error: { code: 2, msg: 'Invalid request' }, id: null });
    ws.serverSend({ code: 3, msg: 'flat form', id: null });
    expect(errors).toEqual(['Binance error 2: Invalid request', 'Binance error 3: flat form']);
    expect(client.getInvalidMessageCount()).toBe(0);
  });

  test('a non-error reply with id null is ignored', () => {
    const { client, errors } = setup();
    client.start();
    const ws = FakeSocket.last();
    ws.serverOpen();
    ws.serverSend({ result: null, id: null });
    expect(errors).toEqual([]);
  });
});

describe('F1: data ticks and control replies are discriminated', () => {
  test('an envelope with a bad shape and a stream key counts as invalid', () => {
    const { client, errors } = setup();
    client.start();
    const ws = FakeSocket.last();
    ws.serverOpen();
    ws.serverSend({ stream: 42, data: {} });
    expect(client.getInvalidMessageCount()).toBe(1);
    expect(errors).toEqual(['Invalid message: not a { stream, data } envelope']);
  });

  test('null and primitive JSON are dropped as invalid', () => {
    const { client } = setup();
    client.start();
    const ws = FakeSocket.last();
    ws.serverOpen();
    ws.serverSendRaw('null');
    ws.serverSendRaw('42');
    expect(client.getInvalidMessageCount()).toBe(2);
  });
});

describe('stop() called synchronously from onStatus', () => {
  test('leaves no socket and no timers', () => {
    const holder: { client?: RealtimeClient } = {};
    const { client } = setup({
      onStatus: (s) => {
        if (s.status === 'connecting') holder.client?.stop();
      },
    });
    holder.client = client;
    client.subscribe(BTC, jest.fn());
    client.start();
    expect(FakeSocket.instances).toHaveLength(0);
    expect(jest.getTimerCount()).toBe(0);
    expect(client.getSnapshot().status).toBe('idle');
  });
});
