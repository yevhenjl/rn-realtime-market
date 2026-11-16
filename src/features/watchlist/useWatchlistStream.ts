import { useEffect } from 'react';

import { MiniTickerSchema, TradeSchema } from '@/binance/schemas';
import { miniTickerStream, tradeStream } from '@/binance/streams';
import { increment, recordLatency } from '@/dev/metrics';
import { realtime } from '@/realtime/client';
import { createConflator } from '@/store/conflator';
import { patchFromTrade, tickerFromMini } from '@/store/mappers';
import { useQuotes } from '@/store/quotesStore';
import type { TickerPatch } from '@/store/types';

/**
 * Binance ticks -> Zod -> conflator -> useQuotes, for the given symbols.
 * `stress` adds the (much busier) trade streams; `flushMs = 0` disables batching (for measurements).
 *
 * The effect is keyed on the joined symbols string, not on the array identity, so callers may pass
 * a fresh array on every render without re-subscribing. Symbols must not contain commas.
 * The hook never starts or stops the client: the lifecycle hook owns that, and subscribing while
 * the client is stopped just records the wanted set.
 */
export function useWatchlistStream(symbols: readonly string[], stress = false, flushMs = 200): void {
  const symbolsKey = symbols.join(',');

  useEffect(() => {
    const list = symbolsKey === '' ? [] : symbolsKey.split(',');
    const applyBatch = useQuotes.getState().applyBatch;
    const conflator = createConflator<TickerPatch>((batch) => {
      increment('flushes'); // store writes per second, shown in the dev overlay
      applyBatch(batch);
    }, flushMs);

    const onMini = (data: unknown): void => {
      const parsed = MiniTickerSchema.safeParse(data);
      if (!parsed.success) {
        increment('invalid');
        return;
      }
      recordLatency(parsed.data.E);
      conflator.push(tickerFromMini(parsed.data));
    };
    const onTrade = (data: unknown): void => {
      const parsed = TradeSchema.safeParse(data);
      if (!parsed.success) {
        increment('invalid');
        return;
      }
      conflator.push(patchFromTrade(parsed.data));
    };

    const unsubscribers: (() => void)[] = [];
    for (const symbol of list) {
      unsubscribers.push(realtime.subscribe(miniTickerStream(symbol), onMini));
      if (stress) unsubscribers.push(realtime.subscribe(tradeStream(symbol), onTrade));
    }

    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe();
      conflator.dispose();
    };
  }, [symbolsKey, stress, flushMs]);
}
