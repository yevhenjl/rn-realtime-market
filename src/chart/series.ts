import type { ChartCandle } from './types';

export type UpsertKind = 'replaced' | 'appended' | 'stale' | 'gap';

function trim(list: ChartCandle[], max: number): ChartCandle[] {
  'worklet';
  return list.length > max ? list.slice(list.length - Math.max(0, max)) : list;
}

/**
 * Applies a kline event to the list (never mutates it).
 * replaced: same `t`; appended: next interval (or first candle); stale: older `t`, same list reference;
 * gap: a hole before `c`, same list reference (the caller refetches history).
 */
export function upsertCandle(
  list: ChartCandle[],
  c: ChartCandle,
  intervalMs: number,
  max = 1000,
): { list: ChartCandle[]; kind: UpsertKind } {
  'worklet';
  if (list.length === 0) return { list: trim([c], max), kind: 'appended' };
  const last = list[list.length - 1];
  if (last === undefined) return { list: trim([c], max), kind: 'appended' };
  if (c.t === last.t) {
    const next = list.slice();
    next[next.length - 1] = c;
    return { list: next, kind: 'replaced' };
  }
  if (c.t < last.t) return { list, kind: 'stale' };
  if (c.t === last.t + intervalMs) return { list: trim([...list, c], max), kind: 'appended' };
  return { list, kind: 'gap' };
}

/** Folds a price tick into the candle of its interval. Returns the same list if nothing changed. */
export function applyTick(
  list: ChartCandle[],
  price: number,
  time: number,
  intervalMs: number,
  max = 1000,
): ChartCandle[] {
  'worklet';
  if (!(intervalMs > 0)) return list;
  const t = Math.floor(time / intervalMs) * intervalMs;
  const fresh: ChartCandle = { t, o: price, h: price, l: price, c: price, v: 0 };
  if (list.length === 0) return trim([fresh], max);
  const last = list[list.length - 1];
  if (last === undefined) return trim([fresh], max);
  if (t < last.t) return list;
  if (t > last.t) return trim([...list, fresh], max);
  if (price === last.c) return list;
  const next = list.slice();
  next[next.length - 1] = {
    ...last,
    h: Math.max(last.h, price),
    l: Math.min(last.l, price),
    c: price,
  };
  return next;
}

/** Merges candles of `intervalMs` into candles of `intervalMs * factor`, aligned to the bigger interval. */
export function aggregate(
  list: readonly ChartCandle[],
  intervalMs: number,
  factor: number,
): ChartCandle[] {
  'worklet';
  const bucketMs = intervalMs * factor;
  if (!(bucketMs > 0)) return list.slice();
  const out: ChartCandle[] = [];
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (c === undefined) continue;
    const t = Math.floor(c.t / bucketMs) * bucketMs;
    const prev = out.length > 0 ? out[out.length - 1] : undefined;
    if (prev !== undefined && prev.t === t) {
      prev.h = Math.max(prev.h, c.h);
      prev.l = Math.min(prev.l, c.l);
      prev.c = c.c;
      prev.v += c.v;
    } else {
      out.push({ t, o: c.o, h: c.h, l: c.l, c: c.c, v: c.v });
    }
  }
  return out;
}
