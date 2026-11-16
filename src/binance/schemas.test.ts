import { kline, klineRow, miniTicker, trade } from './fixtures';
import { KlineRowSchema, KlineSchema, MiniTickerSchema, TradeSchema } from './schemas';
import { klineStream, miniTickerStream, tradeStream } from './streams';

test('real messages pass the schemas; unknown fields are dropped', () => {
  expect(MiniTickerSchema.parse(miniTicker).s).toBe('BTCUSDT');
  expect(TradeSchema.parse(trade)).not.toHaveProperty('M');
  expect(KlineSchema.parse(kline).k.i).toBe('1m');
  expect(typeof KlineRowSchema.parse(klineRow)[0]).toBe('number');
});

test('a price as a number or a wrong event type is rejected', () => {
  expect(MiniTickerSchema.safeParse({ ...miniTicker, c: 84710.6 }).success).toBe(false);
  expect(MiniTickerSchema.safeParse({ ...miniTicker, e: 'trade' }).success).toBe(false);
});

test('stream names: lowercase symbol, camelCase type', () => {
  expect(miniTickerStream('BTCUSDT')).toBe('btcusdt@miniTicker');
  expect(tradeStream('ETHUSDT')).toBe('ethusdt@trade');
  expect(klineStream('SOLUSDT')).toBe('solusdt@kline_1m');
});
