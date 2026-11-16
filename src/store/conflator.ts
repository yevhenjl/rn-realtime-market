type Item = { symbol: string; eventTime: number };

// Copies defined fields of `from` over `into`, ignoring explicit undefined.
function assignDefined<T extends Item>(into: T, from: T): void {
  for (const key of Object.keys(from) as (keyof T)[]) {
    if (from[key] !== undefined) into[key] = from[key];
  }
}

// Fields merge per symbol; on conflict the newer eventTime wins (the later push on a tie).
// A late (older) event only fills fields the pending entry lacks.
function mergeItems<T extends Item>(pending: T, incoming: T): T {
  const [older, newer] = incoming.eventTime >= pending.eventTime ? [pending, incoming] : [incoming, pending];
  const merged = { ...older };
  assignDefined(merged, newer);
  return merged;
}

/**
 * Collects ticks and hands them over as one batch per interval.
 * The timer is lazy: it starts on the first push into an empty batch.
 * intervalMs <= 0 means "no batching": every push flushes synchronously (for measurements).
 */
export function createConflator<T extends Item>(
  onFlush: (batch: Map<string, T>) => void,
  intervalMs = 200,
): { push(item: T): void; flush(): void; dispose(): void } {
  let pending = new Map<string, T>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  function flush(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (disposed || pending.size === 0) return;
    const batch = pending;
    pending = new Map(); // a new Map per flush: consumers may keep the old one
    onFlush(batch);
  }

  function push(item: T): void {
    if (disposed) return;
    const current = pending.get(item.symbol);
    pending.set(item.symbol, current ? mergeItems(current, item) : { ...item });
    if (intervalMs <= 0) flush();
    else if (timer === null) timer = setTimeout(flush, intervalMs);
  }

  function dispose(): void {
    disposed = true;
    if (timer !== null) clearTimeout(timer);
    timer = null;
    pending = new Map();
  }

  return { push, flush, dispose };
}
