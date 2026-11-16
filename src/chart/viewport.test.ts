import { followLiveEdge, maxOffset, panBy, visibleRange, zoomAt } from './viewport';

test('visibleRange: basic cases', () => {
  expect(visibleRange(0, 10, 100, 500)).toEqual([489, 499]);
  expect(visibleRange(25, 10, 100, 500)).toEqual([487, 497]);
  expect(visibleRange(0, 10, 100, 5)).toEqual([0, 4]);
  expect(visibleRange(0, 10, 100, 0)).toEqual([0, -1]);
});

test('panBy: finger to the right goes into history; clamped to [0, maxOffset]', () => {
  expect(maxOffset(500, 10, 100)).toBe(4900);
  expect(maxOffset(5, 10, 100)).toBe(0); // всё влезло — двигать некуда
  expect(panBy(0, 30, 500, 10, 100)).toBe(30);
  expect(panBy(10, -50, 500, 10, 100)).toBe(0);
  expect(panBy(4890, 50, 500, 10, 100)).toBe(4900);
});

test('zoomAt: the candle under the fingers stays in place', () => {
  const start = { candleW: 10, offset: 0 };
  expect(zoomAt(start, 2, 50, 100, 500)).toEqual({ candleW: 20, offset: 50 });
  expect(zoomAt(start, 2, 100, 100, 500)).toEqual({ candleW: 20, offset: 0 }); // зум у правого края
  expect(zoomAt(start, 10, 50, 100, 500).candleW).toBe(32); // MAX_CANDLE_W
  expect(zoomAt(start, 0.01, 50, 100, 500).candleW).toBe(3); // MIN_CANDLE_W
  expect(zoomAt({ candleW: 10, offset: 4900 }, 0.5, 50, 100, 500)).toEqual({ candleW: 5, offset: 2400 }); // clamp
});

test('followLiveEdge: at the live edge follow the market, in history stay still', () => {
  expect(followLiveEdge(0, 1, 10)).toBe(0);
  expect(followLiveEdge(0.4, 1, 10)).toBe(0); // хвост инерции — тоже «край»
  expect(followLiveEdge(300, 1, 10)).toBe(310);
});

test('followLiveEdge: the live-edge threshold is strictly under 1 px', () => {
  expect(followLiveEdge(0.999, 1, 10)).toBe(0);
  expect(followLiveEdge(1, 1, 10)).toBe(11);
});
