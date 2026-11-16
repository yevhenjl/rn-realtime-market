import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { TICKERS_KEY } from '@/binance/queryKeys';
import { fetchTickers24h } from '@/binance/rest';
import { tickerFromRest } from '@/store/mappers';
import { useQuotes } from '@/store/quotesStore';

/**
 * REST 24h snapshot of the symbols, seeded into the quotes store.
 * The key starts with TICKERS_KEY, so the realtime client's invalidation after a reconnect
 * refetches it. The store drops snapshot rows older than ticks it already holds.
 * Returns the query result (status / error / refetch for the screen).
 */
export function useTickerSnapshot(symbols: readonly string[]) {
  const query = useQuery({
    queryKey: [...TICKERS_KEY, symbols.join(',')],
    queryFn: ({ signal }) => fetchTickers24h(symbols, signal),
  });
  const { data } = query;

  useEffect(() => {
    if (data) useQuotes.getState().applySnapshot(data.map(tickerFromRest));
  }, [data]);

  return query;
}
