import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { candleFromKline } from '@/binance/mappers';
import { klinesKey } from '@/binance/queryKeys';
import { fetchKlines } from '@/binance/rest';
import { KlineSchema } from '@/binance/schemas';
import { klineStream } from '@/binance/streams';
import { upsertCandle } from '@/chart/series';
import type { ChartCandle } from '@/chart/types';
import { increment } from '@/dev/metrics';
import { realtime } from '@/realtime/client';

export const INTERVAL_MS = { '1m': 60_000, '5m': 300_000, '1h': 3_600_000 } as const;
export type Interval = keyof typeof INTERVAL_MS;

export const KLINES_LIMIT = 500;

/**
 * History: 500 candles over REST (weight 2, about 85 KB uncompressed).
 * The key starts with KLINES_KEY, so the realtime client's invalidation after a reconnect
 * refetches it: that is the resync after a disconnect.
 */
export function useKlines(symbol: string, interval: Interval = '1m') {
  return useQuery({
    queryKey: klinesKey(symbol, interval),
    queryFn: ({ signal }) => fetchKlines(symbol, interval, KLINES_LIMIT, signal),
  });
}

/**
 * The live candle arrives every ~2 s, a rare event: write it straight into the Query cache.
 * A hole in the series triggers a history refetch. Quotes would not fit this approach
 * (dozens of events per second); a candle does.
 * `subscribe` returns the unsubscribe function, which is the effect cleanup.
 */
export function useKlineStream(symbol: string, interval: Interval = '1m') {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      realtime.subscribe(klineStream(symbol, interval), (data) => {
        const parsed = KlineSchema.safeParse(data);
        if (!parsed.success) {
          increment('invalid');
          return;
        }
        let gap = false;
        queryClient.setQueryData<ChartCandle[]>(klinesKey(symbol, interval), (old) => {
          if (!old) return old; // no history yet: REST will return the current candle too
          const res = upsertCandle(old, candleFromKline(parsed.data), INTERVAL_MS[interval]);
          gap = res.kind === 'gap';
          return res.list;
        });
        if (gap) {
          increment('gaps');
          // cancelRefetch: false - a refetch already in flight is kept. The default (true) would abort the
          // 500-candle history request on every further gap message (~2 s), so on a slow link it never finishes.
          void queryClient.invalidateQueries(
            { queryKey: klinesKey(symbol, interval) },
            { cancelRefetch: false },
          );
        }
      }),
    [queryClient, symbol, interval],
  );
}
