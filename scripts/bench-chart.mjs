// Chart frame benchmark runner. Local only, needs adb and a release build with
// EXPO_PUBLIC_DEV_OVERLAY=1 on the phone. Never in CI.
//
//   bun scripts/bench-chart.mjs [variant ...] [--runs 3] [--symbol BTCUSDT]
//   bun scripts/bench-chart.mjs --manual   (hands: the 10 s window starts at the first touch)
//
// Per run: cold start by deep link (?bench=1), wait for "[bench] armed" in logcat, then measure the
// SurfaceFlinger layer of the chart while the bench pans and pinches (src/dev/chartBench.ts).
// Metric: share of present->present intervals >= 13 ms (> 1.5 periods at 120 Hz) and the layer's FPS.
import { spawn, spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Same as BENCH_DELAY_MS and BENCH_RUN_MS in src/dev/chartBench.ts (a plain .mjs script cannot import TS).
const BENCH_DELAY_MS = 3_000;
const BENCH_RUN_MS = 10_000;

const PKG = 'io.github.yevhenjl.rnrealtimemarket';
const SLOW_MS = 13;
// A SurfaceView presents only when the chart changes: a pause between finger moves shows up as one long
// interval. With hands, intervals >= IDLE_MS count as pauses, not as dropped frames (the bench never pauses).
const IDLE_MS = 50;
// The window sits inside the run: an interval that started in the idle phase would count as one long frame.
const WINDOW_FROM_MS = BENCH_DELAY_MS + 200;
const WINDOW_TO_MS = BENCH_DELAY_MS + BENCH_RUN_MS - 200;

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? (args.splice(i, 2)[1] ?? fallback) : fallback;
};
const manual = args.includes('--manual') && args.splice(args.indexOf('--manual'), 1).length > 0;
const runs = Number(opt('--runs', '3'));
const symbol = opt('--symbol', 'BTCUSDT');
const variants = args.length > 0 ? args : ['base'];

const adb = (...a) => {
  const r = spawnSync('adb', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`adb ${a.join(' ')}: ${r.stderr}`);
  return r.stdout;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function waitForLog(marker, timeoutMs) {
  return new Promise((resolve, reject) => {
    const p = spawn('adb', ['logcat', '-v', 'brief', 'ReactNativeJS:V', '*:S']);
    const timer = setTimeout(() => {
      p.kill();
      reject(new Error(`no "${marker}" in logcat within ${timeoutMs} ms`));
    }, timeoutMs);
    p.stdout.on('data', (chunk) => {
      if (chunk.toString().includes(marker)) {
        clearTimeout(timer);
        p.kill();
        resolve();
      }
    });
  });
}

/** Per-layer blocks of `dumpsys SurfaceFlinger --timestats -dump`, with their present2present histogram. */
function parseLayers(dump) {
  return dump
    .split('layerName = ')
    .slice(1)
    .map((block) => {
      const name = block.slice(0, block.indexOf('\n')).trim();
      const frames = Number(/totalFrames = (\d+)/.exec(block)?.[1] ?? 0);
      const line = /present2present histogram is as below:\n([^\n]*)/.exec(block)?.[1] ?? '';
      const hist = new Map();
      for (const m of line.matchAll(/(\d+)ms=(\d+)/g)) hist.set(Number(m[1]), Number(m[2]));
      return { name, frames, hist };
    });
}

function summarize(layer, windowS) {
  let total = 0;
  let slow = 0;
  let idle = 0;
  let idleMs = 0;
  for (const [ms, n] of layer.hist) {
    total += n;
    if (ms >= SLOW_MS) slow += n;
    if (ms >= IDLE_MS) {
      idle += n;
      idleMs += ms * n;
    }
  }
  const moving = total - idle;
  return {
    slowPct: total > 0 ? (100 * slow) / total : NaN,
    // Slow among the intervals while the chart moves (pauses >= IDLE_MS left out)
    movingSlowPct: moving > 0 ? (100 * (slow - idle)) / moving : NaN,
    // FPS over the time the chart was moving (pause time is a lower bound: buckets are bucket floors)
    movingFps: moving / Math.max(0.001, windowS - idleMs / 1000),
    pauses: idle,
    fps: layer.frames / windowS,
    frames: layer.frames,
  };
}

async function runOnce(variant) {
  adb('shell', 'am', 'force-stop', PKG);
  adb('logcat', '-c');
  await sleep(500);
  const armed = waitForLog('[bench] armed', 30_000);
  const url = `rnrealtimemarket://symbol/${symbol}?bench=1&variant=${variant}`;
  adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `'${url}'`, PKG);
  await armed;
  const t0 = Date.now();
  await sleep(WINDOW_FROM_MS - (Date.now() - t0));
  adb('shell', 'dumpsys', 'SurfaceFlinger', '--timestats', '-enable', '-clear');
  const from = Date.now();
  await sleep(WINDOW_TO_MS - (Date.now() - t0));
  const dump = adb('shell', 'dumpsys', 'SurfaceFlinger', '--timestats', '-dump');
  const windowS = (Date.now() - from) / 1000;
  adb('shell', 'dumpsys', 'SurfaceFlinger', '--timestats', '-disable');
  const layer = chartLayer(dump);
  return { layer: layer.name, ...summarize(layer, windowS) };
}

