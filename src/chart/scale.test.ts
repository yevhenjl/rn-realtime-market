import { minMax, priceRange, priceToY, yToPrice } from './scale';
import type { ChartCandle } from './types';

const c = (t: number, o: number, h: number, l: number, cl: number): ChartCandle => ({ t, o, h, l, c: cl, v: 1 });

test('priceToY: a higher price is higher on screen; yToPrice is the inverse', () => {
  const r = { min: 100, max: 200 };
  expect(priceToY(200, r, 0, 100)).toBe(0);
  expect(priceToY(100, r, 0, 100)).toBe(100);
  expect(priceToY(150, r, 10, 110)).toBe(60);
  expect(yToPrice(60, r, 10, 110)).toBe(150);
  expect(priceToY(5, { min: 5, max: 5 }, 0, 100)).toBe(50); // плоский ряд — середина
});

test('priceRange: only visible candles, padding, flat chart, no candles', () => {
  const list = [c(0, 10, 50, 5, 20), c(1, 20, 30, 18, 25), c(2, 25, 40, 22, 30)];
  expect(priceRange(list, 1, 2, 0)).toEqual({ min: 18, max: 40 }); // свеча 0 (high 50) не видна
  expect(priceRange(list, 1, 2, 0.5)).toEqual({ min: 7, max: 51 }); // отступ: 22 × 0.5 = 11
  expect(priceRange([c(0, 100, 100, 100, 100)], 0, 0)).toEqual({ min: 99, max: 101 });
  expect(priceRange([], 0, -1)).toEqual({ min: 0, max: 1 });
});

test('minMax for a sparkline', () => {
  expect(minMax([3, 1, 2])).toEqual({ min: 1, max: 3 });
  expect(minMax([])).toEqual({ min: 0, max: 1 });
});
