import { rect, type SkPathBuilder } from 'react-native-skia';

import { isUp } from '@/chart/candles';
import { BODY_HALF } from '@/chart/transform';
import type { ChartCandle } from '@/chart/types';

// Thin Skia wrappers. Data space: x = candle index, y = price - ref (or volume). Built once per
// data change; a Group transform (src/chart/transform.ts) maps it onto the screen, so pan and pinch rebuild no
// geometry. Mapped through that transform, the paths land on the boxes of src/chart/candles.ts (tested).
// All rising (or all falling) candles go into ONE path: 2 Skia nodes instead of 2 x N.

/** Bodies of all rising (or falling) candles; a doji has no area here, its close tick in the wicks shows it. */
export function appendBodiesData(b: SkPathBuilder, list: readonly ChartCandle[], up: boolean, ref: number): void {
  'worklet';
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (!c || isUp(c) !== up) continue;
    b.addRect(rect(i - BODY_HALF, Math.min(c.o, c.c) - ref, 2 * BODY_HALF, Math.abs(c.c - c.o)));
  }
}

/**
 * Wicks as lines (drawn as a hairline stroke: 1 px at any zoom) plus a tick across the body at the close,
 * so a doji (open === close) stays visible like the 1 px minimum body of `bodyBox`.
 */
export function appendWicksData(b: SkPathBuilder, list: readonly ChartCandle[], up: boolean, ref: number): void {
  'worklet';
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (!c || isUp(c) !== up) continue;
    b.moveTo(i, c.h - ref);
    b.lineTo(i, c.l - ref);
    b.moveTo(i - BODY_HALF, c.c - ref);
    b.lineTo(i + BODY_HALF, c.c - ref);
  }
}

/** Volume bars of rising (or falling) candles: x = candle index, y = volume. */
export function appendVolumeData(b: SkPathBuilder, list: readonly ChartCandle[], up: boolean): void {
  'worklet';
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (!c || isUp(c) !== up) continue;
    b.addRect(rect(i - BODY_HALF, 0, 2 * BODY_HALF, c.v));
  }
}
