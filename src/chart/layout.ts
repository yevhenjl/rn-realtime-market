import { priceRange, priceToY } from './scale';
import { niceStep, niceTicks } from './ticks';
import type { ChartCandle, PriceRange, Viewport } from './types';
import { visibleRange } from './viewport';

export const AXIS_W = 64;
export const TIME_H = 18;

const PRICE_PAD = 8;
const VOLUME_RATIO = 0.18;
const MIN_TICK_GAP = 48;

export type ChartLayout = {
  count: number;
  first: number;
  last: number;
  /** Width of the candle area (canvas width minus the price axis). */
  width: number;
  candleW: number;
  bodyW: number;
  offset: number;
  range: PriceRange;
  priceTop: number;
  priceBottom: number;
  volTop: number;
  volBottom: number;
  maxVol: number;
  ticks: number[];
  tickStep: number;
};

/** Geometry of the whole chart for the visible window; the volume strip is the bottom 18% above the time axis. */
export function computeLayout(
  candles: readonly ChartCandle[],
  vp: Viewport,
  width: number,
  height: number,
): ChartLayout {
  'worklet';
  const areaW = Math.max(0, width - AXIS_W);
  const count = candles.length;
  const [first, last] = visibleRange(vp.offset, vp.candleW, areaW, count);
  const range = priceRange(candles, first, last);

  const plotH = Math.max(0, height - TIME_H);
  const volBottom = plotH;
  const volTop = plotH - plotH * VOLUME_RATIO;
  const priceTop = PRICE_PAD;
  const priceBottom = volTop - PRICE_PAD;

  let maxVol = 0;
  for (let i = first; i <= last; i++) {
    const v = candles[i]?.v ?? 0;
    if (v > maxVol) maxVol = v;
  }

  const maxTicks = Math.max(1, Math.floor((priceBottom - priceTop) / MIN_TICK_GAP));
  return {
    count,
    first,
    last,
    width: areaW,
    candleW: vp.candleW,
    bodyW: Math.max(1, Math.floor(vp.candleW * 0.7)),
    offset: vp.offset,
    range,
    priceTop,
    priceBottom,
    volTop,
    volBottom,
    maxVol,
    ticks: niceTicks(range.min, range.max, maxTicks),
    tickStep: niceStep(range.max - range.min, maxTicks),
  };
}

/** Center x of candle `i`. */
export function xCenter(i: number, L: ChartLayout): number {
  'worklet';
  return L.width + L.offset - (L.count - 1 - i) * L.candleW - L.candleW / 2;
}

/** Index of the candle nearest to `x`, clamped to [0, count - 1]. */
export function indexAtX(x: number, L: ChartLayout): number {
  'worklet';
  const newest = Math.max(0, L.count - 1);
  if (!(L.candleW > 0)) return newest;
  const back = Math.round((L.width + L.offset - L.candleW / 2 - x) / L.candleW);
  return Math.min(newest, Math.max(0, newest - back));
}

export function priceY(price: number, L: ChartLayout): number {
  'worklet';
  return priceToY(price, L.range, L.priceTop, L.priceBottom);
}

/** `maxVol` maps to `volTop`, 0 to `volBottom`. */
export function volumeY(v: number, L: ChartLayout): number {
  'worklet';
  if (!(L.maxVol > 0)) return L.volBottom;
  const f = v / L.maxVol;
  return L.volBottom * (1 - f) + L.volTop * f;
}
