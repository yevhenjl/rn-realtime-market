import { priceY, volumeY, xCenter, type ChartLayout } from './layout';
import type { ChartCandle } from './types';

export type Box = { x: number; y: number; w: number; h: number };

/** A candle is "up" when it closed at or above its open. */
export function isUp(c: ChartCandle): boolean {
  'worklet';
  return c.c >= c.o;
}

/** Wick: a 1 px wide rect from high to low (a zero-area line would not be filled by Skia). */
export function wickBox(c: ChartCandle, i: number, L: ChartLayout): Box {
  'worklet';
  const top = priceY(c.h, L);
  return { x: xCenter(i, L) - 0.5, y: top, w: 1, h: priceY(c.l, L) - top };
}

/** Body: open..close, at least 1 px tall so a doji stays visible. */
export function bodyBox(c: ChartCandle, i: number, L: ChartLayout): Box {
  'worklet';
  const yo = priceY(c.o, L);
  const yc = priceY(c.c, L);
  return { x: xCenter(i, L) - L.bodyW / 2, y: Math.min(yo, yc), w: L.bodyW, h: Math.max(1, Math.abs(yc - yo)) };
}

/** Volume bar growing up from `volBottom`. */
export function volumeBox(c: ChartCandle, i: number, L: ChartLayout): Box {
  'worklet';
  const y = volumeY(c.v, L);
  return { x: xCenter(i, L) - L.bodyW / 2, y, w: L.bodyW, h: L.volBottom - y };
}