function chartLayer(dump) {
  // The chart's SurfaceView layer; with a TextureView the chart draws into the app window instead.
  const mine = parseLayers(dump).filter((l) => l.name.includes(PKG) || l.name.includes('MainActivity'));
  const surface = mine.filter((l) => l.name.includes('SurfaceView'));
  const layer = (surface.length > 0 ? surface : mine).sort((a, b) => b.frames - a.frames)[0];
  if (!layer) throw new Error('no layer of the app in the timestats dump');
  return layer;
}

/** Intervals between touchscreen reports (SYN_REPORT) while a finger moves; gaps >= IDLE_MS are pauses. */
function touchCadence(raw) {
  const times = [];
  for (const m of raw.matchAll(/\[\s*([\d.]+)\]\s+0000 0000 00000000/g)) times.push(Number(m[1]) * 1000);
  const gaps = times.slice(1).map((t, i) => t - (times[i] ?? t)).filter((g) => g < IDLE_MS);
  if (gaps.length === 0) return 'touch: no reports';
  const share = (lo, hi) => ((100 * gaps.filter((g) => g >= lo && g < hi).length) / gaps.length).toFixed(1);
  const sorted = [...gaps].sort((a, b) => a - b);
  const pct = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))].toFixed(1);
  return `touch: ${gaps.length} reports · p50 ${pct(0.5)} / p90 ${pct(0.9)} ms · < 6 ms ${share(0, 6)} % · 6-10 ms ${share(6, 10)} % · 10-13 ms ${share(10, 13)} % · >= 13 ms ${share(13, IDLE_MS)} %`;
}

/**
 * Present-to-present gaps of 13..IDLE_MS ms split by cause: a touch report arrived inside the gap early enough
 * for the next vsync (the app had new input and still missed a frame) or not (no input: a finger resting, a
 * clamped edge, the end of an inertia, or a miss during inertia, which the bench measures).
 */
function presentTimeline(times, raw) {
  const touches = [...raw.matchAll(/\[\s*([\d.]+)\]\s+0000 0000 00000000/g)].map((m) => Number(m[1]) * 1000);
  let moving = 0;
  let slowInput = 0;
  let slowNoInput = 0;
  for (let i = 1; i < times.length; i++) {
    const a = times[i - 1];
    const b = times[i];
    const gap = b - a;
    if (gap >= IDLE_MS) continue;
    moving++;
    if (gap < SLOW_MS) continue;
    // A report at least one vsync before the late present should have made an earlier frame.
    if (touches.some((t) => t > a && t < b - 8.4)) slowInput++;
    else slowNoInput++;
  }
  const pct = (n) => (moving > 0 ? ((100 * n) / moving).toFixed(1) : 'n/a');
  return `presents: ${times.length} · moving intervals ${moving} · slow with input ${pct(slowInput)} % (${slowInput}) · slow without input ${pct(slowNoInput)} % (${slowNoInput})`;
}

