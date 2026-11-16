import { FakeSocket } from '../test/FakeSocket';
import { RealtimeClient } from './RealtimeClient';

// The test "stop() while waiting for a reconnect cancels it" (RealtimeClient.test.ts) advances 60 s
// before checking the timers, so a leaked reconnect timer fires as a no-op and the test stays green
// (mutation: stop() without clearReconnectTimer). Here the check happens right after stop().

beforeEach(() => {
  jest.useFakeTimers();
  FakeSocket.instances = [];
});

afterEach(() => {
  jest.useRealTimers();
});

test('stop() while waiting for a reconnect clears the pending reconnect timer immediately', () => {
  const client = new RealtimeClient({
    url: 'wss://example.test/stream',
    createSocket: (url) => new FakeSocket(url) as unknown as WebSocket,
    random: () => 0.5,
  });
  client.start();
  FakeSocket.last().serverClose(1006);
  expect(client.getSnapshot().status).toBe('reconnecting');
  expect(jest.getTimerCount()).toBe(1); // the reconnect timer
  client.stop('idle');
  expect(jest.getTimerCount()).toBe(0); // cancelled, not merely harmless when it fires
  expect(client.getSnapshot()).toMatchObject({ status: 'idle', attempt: 0 });
});
