import { FakeSocket } from '../test/FakeSocket';
import { RealtimeClient, type ConnectionSnapshot } from './RealtimeClient';

const URL = 'wss://example.test/stream';
const BTC = 'btcusdt@miniTicker';
const ETH = 'ethusdt@miniTicker';

function setup() {
  const statuses: ConnectionSnapshot[] = [];
  const errors: string[] = [];
  const client = new RealtimeClient({
    url: URL,
    createSocket: (url) => new FakeSocket(url) as unknown as WebSocket,
    random: () => 0.5, // jitter без случайности: задержка = половина «потолка»
    onStatus: (s) => statuses.push(s),
    onError: (e) => errors.push(e.message),
  });
  return { client, statuses, errors };
}

const sentMethods = (s: FakeSocket) => s.sent.map((m) => (m as { method: string }).method);

beforeEach(() => {
  jest.useFakeTimers();
  FakeSocket.instances = [];
});
afterEach(() => jest.useRealTimers());

test('start(): one socket, connecting → open; a second start() does nothing', () => {
  const { client, statuses } = setup();
  client.start();
  client.start();
  expect(FakeSocket.instances).toHaveLength(1);
  expect(client.getSnapshot().status).toBe('connecting');
  FakeSocket.last().serverOpen();
  expect(statuses.at(-1)?.status).toBe('open');
});

test('subscriptions made before open go out as ONE SUBSCRIBE after open', () => {
  const { client } = setup();
  client.subscribe(BTC, jest.fn());
  client.subscribe(ETH, jest.fn());
  client.start();
  const ws = FakeSocket.last();
  ws.serverOpen();
  jest.advanceTimersByTime(0);
  expect(ws.sent).toEqual([{ method: 'SUBSCRIBE', params: [BTC, ETH], id: 1 }]);
});

test('reference counting: one SUBSCRIBE for two subscribers, UNSUBSCRIBE after the last one leaves', () => {
  const { client } = setup();
  client.start();
  const ws = FakeSocket.last();
  ws.serverOpen();
  const onTick = jest.fn(); // одна и та же функция у двух экранов — всё равно 2 ссылки
  const off1 = client.subscribe(BTC, onTick);
  const off2 = client.subscribe(BTC, onTick);
  jest.advanceTimersByTime(0);
  off1();
  off1(); // повторный вызов — без эффекта
  jest.advanceTimersByTime(1_000);
  expect(sentMethods(ws)).toEqual(['SUBSCRIBE']);
  off2();
  jest.advanceTimersByTime(1_000);
  expect(ws.sent.at(-1)).toMatchObject({ method: 'UNSUBSCRIBE', params: [BTC] });
});

test('subscribe + unsubscribe before the flush → nothing is sent', () => {
  const { client } = setup();
  client.start();
  const ws = FakeSocket.last();
  ws.serverOpen();
  const off = client.subscribe(BTC, jest.fn());
  off();
  jest.advanceTimersByTime(1_000);
  expect(ws.sent).toEqual([]);
});

test('at most one control message per 250 ms (Binance limit: 5 per second)', () => {
  const { client } = setup();
  client.start();
  const ws = FakeSocket.last();
  ws.serverOpen();
  const symbols = ['btcusdt', 'ethusdt', 'solusdt', 'xrpusdt', 'adausdt', 'bnbusdt'];
  for (const s of symbols) {
    client.subscribe(`${s}@miniTicker`, jest.fn());
    jest.advanceTimersByTime(50); // пользователь быстро листает
  }
  jest.advanceTimersByTime(2_000);
  expect(ws.sent.length).toBeLessThanOrEqual(3); // 6 изменений склеились в 2–3 сообщения
  const params = ws.sent.flatMap((m) => (m as { params: string[] }).params);
  expect(new Set(params).size).toBe(symbols.length); // и все подписки дошли
});

test('routes { stream, data } only to listeners of that stream; a throwing listener does not break others', () => {
  const { client, errors } = setup();
  const onBtc = jest.fn();
  const onEth = jest.fn();
  client.subscribe(BTC, () => {
    throw new Error('boom');
  });
  client.subscribe(BTC, onBtc);
  client.subscribe(ETH, onEth);
  client.start();
  const ws = FakeSocket.last();
  ws.serverOpen();
  ws.serverSend({ stream: BTC, data: { s: 'BTCUSDT', c: '84710.6' } });
  ws.serverSend({ result: null, id: 1 }); // ответ на SUBSCRIBE — не данные
  ws.serverSendRaw('not json'); // мусор не роняет клиент
  expect(onBtc).toHaveBeenCalledWith({ s: 'BTCUSDT', c: '84710.6' });
  expect(onEth).not.toHaveBeenCalled();
  expect(errors).toEqual(['boom', 'Not JSON']);
});

test('unexpected close → reconnect with backoff, then re-subscribe on the new socket', () => {
  const { client } = setup();
  client.subscribe(BTC, jest.fn());
  client.start();
  FakeSocket.last().serverOpen();
  FakeSocket.last().serverClose(1006);
  expect(client.getSnapshot()).toMatchObject({ status: 'reconnecting', attempt: 1 });
  jest.advanceTimersByTime(249); // attempt 0: 0.5 × 500 мс = 250 мс
  expect(FakeSocket.instances).toHaveLength(1);
  jest.advanceTimersByTime(1);
  expect(FakeSocket.instances).toHaveLength(2);
  const ws2 = FakeSocket.last();
  ws2.serverOpen();
  jest.advanceTimersByTime(0);
  expect(ws2.sent).toEqual([{ method: 'SUBSCRIBE', params: [BTC], id: expect.any(Number) }]);
});

