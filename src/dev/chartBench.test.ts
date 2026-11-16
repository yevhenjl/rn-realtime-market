import { maxOffset, MIN_CANDLE_W } from '@/chart/viewport';

import { BENCH_DELAY_MS, BENCH_RUN_MS, benchViewport, parseBench } from './chartBench';

describe('parseBench', () => {
  const originalDev = (globalThis as { __DEV__?: boolean }).__DEV__;
  const originalFlag = process.env.EXPO_PUBLIC_DEV_OVERLAY;
  function setFlags(dev: boolean, envFlag: string | undefined) {
    (globalThis as { __DEV__?: boolean }).__DEV__ = dev;
    if (envFlag === undefined) delete process.env.EXPO_PUBLIC_DEV_OVERLAY;
    else process.env.EXPO_PUBLIC_DEV_OVERLAY = envFlag;
  }
  afterEach(() => setFlags(originalDev ?? true, originalFlag));

  test('without the dev gate the bench never runs', () => {
    expect(parseBench('1', false)).toBe(false);
  });

  test('the default gate: production (no __DEV__, no overlay flag) ignores bench=1; preview (flag) runs it', () => {
    setFlags(false, undefined);
    expect(parseBench('1')).toBe(false);
    setFlags(false, '1');
    expect(parseBench('1')).toBe(true);
    setFlags(true, undefined);
    expect(parseBench('1')).toBe(true);
  });

  test('with the gate only bench=1 runs it', () => {
    expect(parseBench('1', true)).toBe(true);
    expect(parseBench(undefined, true)).toBe(false);
    expect(parseBench('yes', true)).toBe(false);
    expect(parseBench(['1'], true)).toBe(false);
  });
});

describe('benchViewport', () => {
  const count = 500;
  const width = 800;

  test('idle before the delay and after the run', () => {
    expect(benchViewport(0, count, width)).toBeNull();
    expect(benchViewport(BENCH_DELAY_MS - 1, count, width)).toBeNull();
    expect(benchViewport(BENCH_DELAY_MS + BENCH_RUN_MS, count, width)).toBeNull();
  });

  test('stays at maximum zoom-out outside the pinch and within the clamp everywhere', () => {
    for (let t = BENCH_DELAY_MS; t < BENCH_DELAY_MS + BENCH_RUN_MS; t += 7) {
      const vp = benchViewport(t, count, width);
      expect(vp).not.toBeNull();
      if (!vp) continue;
      expect(vp.candleW).toBeGreaterThanOrEqual(MIN_CANDLE_W);
      expect(vp.candleW).toBeLessThanOrEqual(6);
      expect(vp.offset).toBeGreaterThanOrEqual(0);
      expect(vp.offset).toBeLessThanOrEqual(maxOffset(count, vp.candleW, width) + 1e-9);
    }
    expect(benchViewport(BENCH_DELAY_MS + 1_000, count, width)?.candleW).toBe(MIN_CANDLE_W);
    expect(benchViewport(BENCH_DELAY_MS + 300, count, width)?.candleW).toBeCloseTo(6);
  });

  test('pans continuously: the offset moves every frame outside the pinch', () => {
    const a = benchViewport(BENCH_DELAY_MS + 1_000, count, width);
    const b = benchViewport(BENCH_DELAY_MS + 1_008, count, width);
    expect(a && b && Math.abs(b.offset - a.offset)).toBeGreaterThan(5); // ~12 px per 8 ms at 1500 px/s
  });

  test('everything fits: no pan', () => {
    expect(benchViewport(BENCH_DELAY_MS + 1_000, 10, width)).toEqual({ candleW: MIN_CANDLE_W, offset: 0 });
  });
});
