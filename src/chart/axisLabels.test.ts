import { AXIS_W, computeLayout } from './layout';
import { formatFixed, niceStep, niceTicks, stepDecimals } from './ticks';
import type { ChartCandle } from './types';

// Price scale labels are round and free of float noise ("84710.60000000001").

function series(base: number, spread: number, n = 120): ChartCandle[] {
  return Array.from({ length: n }, (_, i) => {
    const o = base + Math.sin(i / 5) * spread;
    const c = base + Math.sin((i + 1) / 5) * spread;
    return { t: i * 60_000, o, h: Math.max(o, c) + spread * 0.1, l: Math.min(o, c) - spread * 0.1, c, v: 1 + (i % 7) };
  });
}

const cases: [string, number, number][] = [
  ['BTC', 84710.6, 150.35],
  ['BTC wide', 84710.6, 4000.1],
  ['ETH', 3141.59, 12.345],
  ['mid altcoin', 2.4567, 0.0321],
  ['cheap altcoin', 0.08354, 0.0007],
  ['micro price', 0.00001234, 0.0000003],
];
const sizes: [number, number][] = [
  [200, 200],
  [100, 300],
  [300, 400],
  [500, 800],
];

describe.each(cases)('%s around %d', (_name, base, spread) => {
  test.each(sizes)('ticks for canvas %d x %d are clean, in range and ascending', (w, h) => {
    const L = computeLayout(series(base, spread), { candleW: 8, offset: 0 }, w + AXIS_W, h);
    expect(L.ticks.length).toBeGreaterThanOrEqual(1);
    const d = stepDecimals(L.tickStep);
    for (const t of L.ticks) {
      const label = formatFixed(t, d);
      expect(label).toMatch(/^\d{1,3}(,\d{3})*(\.\d+)?$/);
      expect(label.split('.')[1]?.length ?? 0).toBe(d);
      expect(Number(label.replaceAll(',', ''))).toBeCloseTo(t, 12);
      expect(t).toBeGreaterThanOrEqual(L.range.min);
      expect(t).toBeLessThanOrEqual(L.range.max);
    }
    expect(L.ticks).toEqual([...L.ticks].sort((a, b) => a - b));
  });
});

test('BTC example: typical labels', () => {
  const ticks = niceTicks(84612.3, 84811.9, 5);
  const d = stepDecimals(50);
  expect(ticks.map((t) => formatFixed(t, d))).toEqual(['84,650', '84,700', '84,750', '84,800']);
  expect(formatFixed(84710.6, 2)).toBe('84,710.60');
});

test('small altcoin prices: no float noise in labels', () => {
  const ticks = niceTicks(0.00001231, 0.00001239, 4);
  expect(ticks.map((t) => formatFixed(t, 8))).toEqual(['0.00001232', '0.00001234', '0.00001236', '0.00001238']);
  const fine = niceTicks(0.0000123, 0.0000124, 5);
  expect(fine.map((t) => formatFixed(t, stepDecimals(niceStep(0.0000001, 5))))).toEqual([
    '0.00001230',
    '0.00001232',
    '0.00001234',
    '0.00001236',
    '0.00001238',
    '0.00001240',
  ]);
});

test('classic float traps: 0.1 + 0.2 style steps stay clean', () => {
  expect(niceTicks(0.1, 0.5, 4)).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
  expect(niceTicks(84710.5, 84710.9, 4)).toEqual([84710.5, 84710.6, 84710.7, 84710.8, 84710.9]);
});

test('layout: volume strip never overlaps the price area, across sizes', () => {
  for (const [w, h] of sizes) {
    const L = computeLayout(series(84710.6, 150), { candleW: 8, offset: 0 }, w + AXIS_W, h);
    expect(L.priceTop).toBeLessThan(L.priceBottom);
    expect(L.priceBottom).toBeLessThan(L.volTop);
    expect(L.volTop).toBeLessThan(L.volBottom);
  }
});
