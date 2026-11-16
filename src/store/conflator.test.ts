import { createConflator } from './conflator';
import type { TickerPatch } from './types';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const p = (symbol: string, eventTime: number, last: string): TickerPatch => ({ symbol, eventTime, last });

test('1000 updates for 3 symbols within 200 ms → one batch with 3 entries', () => {
  const onFlush = jest.fn();
  const c = createConflator<TickerPatch>(onFlush, 200);
  for (let i = 0; i < 1000; i++) c.push(p(['BTCUSDT', 'ETHUSDT', 'SOLUSDT'][i % 3]!, i, String(i)));
  jest.advanceTimersByTime(199);
  expect(onFlush).not.toHaveBeenCalled();
  jest.advanceTimersByTime(1);
  const batch: Map<string, TickerPatch> = onFlush.mock.calls[0][0];
  expect(batch.size).toBe(3);
  expect(batch.get('BTCUSDT')?.last).toBe('999');
});

test('fields of different streams are merged; an older event does not overwrite a newer one', () => {
  const onFlush = jest.fn();
  const c = createConflator<TickerPatch>(onFlush, 200);
  c.push({ symbol: 'BTCUSDT', eventTime: 10, last: '100', open: '90' }); // miniTicker
  c.push(p('BTCUSDT', 12, '101')); // сделка
  c.push(p('BTCUSDT', 11, '99')); // опоздала
  c.flush();
  expect(onFlush.mock.calls[0][0].get('BTCUSDT')).toEqual({ symbol: 'BTCUSDT', eventTime: 12, last: '101', open: '90' });
});

test('no data → no timers; dispose() drops the pending batch', () => {
  const onFlush = jest.fn();
  const c = createConflator<TickerPatch>(onFlush, 200);
  expect(jest.getTimerCount()).toBe(0);
  c.push(p('BTCUSDT', 1, '1'));
  c.dispose();
  jest.advanceTimersByTime(1_000);
  expect(onFlush).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
});

// --- additional tests ---

test('flush() with nothing pending does not call onFlush', () => {
  const onFlush = jest.fn();
  const c = createConflator<TickerPatch>(onFlush, 200);
  c.flush();
  expect(onFlush).not.toHaveBeenCalled();
});

test('flush() hands the batch over immediately and cancels the pending timer', () => {
  const onFlush = jest.fn();
  const c = createConflator<TickerPatch>(onFlush, 200);
  c.push(p('BTCUSDT', 1, '1'));
  expect(jest.getTimerCount()).toBe(1);
  c.flush();
  expect(onFlush).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
  jest.advanceTimersByTime(1_000);
  expect(onFlush).toHaveBeenCalledTimes(1);
});

test('the timer is lazy: after a flush the next push schedules a new one; each batch is a new Map', () => {
  const onFlush = jest.fn();
  const c = createConflator<TickerPatch>(onFlush, 200);
  c.push(p('BTCUSDT', 1, '1'));
  jest.advanceTimersByTime(200);
  expect(jest.getTimerCount()).toBe(0);
  jest.advanceTimersByTime(1_000);
  expect(onFlush).toHaveBeenCalledTimes(1);
  c.push(p('ETHUSDT', 2, '2'));
  expect(jest.getTimerCount()).toBe(1);
  jest.advanceTimersByTime(200);
  expect(onFlush).toHaveBeenCalledTimes(2);
  const [first, second] = onFlush.mock.calls.map((call) => call[0] as Map<string, TickerPatch>);
  expect(first).not.toBe(second);
  expect([...first!.keys()]).toEqual(['BTCUSDT']); // pending was reset between batches
  expect([...second!.keys()]).toEqual(['ETHUSDT']);
});

test('a newer event wins on conflicting fields; a newer event without a field keeps the older value', () => {
  const onFlush = jest.fn();
  const c = createConflator<TickerPatch>(onFlush, 200);
  c.push({ symbol: 'BTCUSDT', eventTime: 1, last: '1', high: '5' });
  c.push({ symbol: 'BTCUSDT', eventTime: 2, last: '2', low: '0' });
  c.flush();
  expect(onFlush.mock.calls[0][0].get('BTCUSDT')).toEqual({ symbol: 'BTCUSDT', eventTime: 2, last: '2', high: '5', low: '0' });
});

test('equal eventTime: the later push wins', () => {
  const onFlush = jest.fn();
  const c = createConflator<TickerPatch>(onFlush, 200);
  c.push(p('BTCUSDT', 5, 'a'));
  c.push(p('BTCUSDT', 5, 'b'));
  c.flush();
  expect(onFlush.mock.calls[0][0].get('BTCUSDT')?.last).toBe('b');
});

test('push after dispose is ignored and schedules nothing', () => {
  const onFlush = jest.fn();
  const c = createConflator<TickerPatch>(onFlush, 200);
  c.dispose();
  c.push(p('BTCUSDT', 1, '1'));
  expect(jest.getTimerCount()).toBe(0);
  c.flush();
  jest.advanceTimersByTime(1_000);
  expect(onFlush).not.toHaveBeenCalled();
});

test('intervalMs = 0 → no batching: every push flushes synchronously, no timers', () => {
  const onFlush = jest.fn();
  const c = createConflator<TickerPatch>(onFlush, 0);
  c.push(p('BTCUSDT', 1, '1'));
  c.push(p('BTCUSDT', 2, '2'));
  expect(onFlush).toHaveBeenCalledTimes(2);
  expect(jest.getTimerCount()).toBe(0);
  expect(onFlush.mock.calls[1][0].get('BTCUSDT')?.last).toBe('2');
});

test('continuous pushes at 200 ms → at most 5 flushes per second', () => {
  const onFlush = jest.fn();
  const c = createConflator<TickerPatch>(onFlush, 200);
  for (let ms = 0; ms < 1_000; ms++) {
    c.push(p('BTCUSDT', ms, String(ms)));
    jest.advanceTimersByTime(1);
  }
  expect(onFlush.mock.calls.length).toBeLessThanOrEqual(5);
  expect(onFlush.mock.calls.length).toBeGreaterThanOrEqual(4);
});
