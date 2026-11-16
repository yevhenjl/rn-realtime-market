import type { Viewport } from '@/chart/types';
import { maxOffset, MIN_CANDLE_W } from '@/chart/viewport';

import { isDevToolsEnabled } from './gate';

// Dev-only chart benchmark: a frame callback drives pan and pinch on the UI thread, so frame
// stats are reproducible without hands and without `adb input` (a new JVM per swipe, sparse events).
// Opened by a deep link: rnrealtimemarket://symbol/BTCUSDT?bench=1 (runner: scripts/bench-chart.mjs).

/** After the data is ready: time for the measuring script to reset the frame counters. */
export const BENCH_DELAY_MS = 3_000;
/** The measured window. */
export const BENCH_RUN_MS = 10_000;
const PAN_PX_PER_S = 1_500;
const PINCH_PERIOD_MS = 2_000;
const PINCH_MS = 600;
const PINCH_MAX_W = 6;

/** Route param -> whether to run the bench. Only `bench=1`, and only behind the dev gate (./gate). */
export function parseBench(bench: unknown, available?: boolean): boolean {
  return (available ?? isDevToolsEnabled()) && bench === '1';
}

/**
 * Viewport `t` ms after the bench clock started, or null outside the run (before the delay ends, after the run).
 * Maximum zoom-out (3 px candles) with a triangle-wave pan across the whole history; every 2 s a 0.6 s
 * pinch to 6 px and back.
 */
export function benchViewport(t: number, count: number, width: number): Viewport | null {
  'worklet';
  const run = t - BENCH_DELAY_MS;
  if (run < 0 || run >= BENCH_RUN_MS) return null;
  const phase = run % PINCH_PERIOD_MS;
  const candleW =
    phase < PINCH_MS ? MIN_CANDLE_W + (PINCH_MAX_W - MIN_CANDLE_W) * Math.sin((Math.PI * phase) / PINCH_MS) : MIN_CANDLE_W;
  const span = maxOffset(count, candleW, width);
  if (span <= 0) return { candleW, offset: 0 };
  const travelled = ((PAN_PX_PER_S * run) / 1_000) % (2 * span);
  return { candleW, offset: span - Math.abs(span - travelled) };
}
