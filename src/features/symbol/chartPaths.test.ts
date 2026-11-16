import type { SkPathBuilder } from 'react-native-skia';

import { bodyBox, volumeBox, wickBox } from '@/chart/candles';
import { computeLayout, xCenter } from '@/chart/layout';
import { priceAffine, volumeAffine, type Affine } from '@/chart/transform';
import type { ChartCandle } from '@/chart/types';

import { appendBodiesData, appendVolumeData, appendWicksData } from './chartPaths';

// Skia does not load in Jest: `rect` becomes a plain object, the builder records addRect calls.
jest.mock('react-native-skia', () => ({
  rect: (x: number, y: number, width: number, height: number) => ({ x, y, width, height }),
}));

type Rect = { x: number; y: number; width: number; height: number };

function recorder() {
  const rects: Rect[] = [];
  const b = { addRect: (r: Rect) => rects.push(r) } as unknown as SkPathBuilder;
  return { b, rects };
}

type Seg = { from: [number, number]; to: [number, number] };
function lineRecorder() {
  const segs: Seg[] = [];
  let at: [number, number] = [0, 0];
  const b = {
    moveTo: (x: number, y: number) => (at = [x, y]),
    lineTo: (x: number, y: number) => segs.push({ from: at, to: [x, y] }),
  } as unknown as SkPathBuilder;
  return { b, segs };
}

const asRect = ({ x, y, w, h }: { x: number; y: number; w: number; h: number }): Rect => ({ x, y, width: w, height: h });

// Alternating up / down / doji (c === o counts as up) candles, 40 of them.
const candles: ChartCandle[] = Array.from({ length: 40 }, (_, i) => {
  const o = 100 + i;
  const c = i % 3 === 0 ? o + 2 : i % 3 === 1 ? o - 2 : o;
  return { t: i * 60_000, o, h: Math.max(o, c) + 1, l: Math.min(o, c) - 1, c, v: 10 + i };
});

// Narrow canvas with history scrolled: only part of the series is visible (first > 0, last < 39).
const L = computeLayout(candles, { candleW: 10, offset: 55 }, 64 + 200, 300);

describe('chartPaths', () => {
  test('the layout under test shows a window in the middle of the series', () => {
    expect(L.first).toBeGreaterThan(0);
    expect(L.last).toBeLessThan(candles.length - 1);
  });

  test('up and down split the whole series without overlap', () => {
    const up = recorder();
    const down = recorder();
    appendVolumeData(up.b, candles, true);
    appendVolumeData(down.b, candles, false);
    expect(up.rects.length + down.rects.length).toBe(candles.length);
    const xs = new Set(up.rects.map((r) => r.x));
    expect(down.rects.some((r) => xs.has(r.x))).toBe(false);
  });

  test('an empty series adds nothing', () => {
    const { b, rects } = recorder();
    const lines = lineRecorder();
    appendBodiesData(b, [], true, 0);
    appendVolumeData(b, [], false);
    appendWicksData(lines.b, [], true, 0);
    expect(rects).toEqual([]);
    expect(lines.segs).toEqual([]);
  });
});

// Data space: the paths hold (index, price - ref) and a Group transform maps them to the screen.
// Mapped through the transform, they must land where the screen-space boxes are.
describe('chartPaths in data space', () => {
  const ref = candles.at(-1)!.c;
  const toScreen = (a: Affine, r: Rect) => {
    const x1 = a.sx * r.x + a.tx;
    const x2 = a.sx * (r.x + r.width) + a.tx;
    const y1 = a.sy * r.y + a.ty;
    const y2 = a.sy * (r.y + r.height) + a.ty;
    return { x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) };
  };
  const side = (up: boolean) => candles.map((c, i) => ({ c, i })).filter(({ c }) => c.c >= c.o === up);

  test.each([true, false])('appendBodiesData(up=%s): every candle of that side lands on its bodyBox', (up) => {
    const { b, rects } = recorder();
    appendBodiesData(b, candles, up, ref);
    const a = priceAffine(L, ref);
    expect(rects).toHaveLength(side(up).length);
    side(up).forEach(({ c, i }, n) => {
      const got = toScreen(a, rects[n]!);
      const want = asRect(bodyBox(c, i, L));
      expect(got.x + got.width / 2).toBeCloseTo(want.x + want.width / 2, 6);
      expect(Math.abs(got.width - want.width)).toBeLessThan(1); // body width is floored on screen only
      expect(got.y).toBeCloseTo(want.y, 6);
      if (c.c !== c.o) expect(got.height).toBeCloseTo(want.height, 6); // a doji: 0 here, 1 px on screen
    });
  });

  test.each([true, false])('appendWicksData(up=%s): high-to-low wick and a close tick per candle', (up) => {
    const { b, segs } = lineRecorder();
    appendWicksData(b, candles, up, ref);
    const a = priceAffine(L, ref);
    const map = ([x, y]: [number, number]) => [a.sx * x + a.tx, a.sy * y + a.ty];
    expect(segs).toHaveLength(2 * side(up).length);
    side(up).forEach(({ c, i }, n) => {
      const wick = segs[2 * n]!;
      const w = wickBox(c, i, L);
      const [wx, wTop] = map(wick.from);
      const [, wBottom] = map(wick.to);
      expect(wx).toBeCloseTo(xCenter(i, L), 6);
      expect(wTop).toBeCloseTo(w.y, 6);
      expect(wBottom).toBeCloseTo(w.y + w.h, 6);
      const tick = segs[2 * n + 1]!;
      expect(map(tick.from)[1]).toBeCloseTo(map(tick.to)[1]!, 6);
      expect(map(tick.from)[1]).toBeCloseTo(a.sy * (c.c - ref) + a.ty, 6);
    });
  });

  test.each([true, false])('appendVolumeData(up=%s): bars land on their volumeBox', (up) => {
    const { b, rects } = recorder();
    appendVolumeData(b, candles, up);
    const a = volumeAffine(L);
    side(up).forEach(({ c, i }, n) => {
      const got = toScreen(a, rects[n]!);
      const want = asRect(volumeBox(c, i, L));
      expect(got.y).toBeCloseTo(want.y, 6);
      expect(got.height).toBeCloseTo(want.height, 6);
      expect(got.x + got.width / 2).toBeCloseTo(want.x + want.width / 2, 6);
    });
  });
});