/** Hands on the phone: the symbol screen opens, the window starts at the first touch of the touchscreen. */
async function runManual() {
  const devices = adb('shell', 'getevent', '-pl');
  const touch = /add device \d+: (\S+)\s+name:\s+"sec_touchscreen"/.exec(devices)?.[1] ?? '/dev/input/event4';
  adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `'rnrealtimemarket://symbol/${symbol}'`, PKG);
  console.log('Go: pan and pinch the chart for 10 s from your first touch, zoomed out (~100 candles).');
  adb('shell', 'getevent', '-c', '1', touch);
  adb('shell', 'dumpsys', 'SurfaceFlinger', '--timestats', '-enable', '-clear');
  const from = Date.now();
  // Touch reports in parallel (a pty: getevent line-buffers only on a terminal) and the exact present times of
  // the chart layer (`--latency` keeps the last ~128 frames, so it is polled). Both are CLOCK_MONOTONIC.
  const input = spawn('adb', ['shell', '-t', '-t', 'getevent', '-t', touch]);
  let raw = '';
  input.stdout.on('data', (chunk) => (raw += chunk.toString()));
  const layerName = adb('shell', 'dumpsys', 'SurfaceFlinger', '--list')
    .split('\n')
    .find((l) => l.startsWith('SurfaceView[') && l.includes(PKG) && l.includes('BLAST'))
    ?.trim();
  const presents = new Set();
  while (Date.now() - from < 10_000) {
    if (layerName) {
      for (const line of adb('shell', 'dumpsys', 'SurfaceFlinger', '--latency', `'${layerName}'`).split('\n').slice(1)) {
        const actual = Number(line.trim().split(/\s+/)[1]);
        if (actual > 0 && actual < 9e18) presents.add(actual / 1e6); // ms; INT64_MAX = not presented yet
      }
    }
    await sleep(400);
  }
  input.kill();
  const dump = adb('shell', 'dumpsys', 'SurfaceFlinger', '--timestats', '-dump');
  const windowS = (Date.now() - from) / 1000;
  adb('shell', 'dumpsys', 'SurfaceFlinger', '--timestats', '-disable');
  const out = join(process.env.BENCH_DUMP_DIR ?? tmpdir(), `bench-chart-manual-${Date.now()}.txt`);
  writeFileSync(out, dump);
  const layer = chartLayer(dump);
  const s = summarize(layer, windowS);
  console.log(touchCadence(raw));
  console.log(presentTimeline([...presents].sort((a, b) => a - b), raw));
  console.log(
    `manual: while moving slow ${s.movingSlowPct.toFixed(1)} % · ~${s.movingFps.toFixed(0)} fps · ${s.pauses} pauses >= ${IDLE_MS} ms` +
      ` · raw slow ${s.slowPct.toFixed(1)} % · ${s.frames} frames / ${windowS.toFixed(1)} s · dump ${out}`,
  );
}

async function main() {
  // Samsung lowers an untouched window to 60 Hz; the screen must stay on. Stay-on is left on, so the
  // phone does not lock between runs; undo with `adb shell svc power stayon false`.
  adb('shell', 'settings', 'put', 'system', 'min_refresh_rate', '120.0');
  adb('shell', 'svc', 'power', 'stayon', 'usb');
  adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP');
  if (/isKeyguardShowing=true/.test(adb('shell', 'dumpsys', 'window'))) {
    console.error('The phone is locked: unlock it (the screen now stays on over USB) and run again.');
    process.exit(1);
  }
  try {
    if (manual) return await runManual();
    for (let r = 1; r <= runs; r++) {
      for (const v of variants) {
        const s = await runOnce(v);
        console.log(
          `${v.padEnd(10)} run ${r}: slow ${s.slowPct.toFixed(1)} % · ${s.fps.toFixed(0)} fps · ${s.frames} frames · ${s.layer}`,
        );
      }
    }
  } finally {
    adb('shell', 'settings', 'delete', 'system', 'min_refresh_rate');
  }
}

void main();
