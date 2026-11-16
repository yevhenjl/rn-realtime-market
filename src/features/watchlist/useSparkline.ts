import { useQuery } from '@tanstack/react-query';

import { SPARK_KEY } from '@/binance/queryKeys';
import { fetchKlines } from '@/binance/rest';

export const SPARK_INTERVAL = '1h';
export const SPARK_BUCKET_MS = 3_600_000; // one SPARK_INTERVAL candle; keep in sync with SPARK_INTERVAL
export const SPARK_POINTS = 24;
export const SPARK_STALE_TIME_MS = 5 * 60_000;

/**
 * 24 hourly candles for a watchlist row's sparkline (oldest first). Fresh for 5 minutes, so
 * FlashList recycling and remounts do not refetch. Not invalidated on reconnect: the live last
 * point comes from ticks (applyTick), and the hourly history barely changes.
 */
export function useSparkline(symbol: string) {
  return useQuery({
    queryKey: [...SPARK_KEY, symbol],
    queryFn: ({ signal }) => fetchKlines(symbol, SPARK_INTERVAL, SPARK_POINTS, signal),
    staleTime: SPARK_STALE_TIME_MS,
  });
}
