import { FakeSocket } from '../test/FakeSocket';
import { RealtimeClient } from './RealtimeClient';

const URL = 'wss://example.test/stream';
const BTC = 'btcusdt@miniTicker';
const ETH = 'ethusdt@miniTicker';
const SOL = 'solusdt@miniTicker';

type Control = { method: string; params?: string[]; id: number };

function setup() {
  const errors: string[] = [];
  const client = new RealtimeClient({
    url: URL,
    createSocket: (url) => new FakeSocket(url) as unknown as WebSocket,
    random: () => 0.5,
    onError: (e) => errors.push(e.message),
  });
  return { client, errors };
}

const controls = (s: FakeSocket) => s.sent as Control[];

/** Subscribes BTC and ETH, opens, lets SUBSCRIBE out, then 10 s of silence makes the client probe. */
function openAndProbe() {
  const ctx = setup();
  ctx.client.subscribe(BTC, jest.fn());
  ctx.client.subscribe(ETH, jest.fn());
  ctx.client.start();
  const ws = FakeSocket.last();
  ws.serverOpen();
  jest.advanceTimersByTime(10_000);
  const probe = controls(ws).find((m) => m.method === 'LIST_SUBSCRIPTIONS');
  if (!probe) throw new Error('no probe was sent');
  return { ...ctx, ws, probe };
}

beforeEach(() => {
  jest.useFakeTimers();
  FakeSocket.instances = [];
});
afterEach(() => jest.useRealTimers());

test('a stream missing from LIST_SUBSCRIPTIONS is re-subscribed (and only that one)', () => {
  const { ws, probe } = openAndProbe();
  expect(controls(ws).map((m) => m.method)).toEqual(['SUBSCRIBE', 'LIST_SUBSCRIPTIONS']);

  ws.serverSend({ result: [BTC], id: probe.id });
  jest.advanceTimersByTime(250);

  expect(controls(ws)).toHaveLength(3);
  expect(controls(ws)[2]).toMatchObject({ method: 'SUBSCRIBE', params: [ETH] });
});

test('the re-SUBSCRIBE respects the 250 ms send interval', () => {
  const { ws, probe } = openAndProbe();
  ws.serverSend({ result: [], id: probe.id }); // arrives right after the probe went out
  jest.advanceTimersByTime(249);
  expect(controls(ws)).toHaveLength(2);
  jest.advanceTimersByTime(1);
  expect(controls(ws)[2]).toMatchObject({ method: 'SUBSCRIBE', params: [BTC, ETH] }); // batched
});

test('a list that matches the wanted set sends nothing', () => {
  const { ws, probe } = openAndProbe();
  ws.serverSend({ result: [BTC, ETH], id: probe.id });
  jest.advanceTimersByTime(5_000);
  expect(controls(ws).map((m) => m.method)).toEqual(['SUBSCRIBE', 'LIST_SUBSCRIPTIONS']);
});

test('the comparison ignores case (the server may normalise stream names)', () => {
  const { ws, probe } = openAndProbe();
  ws.serverSend({ result: [BTC.toLowerCase(), ETH.toLowerCase()], id: probe.id });
  jest.advanceTimersByTime(1_000);
  expect(controls(ws)).toHaveLength(2);
});

test('a reply with an unrelated id is ignored', () => {
  const { ws, probe, errors } = openAndProbe();
  ws.serverSend({ result: [], id: probe.id + 100 });
  jest.advanceTimersByTime(1_000);
  expect(controls(ws)).toHaveLength(2);
  expect(errors).toEqual([]);
});

test('a probe reply is applied once: a repeated reply with the same id does nothing', () => {
  const { ws, probe } = openAndProbe();
  ws.serverSend({ result: [BTC], id: probe.id });
  jest.advanceTimersByTime(250);
  expect(controls(ws)).toHaveLength(3);
  ws.serverSend({ result: [BTC], id: probe.id });
  jest.advanceTimersByTime(1_000);
  expect(controls(ws)).toHaveLength(3);
});

test('a stream subscribed after the probe is not judged by the older reply', () => {
  const { client, ws, probe } = openAndProbe();
  client.subscribe(SOL, jest.fn());
  jest.advanceTimersByTime(250); // SOL goes out as a separate SUBSCRIBE
  expect(controls(ws)[2]).toMatchObject({ method: 'SUBSCRIBE', params: [SOL] });
  ws.serverSend({ result: [BTC, ETH], id: probe.id }); // server answered before it saw SOL
  jest.advanceTimersByTime(1_000);
  expect(controls(ws)).toHaveLength(3);
});

test('a stream unsubscribed before the reply is not re-subscribed', () => {
  const { client, ws, probe } = openAndProbe();
  const off = client.subscribe(SOL, jest.fn());
  off();
  const offEth = client.subscribe(ETH, jest.fn());
  offEth(); // ETH still has its first subscriber
  ws.serverSend({ result: [BTC], id: probe.id });
  jest.advanceTimersByTime(250);
  expect(controls(ws)[2]).toMatchObject({ method: 'SUBSCRIBE', params: [ETH] });
});

test('an error reply is reported, a malformed list is dropped and counted', () => {
  const { client, ws, probe, errors } = openAndProbe();
  ws.serverSend({ error: { code: 2, msg: 'Invalid request' }, id: 99 });
  ws.serverSend({ code: 2, msg: 'Invalid request: flat form', id: 98 });
  ws.serverSend({ result: 'oops', id: probe.id });
  jest.advanceTimersByTime(1_000);
  expect(errors).toEqual([
    'Binance error 2: Invalid request',
    'Binance error 2: Invalid request: flat form',
    'Invalid LIST_SUBSCRIPTIONS result',
  ]);
  expect(client.getInvalidMessageCount()).toBe(1);
  expect(controls(ws)).toHaveLength(2);
});

test('a message that is not an envelope is dropped, counted and never thrown', () => {
  const { client, ws, errors } = openAndProbe();
  expect(() => ws.serverSend({ hello: 'world' })).not.toThrow();
  expect(() => ws.serverSend([1, 2, 3])).not.toThrow();
  expect(client.getInvalidMessageCount()).toBe(2);
  expect(errors).toHaveLength(2);
  expect(client.getSnapshot().status).toBe('open');
});

test('close code 1008 is reported as a client bug and still reconnects', () => {
  const { ws, errors } = openAndProbe();
  ws.serverClose(1008, 'Too many requests');
  expect(errors).toEqual(['Socket closed with 1008 (client bug): Too many requests']);
  jest.advanceTimersByTime(250);
  expect(FakeSocket.instances).toHaveLength(2);
});

test('after a reconnect nothing is reconciled against the old socket probe', () => {
  const { ws, probe } = openAndProbe();
  ws.serverClose(1006);
  jest.advanceTimersByTime(250);
  const ws2 = FakeSocket.last();
  ws2.serverOpen();
  jest.advanceTimersByTime(0);
  ws2.serverSend({ result: [], id: probe.id }); // same numeric id would only match a stale probe
  jest.advanceTimersByTime(1_000);
  expect(controls(ws2).map((m) => m.method)).toEqual(['SUBSCRIBE']);
});

test('stop() resets attempt to 0 and leaves no timers', () => {
  const { client, ws } = openAndProbe();
  ws.serverClose(1006);
  expect(client.getSnapshot().attempt).toBe(1);
  client.stop();
  expect(client.getSnapshot()).toMatchObject({ status: 'idle', attempt: 0 });
  expect(jest.getTimerCount()).toBe(0);
});
