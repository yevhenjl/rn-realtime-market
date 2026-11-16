import { aggTradeStream, depthStream, klineStream, miniTickerStream, tradeStream } from './streams';

describe('stream names', () => {
  test('lowercase the symbol and keep the camelCase type', () => {
    expect(miniTickerStream('BTCUSDT')).toBe('btcusdt@miniTicker');
    expect(tradeStream('ETHUSDT')).toBe('ethusdt@trade');
    expect(aggTradeStream('SOLUSDT')).toBe('solusdt@aggTrade');
  });

  test('kline defaults to 1m and accepts another interval', () => {
    expect(klineStream('SOLUSDT')).toBe('solusdt@kline_1m');
    expect(klineStream('BTCUSDT', '1h')).toBe('btcusdt@kline_1h');
    expect(klineStream('BTCUSDT', '1M')).toBe('btcusdt@kline_1M');
  });

  test('depth: 1000ms by default has no suffix, 100ms adds @100ms', () => {
    expect(depthStream('BTCUSDT')).toBe('btcusdt@depth');
    expect(depthStream('BTCUSDT', '1000ms')).toBe('btcusdt@depth');
    expect(depthStream('BTCUSDT', '100ms')).toBe('btcusdt@depth@100ms');
  });

  test('an already lowercase symbol is unchanged', () => {
    expect(miniTickerStream('btcusdt')).toBe('btcusdt@miniTicker');
  });
});
