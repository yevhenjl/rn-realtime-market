// Pure constants: no react / react-native imports. Only secure schemes (wss://, https://).

// Fixed list, checked 2026-11-02 against ticker/24hr (the 20 most liquid USDT pairs).
// First 10 are hand-picked, the next 10 are the next USDT pairs by 24h volume.
// TRUMPUSDT is excluded on purpose.
export const WATCHLIST = [
  'BTCUSDT',
  'ETHUSDT',
  'ZECUSDT',
  'NEARUSDT',
  'TAOUSDT',
  'UNIUSDT',
  'SOLUSDT',
  'HYPEUSDT',
  'BNBUSDT',
  'LINKUSDT',
  'XRPUSDT',
  'PEPEUSDT',
  'TRXUSDT',
  'SUIUSDT',
  'ENAUSDT',
  'AAVEUSDT',
  'DOGEUSDT',
  'AVAXUSDT',
  'XPLUSDT',
  'WLDUSDT',
] as const;

export type WatchSymbol = (typeof WATCHLIST)[number];

/** Combined-stream endpoint of the market-data-only host (no keys, no private streams). */
export const WS_URL = 'wss://data-stream.binance.vision/stream';

/** REST host of the market-data-only host; paths are `/api/v3/...`. */
export const REST_BASE = 'https://data-api.binance.vision';
