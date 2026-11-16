import { computeLayout, priceY, volumeY, xCenter } from './layout';
import { BODY_HALF, priceAffine, toTransform, volumeAffine, type Affine } from './transform';
import type { ChartCandle } from './types';

const candles: ChartCandle[] = Array.from({ length: 60 }, (_, i) => {
  const o = 100_000 + i * 7;
  const c = o + (i % 2 === 0 ? 5 : -4);
  return { t: i * 60_000, o, h: Math.max(o, c) + 3, l: Math.min(o, c) - 2, c, v: 10 + ((i * 13) % 17) };
});

const apply = (a: Affine, x: number, y: number) => ({ x: a.sx * x + a.tx, y: a.sy * y + a.ty });

describe('priceAffine', () => {
  const cases = [
    { candleW: 8, offset: 0 },
    { candleW: 3, offset: 40 },
    { candleW: 17.5, offset: 123.25 },
  ];
  test.each(cases)('maps (index, price - ref) like xCenter and priceY at %o', (vp) => {
    const L = computeLayout(candles, vp, 64 + 300, 320);
    const ref = candles.at(-1)!.c;
    const a = priceAffine(L, ref);
    for (let i = L.first; i <= L.last; i++) {
      const k = candles[i]!;
      for (const p of [k.o, k.h, k.l, k.c]) {
        const s = apply(a, i, p - ref);
        expect(s.x).toBeCloseTo(xCenter(i, L), 6);
        expect(s.y).toBeCloseTo(priceY(p, L), 6);
      }
    }
  });

  test('the body half-width matches the 0.7 body of the layout within a pixel', () => {
    const L = computeLayout(candles, { candleW: 10, offset: 0 }, 364, 320);
    expect(Math.abs(2 * BODY_HALF * L.candleW - L.bodyW)).toBeLessThan(1);
  });

  test('a flat range maps every price to the middle, like priceToY', () => {
    const L = { ...computeLayout(candles, { candleW: 8, offset: 0 }, 364, 320), range: { min: 5, max: 5 } };
    const a = priceAffine(L, 0);
    expect(apply(a, 0, 123).y).toBe((L.priceTop + L.priceBottom) / 2);
  });
});

describe('volumeAffine', () => {
  test('maps (index, volume) like xCenter and volumeY', () => {
    const L = computeLayout(candles, { candleW: 6, offset: 30 }, 364, 320);
    const a = volumeAffine(L);
    for (let i = L.first; i <= L.last; i++) {
      const v = candles[i]!.v;
      expect(apply(a, i, v).x).toBeCloseTo(xCenter(i, L), 6);
      expect(apply(a, i, v).y).toBeCloseTo(volumeY(v, L), 6);
      expect(apply(a, i, 0).y).toBeCloseTo(L.volBottom, 6);
    }
  });

  test('no volume in view collapses the bars onto the bottom', () => {
    const L = { ...computeLayout(candles, { candleW: 6, offset: 0 }, 364, 320), maxVol: 0 };
    expect(volumeAffine(L)).toMatchObject({ sy: 0, ty: L.volBottom });
  });
});

describe('toTransform', () => {
  test('translate first, then scale: Skia composes them into scale * p + translate', () => {
    expect(toTransform({ sx: 2, tx: 10, sy: -3, ty: 50 })).toEqual([
      { translateX: 10 },
      { translateY: 50 },
      { scaleX: 2 },
      { scaleY: -3 },
    ]);
  });
});
