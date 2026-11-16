import { bodyBox, isUp, volumeBox, wickBox } from './candles';
import { AXIS_W, computeLayout, priceY, xCenter } from './layout';
import type { ChartCandle } from './types';

const candles: ChartCandle[] = Array.from({ length: 50 }, (_, i) => ({
  t: i * 60_000,
  o: 100 + i,
  h: 120 + i,
  l: 90 + i,
  c: i % 2 ? 105 + i : 95 + i,
  v: 10 + i,
}));
const L = computeLayout(candles, { candleW: 10, offset: 0 }, 100 + AXIS_W, 300);

test('isUp: close >= open is up (a doji counts as up)', () => {
  expect(isUp({ t: 0, o: 1, h: 2, l: 0, c: 1.5, v: 0 })).toBe(true);
  expect(isUp({ t: 0, o: 1, h: 2, l: 0, c: 1, v: 0 })).toBe(true);
  expect(isUp({ t: 0, o: 1, h: 2, l: 0, c: 0.5, v: 0 })).toBe(false);
});

test('wickBox: 1 px wide, centered, from high to low', () => {
  const i = L.last;
  const c = candles[i]!;
  const w = wickBox(c, i, L);
  expect(w.w).toBe(1);
  expect(w.x).toBe(xCenter(i, L) - 0.5);
  expect(w.y).toBe(priceY(c.h, L));
  expect(w.y + w.h).toBeCloseTo(priceY(c.l, L), 9);
  expect(w.h).toBeGreaterThan(0);
});

test('bodyBox: spans open..close for rising and falling candles, bodyW wide', () => {
  for (const i of [L.last - 1, L.last]) {
    const c = candles[i]!;
    const k = bodyBox(c, i, L);
    expect(k.w).toBe(L.bodyW);
    expect(k.x).toBe(xCenter(i, L) - L.bodyW / 2);
    expect(k.y).toBe(Math.min(priceY(c.o, L), priceY(c.c, L)));
    expect(k.h).toBeCloseTo(Math.abs(priceY(c.c, L) - priceY(c.o, L)), 9);
    expect(k.h).toBeGreaterThanOrEqual(1);
  }
});

test('bodyBox: a doji keeps a minimum height of 1 px', () => {
  const doji: ChartCandle = { ...candles[L.last]!, o: 110, c: 110 };
  expect(bodyBox(doji, L.last, L).h).toBe(1);
});

test('volumeBox: bar from volumeY to volBottom; the max volume reaches volTop', () => {
  const i = L.last;
  const v = volumeBox(candles[i]!, i, L);
  expect(v.w).toBe(L.bodyW);
  expect(v.x).toBe(xCenter(i, L) - L.bodyW / 2);
  expect(v.y + v.h).toBe(L.volBottom);
  expect(v.y).toBeGreaterThanOrEqual(L.volTop);
  const top = volumeBox({ ...candles[i]!, v: L.maxVol }, i, L);
  expect(top.y).toBe(L.volTop);
  expect(volumeBox({ ...candles[i]!, v: 0 }, i, L).h).toBe(0);
});

test('all candle and volume geometry stays inside its area (volume never overlaps prices)', () => {
  for (let i = L.first; i <= L.last; i++) {
    const c = candles[i]!;
    const w = wickBox(c, i, L);
    const k = bodyBox(c, i, L);
    const v = volumeBox(c, i, L);
    expect(w.y).toBeGreaterThanOrEqual(L.priceTop - 1e-9);
    expect(w.y + w.h).toBeLessThanOrEqual(L.priceBottom + 1e-9);
    expect(k.y + k.h).toBeLessThanOrEqual(L.priceBottom + 1);
    expect(v.y).toBeGreaterThanOrEqual(L.volTop);
    expect(w.y + w.h).toBeLessThan(v.y === L.volBottom ? L.volBottom : v.y);
  }
});

test('flat volume (maxVol = 0) gives zero-height bars at volBottom', () => {
  const flat = candles.map((c) => ({ ...c, v: 0 }));
  const F = computeLayout(flat, { candleW: 10, offset: 0 }, 100 + AXIS_W, 300);
  const v = volumeBox(flat[F.last]!, F.last, F);
  expect([v.y, v.h]).toEqual([F.volBottom, 0]);
});
