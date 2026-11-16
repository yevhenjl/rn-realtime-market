import { create } from 'zustand';

import type { Ticker, TickerPatch } from './types';

export type QuotesState = {
  bySymbol: Readonly<Record<string, Ticker>>;
  /** REST snapshot: full tickers; older ones never overwrite newer ticks. */
  applySnapshot: (list: readonly Ticker[]) => void;
  /** Conflated stream batch: tickers or partial patches. */
  applyBatch: (batch: ReadonlyMap<string, TickerPatch>) => void;
};

const VALUE_KEYS = ['last', 'open', 'high', 'low', 'quoteVolume'] as const;

function isComplete(p: TickerPatch): p is Ticker {
  return VALUE_KEYS.every((k) => p[k] !== undefined);
}

// Returns the same object when the patch changes nothing, otherwise a new Ticker.
// null = the patch cannot be applied (partial patch without an existing entry).
function mergeTicker(current: Ticker | undefined, patch: TickerPatch): Ticker | null {
  if (!current) return isComplete(patch) ? { ...patch } : null;
  if (patch.eventTime < current.eventTime) return current; // older event: skip
  // Equal eventTime is applied: miniTicker and trade may share E and carry different fields.
  // A newer eventTime is a change on its own, so late events cannot overwrite newer data later.
  let changed = patch.eventTime !== current.eventTime;
  const next: Ticker = { ...current, eventTime: patch.eventTime };
  for (const k of VALUE_KEYS) {
    const v = patch[k];
    if (v !== undefined && v !== current[k]) {
      next[k] = v;
      changed = true;
    }
  }
  return changed ? next : current;
}

// Shared by snapshot and batch. New objects only for changed symbols;
// nothing changed -> the SAME state object, so zustand does not notify.
function merge(state: QuotesState, patches: Iterable<TickerPatch>): QuotesState {
  let bySymbol: Record<string, Ticker> | null = null;
  for (const patch of patches) {
    const current = (bySymbol ?? state.bySymbol)[patch.symbol];
    const next = mergeTicker(current, patch);
    if (next === null || next === current) continue;
    bySymbol ??= { ...state.bySymbol };
    bySymbol[patch.symbol] = next;
  }
  return bySymbol ? { ...state, bySymbol } : state;
}

export const useQuotes = create<QuotesState>()((set) => ({
  bySymbol: {},
  applySnapshot: (list) => set((state) => merge(state, list)),
  applyBatch: (batch) => set((state) => merge(state, batch.values())),
}));
