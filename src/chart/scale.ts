import type { ChartCandle, PriceRange } from './types';

/** Maps a price to y: the higher the price, the smaller y. A flat range maps to the middle. */
export function priceToY(price: number, range: PriceRange, top: number, bottom: number): number {
  'worklet';
  const span = range.max - range.min;
  if (span === 0) return (top + bottom) / 2;
  const f = (price - range.min) / span;
  // Weighted form is exact at both ends (f = 0 -> bottom, f = 1 -> top).
  return bottom * (1 - f) + top * f;
}

/** Inverse of `priceToY`. */
export function yToPrice(y: number, range: PriceRange, top: number, bottom: number): number {
  'worklet';
  const height = bottom - top;
  if (height === 0) return (range.min + range.max) / 2;
  return range.min + ((bottom - y) / height) * (range.max - range.min);
}

export function minMax(values: readonly number[]): PriceRange {
  'worklet';
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < values.length; i++) {
    const v = values[i] ?? 0;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return values.length === 0 ? { min: 0, max: 1 } : { min, max };
}

/** Low/high range of candles `first..last` (inclusive), padded by `padRatio` of the span. */
export function priceRange(
  candles: readonly ChartCandle[],
  first: number,
  last: number,
  padRatio = 0.08,
): PriceRange {
  'worklet';
  const from = Math.max(0, first);
  const to = Math.min(candles.length - 1, last);
  if (from > to) return { min: 0, max: 1 };
  let min = Infinity;
  let max = -Infinity;
  for (let i = from; i <= to; i++) {
    const c = candles[i];
    if (c === undefined) continue;
    if (c.l < min) min = c.l;
    if (c.h > max) max = c.h;
  }
  if (min > max) return { min: 0, max: 1 };
  const span = max - min;
  // Flat chart: widen by 1% of the price (or 1 at zero) so the scale never collapses.
  const pad = span === 0 ? Math.abs(max) * 0.01 || 1 : span * padRatio;
  return { min: min - pad, max: max + pad };
}
