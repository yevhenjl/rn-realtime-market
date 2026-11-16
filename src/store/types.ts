// Decimal strings as Binance sends them; never parsed to number in the store.
export type Ticker = {
  symbol: string; // BTCUSDT (uppercase, as Binance sends `s`)
  eventTime: number; // exchange event time, ms (miniTicker `E`, trade `E`, REST closeTime)
  last: string;
  open: string;
  high: string;
  low: string;
  quoteVolume: string;
};

// Partial update: identity + ordering fields required, the rest optional.
export type TickerPatch = Pick<Ticker, 'symbol' | 'eventTime'> &
  Partial<Omit<Ticker, 'symbol' | 'eventTime'>>;
