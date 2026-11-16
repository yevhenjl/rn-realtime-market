// TanStack Query key roots shared by hooks and the realtime client's refetch-after-reconnect.
// Pure TS: no React or React Native imports. Hooks extend these, e.g. [...TICKERS_KEY, symbols].
import type { KlineInterval } from './streams';

export const KLINES_KEY = ['klines'] as const;
export const TICKERS_KEY = ['tickers'] as const;
// Watchlist sparklines (24 hourly klines per symbol): [...SPARK_KEY, symbol]. Not invalidated on
// reconnect: the series is hourly and staleTime already bounds its age.
export const SPARK_KEY = ['spark'] as const;
export const klinesKey = (symbol: string, interval: KlineInterval) =>
  [...KLINES_KEY, symbol, interval] as const;
