import { z } from 'zod';

// Binance sends numbers as strings: "84710.60000000". We keep strings, so no precision is lost.
const Decimal = z.string().regex(/^-?\d+(\.\d+)?$/);

// z.object strips unknown keys by default (e.g. the ignored `M` field of a trade).

export const MiniTickerSchema = z.object({
  e: z.literal('24hrMiniTicker'),
  E: z.number(), // event time on the exchange, ms
  s: z.string(), // BTCUSDT
  c: Decimal, // last price
  o: Decimal, // open price (24h)
  h: Decimal, // high (24h)
  l: Decimal, // low (24h)
  v: Decimal, // base asset volume
  q: Decimal, // quote asset volume
});
export type MiniTickerMsg = z.infer<typeof MiniTickerSchema>;

export const TradeSchema = z.object({
  e: z.literal('trade'),
  E: z.number(), // event time, ms
  s: z.string(),
  t: z.number(), // trade id
  p: Decimal, // price
  q: Decimal, // quantity
  T: z.number(), // trade time, ms
  m: z.boolean(), // is the buyer the market maker
});
export type TradeMsg = z.infer<typeof TradeSchema>;

export const KlineSchema = z.object({
  e: z.literal('kline'),
  E: z.number(), // event time, ms
  s: z.string(),
  k: z.object({
    t: z.number(), // open time, ms (the candle key)
    T: z.number(), // close time, ms
    i: z.string(), // interval, e.g. 1m
    o: Decimal,
    c: Decimal,
    h: Decimal,
    l: Decimal,
    v: Decimal, // base asset volume
    x: z.boolean(), // is this candle closed
  }),
});
export type KlineMsg = z.infer<typeof KlineSchema>;

// REST GET /api/v3/ticker/24hr?type=MINI
export const Ticker24hSchema = z.object({
  symbol: z.string(),
  openPrice: Decimal,
  highPrice: Decimal,
  lowPrice: Decimal,
  lastPrice: Decimal,
  volume: Decimal,
  quoteVolume: Decimal,
  openTime: z.number(),
  closeTime: z.number(),
});
export type Ticker24h = z.infer<typeof Ticker24hSchema>;

// REST GET /api/v3/klines row: [openTime, open, high, low, close, volume, closeTime, ...ignored]
export const KlineRowSchema = z
  .tuple([z.number(), Decimal, Decimal, Decimal, Decimal, Decimal, z.number()])
  .rest(z.unknown());
export type KlineRow = z.infer<typeof KlineRowSchema>;

// Combined-stream envelope: `data` is validated per stream by the consumer.
export const CombinedEnvelopeSchema = z.object({
  stream: z.string(),
  data: z.unknown(),
});
export type CombinedEnvelope = z.infer<typeof CombinedEnvelopeSchema>;
