import { FakeSocket } from '../test/FakeSocket';
import { RealtimeClient } from './RealtimeClient';

const BTC = 'btcusdt@miniTicker';

function setup() {
  const onMessage = jest.fn();
  const client = new RealtimeClient({
    url: 'wss://example.test/stream',
    createSocket: (url) => new FakeSocket(url) as unknown as WebSocket,
    random: () => 0.5,
    onMessage,
  });
  client.subscribe(BTC, jest.fn());
  client.start();
  const ws = FakeSocket.last();
  ws.serverOpen();
  return { client, ws, onMessage };
}

beforeEach(() => {
  jest.useFakeTimers();
  FakeSocket.instances = [];
});
afterEach(() => jest.useRealTimers());

test('onMessage fires once per data message that reached a subscriber', () => {
  const { ws, onMessage } = setup();
  ws.serverSend({ stream: BTC, data: { x: 1 } });
  ws.serverSend({ stream: BTC, data: { x: 2 } });
  expect(onMessage).toHaveBeenCalledTimes(2);
});

test('onMessage ignores control responses, unsubscribed streams and invalid frames', () => {
  const { ws, onMessage } = setup();
  ws.serverSend({ result: null, id: 1 });
  ws.serverSend({ stream: 'ethusdt@miniTicker', data: {} });
  ws.serverSendRaw('not json at all');
  ws.serverSend({ stream: 5 });
  expect(onMessage).not.toHaveBeenCalled();
});

test('onMessage gets the handler time: parse, envelope check and every listener', () => {
  const { client, ws, onMessage } = setup();
  client.subscribe(BTC, () => {
    jest.advanceTimersByTime(3); // fake timers drive performance.now(): a listener that "takes" 3 ms
  });
  ws.serverSend({ stream: BTC, data: { x: 1 } });
  expect(onMessage).toHaveBeenCalledTimes(1);
  expect(onMessage).toHaveBeenCalledWith(3);
});
