import { FakeSocket } from '../test/FakeSocket';
import { RealtimeClient, type ConnectionSnapshot, type RealtimeClientOptions } from './RealtimeClient';

// Each test pins a guard that a mutation could remove with no other test failing.

const URL = 'wss://example.test/stream';
const BTC = 'btcusdt@miniTicker';
const ETH = 'ethusdt@miniTicker';
const SOL = 'solusdt@miniTicker';

type Control = { method: string; params?: string[]; id: number };
const controls = (s: FakeSocket) => s.sent as Control[];
const subscribes = (s: FakeSocket) => controls(s).filter((m) => m.method === 'SUBSCRIBE');

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

beforeEach(() => {
  jest.useFakeTimers();
  FakeSocket.instances = [];
});
afterEach(() => jest.useRealTimers());

test('a socket that opens after stop() does not bring the client back to open', () => {
  const { client } = setup();
  client.subscribe(BTC, jest.fn());
  client.start();
  const ws = FakeSocket.last();
  client.stop('idle'); // e.g. the app went to background while CONNECTING
  ws.serverOpen(); // the handshake still completes
  expect(client.getSnapshot()).toMatchObject({ status: 'idle', lastMessageAt: null });
  expect(jest.getTimerCount()).toBe(0); // no heartbeat, no stable timer
  jest.advanceTimersByTime(60_000);
  expect(ws.sent).toEqual([]);
  expect(FakeSocket.instances).toHaveLength(1);
});

test('a message from a replaced socket reaches no listener and does not refresh liveness', () => {
  const { client } = setup();
  const listener = jest.fn();
  client.subscribe(BTC, listener);
  client.start();
  const old = FakeSocket.last();
  old.serverOpen();
  jest.advanceTimersByTime(1_000);
  old.serverSend({ stream: '!serverShutdown', data: {} }); // reconnect now
  expect(FakeSocket.instances).toHaveLength(2);
  const lastMessageAt = client.getSnapshot().lastMessageAt;

  jest.advanceTimersByTime(1_000);
  old.serverSend({ stream: BTC, data: { c: '1' } }); // still in flight on the old socket
  expect(listener).not.toHaveBeenCalled();
  expect(client.getSnapshot().lastMessageAt).toBe(lastMessageAt);
});

test('a listener subscribed during a dispatch gets the next message, not the current one', () => {
  const { client } = setup();
  const late = jest.fn();
  let added = false;
  client.subscribe(BTC, () => {
    if (added) return;
    added = true;
    client.subscribe(BTC, late);
  });
  client.start();
  const ws = FakeSocket.last();
  ws.serverOpen();
  ws.serverSend({ stream: BTC, data: { n: 1 } });
  expect(late).not.toHaveBeenCalled();
  ws.serverSend({ stream: BTC, data: { n: 2 } });
  expect(late).toHaveBeenCalledTimes(1);
  expect(late).toHaveBeenCalledWith({ n: 2 });
});

test('a stream whose SUBSCRIBE was rejected rides along with the next SUBSCRIBE', () => {
  const { client, errors } = setup();
  client.subscribe(BTC, jest.fn());
  client.start();
  const ws = FakeSocket.last();
  ws.serverOpen();
  jest.advanceTimersByTime(0);
  expect(subscribes(ws)).toHaveLength(1);

  jest.advanceTimersByTime(1_000);
  client.subscribe(ETH, jest.fn());
  jest.advanceTimersByTime(250);
  const eth = subscribes(ws).at(-1);
  expect(eth).toMatchObject({ params: [ETH] });
  ws.serverSend({ error: { code: 2, msg: 'Invalid request' }, id: eth?.id });
  expect(errors).toEqual(['Binance error 2: Invalid request']);

  jest.advanceTimersByTime(1_000);
  client.subscribe(SOL, jest.fn()); // an unrelated subscription
  jest.advanceTimersByTime(250);
  // The rejected stream is no longer believed to be on the server, so the next flush sends it again.
  expect(subscribes(ws).at(-1)).toMatchObject({ params: [ETH, SOL] });
});
