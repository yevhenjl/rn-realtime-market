// Stream-name builders: lowercase symbol, camelCase stream type (btcusdt@miniTicker).
// Pure TS: no React or React Native imports.

export type KlineInterval =
  | '1s'
  | '1m'
  | '3m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '2h'
  | '4h'
  | '6h'
  | '8h'
  | '12h'
  | '1d'
  | '3d'
  | '1w'
  | '1M';

export type DepthSpeed = '100ms' | '1000ms';

export const miniTickerStream = (symbol: string): string => `${symbol.toLowerCase()}@miniTicker`;

export const tradeStream = (symbol: string): string => `${symbol.toLowerCase()}@trade`;

export const klineStream = (symbol: string, interval: KlineInterval = '1m'): string =>
  `${symbol.toLowerCase()}@kline_${interval}`;

export const aggTradeStream = (symbol: string): string => `${symbol.toLowerCase()}@aggTrade`;

// Diff. depth stream: 1000ms is Binance's default speed and has no suffix.
export const depthStream = (symbol: string, speed: DepthSpeed = '1000ms'): string =>
  speed === '100ms' ? `${symbol.toLowerCase()}@depth@100ms` : `${symbol.toLowerCase()}@depth`;
