import { AXIS_W, computeLayout, indexAtX, priceY, volumeY, xCenter } from './layout';

const candles = Array.from({ length: 100 }, (_, i) => ({ t: i * 60_000, o: 100, h: 110 + (i % 3), l: 90, c: 105, v: i }));

test('computeLayout: visible range, price range of the visible candles, volume, ticks', () => {
  const L = computeLayout(candles, { candleW: 10, offset: 0 }, 100 + AXIS_W, 300);
  expect([L.first, L.last, L.width]).toEqual([89, 99, 100]);
  expect(L.maxVol).toBe(99);
  expect(L.ticks.length).toBeGreaterThanOrEqual(2);
  expect(L.ticks.every((p) => p >= L.range.min && p <= L.range.max)).toBe(true);
  expect(L.priceBottom).toBeLessThan(L.volTop); // цены и объём не перекрываются
});

test('xCenter and indexAtX agree; prices and volume map to their areas', () => {
  const L = computeLayout(candles, { candleW: 10, offset: 25 }, 100 + AXIS_W, 300);
  expect(xCenter(97, L)).toBe(100);
  expect(xCenter(99, L)).toBe(120); // правее области: мы на 2,5 свечи в истории
  expect(indexAtX(100, L)).toBe(97);
  expect(indexAtX(1e6, L)).toBe(99);
  expect(indexAtX(-1e6, L)).toBe(0);
  expect(priceY(L.range.max, L)).toBe(L.priceTop);
  expect(L.maxVol).toBe(97); // видны свечи 87…97
  expect(volumeY(97, L)).toBe(L.volTop);
  expect(volumeY(0, L)).toBe(L.volBottom);
});
