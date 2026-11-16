import type { ChartLayout } from './layout';

/** Screen = scale * data + translate, per axis. */
export type Affine = { sx: number; tx: number; sy: number; ty: number };

/** Half of the body width in candle units (the body is 0.7 of a candle, as in `computeLayout`). */
export const BODY_HALF = 0.35;

/**
 * Data space of the candle paths: x = candle index (the candle is centered on it), y = price - `ref`.
 * `ref` (a price near the data, e.g. the last close) keeps the coordinates small: Skia stores paths in
 * float32, and a price of 100 000 with a visible range of a few dollars would lose sub-pixel precision.
 * The result maps that space onto the screen exactly like `xCenter` and `priceY` do.
 */
export function priceAffine(L: ChartLayout, ref: number): Affine {
  'worklet';
  const span = L.range.max - L.range.min;
  const sx = L.candleW;
  const tx = L.width + L.offset - L.count * L.candleW + L.candleW / 2;
  if (span === 0) return { sx, tx, sy: 0, ty: (L.priceTop + L.priceBottom) / 2 };
  const sy = -(L.priceBottom - L.priceTop) / span;
  return { sx, tx, sy, ty: L.priceBottom + (L.range.min - ref) * -sy };
}

/** Data space of the volume paths: x = candle index, y = volume. Maps like `xCenter` and `volumeY`. */
export function volumeAffine(L: ChartLayout): Affine {
  'worklet';
  const sx = L.candleW;
  const tx = L.width + L.offset - L.count * L.candleW + L.candleW / 2;
  if (!(L.maxVol > 0)) return { sx, tx, sy: 0, ty: L.volBottom };
  return { sx, tx, sy: -(L.volBottom - L.volTop) / L.maxVol, ty: L.volBottom };
}

/** Skia `transform` of a Group: translate, then scale, so a point maps to scale * p + translate. */
export function toTransform(a: Affine) {
  'worklet';
  return [{ translateX: a.tx }, { translateY: a.ty }, { scaleX: a.sx }, { scaleY: a.sy }];
}
