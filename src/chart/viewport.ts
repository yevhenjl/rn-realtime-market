import type { Viewport } from './types';

export const MIN_CANDLE_W = 3;
export const MAX_CANDLE_W = 32;

/**
 * Index range [first, last] of visible candles. Candle `count - 1` is the newest, at the right edge.
 * Empty input gives [0, -1].
 */
export function visibleRange(
  offset: number,
  candleW: number,
  width: number,
  count: number,
): [number, number] {
  'worklet';
  if (count <= 0 || candleW <= 0 || width <= 0) return [0, -1];
  const newest = count - 1;
  const last = Math.min(newest, Math.max(0, newest - Math.floor(offset / candleW)));
  const first = Math.min(newest, Math.max(0, newest - Math.floor((width + offset) / candleW)));
  return [first, last];
}

/** Largest scroll into history: the first candle sits at the left edge. 0 if everything fits. */
export function maxOffset(count: number, candleW: number, width: number): number {
  'worklet';
  return Math.max(0, count * candleW - width);
}

/** Pans by `dx` px (positive = into history), clamped to [0, maxOffset]. */
export function panBy(
  offset: number,
  dx: number,
  count: number,
  candleW: number,
  width: number,
): number {
  'worklet';
  return Math.min(maxOffset(count, candleW, width), Math.max(0, offset + dx));
}

/** Pinch zoom keeping the candle under `focalX` in place; width clamped to [minW, maxW]. */
export function zoomAt(
  start: Viewport,
  scale: number,
  focalX: number,
  width: number,
  count: number,
  minW?: number,
  maxW?: number,
): Viewport {
  'worklet';
  // Defaults live in the body: the worklets plugin captures only identifiers used in the body, so a
  // `minW = MIN_CANDLE_W` parameter default throws "Property 'MIN_CANDLE_W' doesn't exist" on the UI thread.
  const lo = minW ?? MIN_CANDLE_W;
  const hi = maxW ?? MAX_CANDLE_W;
  const candleW = Math.min(hi, Math.max(lo, start.candleW * scale));
  // Candles between the focal point and the right edge, measured at the old scale.
  const candlesToEdge = (width + start.offset - focalX) / start.candleW;
  const offset = candlesToEdge * candleW - (width - focalX);
  return { candleW, offset: Math.min(maxOffset(count, candleW, width), Math.max(0, offset)) };
}

/** Keeps the view anchored when `appended` candles arrive: follow the live edge, hold in history. */
export function followLiveEdge(offset: number, appended: number, candleW: number): number {
  'worklet';
  // Under 1 px counts as the live edge (inertia tail).
  if (offset < 1) return 0;
  return offset + appended * candleW;
}
