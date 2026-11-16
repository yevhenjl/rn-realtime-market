// Observability without an SDK: counters and the "exchange -> app" latency. Pure TS: no React or RN imports.
// The dev overlay reads it once a second.
export const metrics = {
  messages: 0, // messages with data
  invalid: 0, // failed Zod validation
  reconnects: 0, // transitions into reconnecting
  gaps: 0, // holes in candles or the order book -> resync
  clockOffsetMs: 0, // serverTime - phone clock
  latency: [] as number[], // last 200 values, ms
  handlerMs: [] as number[], // JSON + Zod + conflator write per message, last 200 values, ms
  flushes: 0, // conflator flushes into the quotes store
};

const MAX_SAMPLES = 200;

type Counter = 'messages' | 'invalid' | 'reconnects' | 'gaps' | 'flushes';

/**
 * Bump a counter. Callers must use this, never `metrics.x++`: React Compiler 1.0 miscompiles an update
 * expression on a member of an imported object inside hooks into `metrics.x = <module>.x + 1` -> NaN
 * Jest does not run the compiler, so only this function and the ESLint rule guard it.
 */
export function increment(counter: Counter): void {
  metrics[counter] += 1;
}

export function recordLatency(eventTime: number, receivedAt = Date.now()): void {
  metrics.latency.push(receivedAt + metrics.clockOffsetMs - eventTime);
  if (metrics.latency.length > MAX_SAMPLES) metrics.latency.shift();
}

export function recordHandlerMs(ms: number): void {
  metrics.handlerMs.push(ms);
  if (metrics.handlerMs.length > MAX_SAMPLES) metrics.handlerMs.shift();
}

// As in NTP: assume the server answered in the middle of the request.
export function estimateClockOffset(sentAt: number, serverTime: number, receivedAt: number): number {
  return serverTime - (sentAt + receivedAt) / 2;
}

export type ClockSample = { sentAt: number; serverTime: number; receivedAt: number };

// NTP practice: the sample with the shortest round trip has the smallest midpoint error (±RTT/2).
export function bestClockOffset(samples: readonly ClockSample[]): number | null {
  let best: ClockSample | null = null;
  for (const s of samples) {
    if (best === null || s.receivedAt - s.sentAt < best.receivedAt - best.sentAt) best = s;
  }
  return best === null ? null : estimateClockOffset(best.sentAt, best.serverTime, best.receivedAt);
}

// p-th percentile, nearest-rank: p95 of 200 values is the 190th in ascending order.
export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length, Math.max(1, rank)) - 1]!;
}