test('backoff grows while the server is down; attempt resets after 10 s of a stable connection', () => {
  const { client } = setup();
  client.start();
  const delays: number[] = [];
  for (let i = 0; i < 5; i++) {
    FakeSocket.last().serverClose(1006);
    const before = FakeSocket.instances.length;
    let waited = 0;
    while (FakeSocket.instances.length === before) {
      jest.advanceTimersByTime(10);
      waited += 10;
    }
    delays.push(waited);
  }
  expect(delays).toEqual([250, 500, 1000, 2000, 4000]);
  FakeSocket.last().serverOpen();
  jest.advanceTimersByTime(10_000);
  expect(client.getSnapshot()).toMatchObject({ status: 'open', attempt: 0 });
});

test('a server that accepts and drops at once still gets growing delays (no reset on open)', () => {
  const { client } = setup();
  client.start();
  for (const expected of [250, 500, 1000]) {
    FakeSocket.last().serverOpen();
    FakeSocket.last().serverClose(1008, 'Too many requests');
    const before = FakeSocket.instances.length;
    jest.advanceTimersByTime(expected - 1);
    expect(FakeSocket.instances).toHaveLength(before);
    jest.advanceTimersByTime(1);
    expect(FakeSocket.instances).toHaveLength(before + 1);
  }
});

test('silent connection: probe at 10 s, at 15 s close it ourselves and reconnect', () => {
  const { client } = setup();
  client.start();
  const ws = FakeSocket.last();
  ws.serverOpen();
  jest.advanceTimersByTime(10_000);
  expect(sentMethods(ws)).toEqual(['LIST_SUBSCRIPTIONS']);
  jest.advanceTimersByTime(5_000);
  expect(ws.closedWith?.code).toBe(4000);
  expect(client.getSnapshot().status).toBe('reconnecting'); // не ждём onclose «полуоткрытого» сокета
  jest.advanceTimersByTime(250);
  expect(FakeSocket.instances).toHaveLength(2);
});

test('messages keep the connection alive: no probe while data flows', () => {
  const { client } = setup();
  client.start();
  const ws = FakeSocket.last();
  ws.serverOpen();
  for (let i = 0; i < 30; i++) {
    jest.advanceTimersByTime(1_000);
    ws.serverSend({ stream: BTC, data: {} });
  }
  expect(ws.sent).toEqual([]);
  expect(client.getSnapshot().status).toBe('open');
});

test('serverShutdown → new connection right away, without backoff', () => {
  const { client } = setup();
  client.start();
  FakeSocket.last().serverOpen();
  FakeSocket.last().serverSend({ stream: '!serverShutdown', data: { e: 'serverShutdown', E: 1 } });
  expect(FakeSocket.instances).toHaveLength(2);
  expect(FakeSocket.instances[0]?.closedWith?.code).toBe(1000);
});

test('stop(): close 1000, no reconnect, no timers left', () => {
  const { client } = setup();
  client.subscribe(BTC, jest.fn());
  client.start();
  const ws = FakeSocket.last();
  ws.serverOpen();
  client.stop('offline');
  expect(ws.closedWith?.code).toBe(1000);
  ws.serverClose(1000); // позднее событие старого сокета
  jest.advanceTimersByTime(60_000);
  expect(FakeSocket.instances).toHaveLength(1);
  expect(client.getSnapshot().status).toBe('offline');
  expect(jest.getTimerCount()).toBe(0);
});

test('stop() while waiting for a reconnect cancels it', () => {
  const { client } = setup();
  client.start();
  FakeSocket.last().serverClose(1006);
  expect(client.getSnapshot().status).toBe('reconnecting');
  client.stop('idle');
  jest.advanceTimersByTime(60_000);
  expect(FakeSocket.instances).toHaveLength(1);
  expect(jest.getTimerCount()).toBe(0);
});

test('a late close of an old socket does not create a second connection', () => {
  const { client } = setup();
  client.start();
  const ws1 = FakeSocket.last();
  ws1.serverOpen();
  ws1.serverSend({ stream: '!serverShutdown', data: {} }); // → ws2
  ws1.serverClose(1006); // старый сокет закрылся позже
  jest.advanceTimersByTime(60_000);
  expect(FakeSocket.instances).toHaveLength(2);
});

test('guards: uppercase symbol and more than maxStreams are rejected', () => {
  const client = new RealtimeClient({ url: URL, maxStreams: 2, createSocket: (u) => new FakeSocket(u) as unknown as WebSocket });
  expect(() => client.subscribe('BTCUSDT@miniTicker', jest.fn())).toThrow(/lowercase/);
  expect(() => client.subscribe('!miniTicker@arr', jest.fn())).not.toThrow();
  client.subscribe(BTC, jest.fn());
  expect(() => client.subscribe(ETH, jest.fn())).toThrow(/max 2/);
});
