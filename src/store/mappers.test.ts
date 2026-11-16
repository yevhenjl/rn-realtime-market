import { Ticker24hSchema, MiniTickerSchema, TradeSchema } from '@/binance/schemas';
import * as fixtures from '@/binance/fixtures';

import { patchFromTrade, tickerFromMini, tickerFromRest } from './mappers';

test('tickerFromMini maps a miniTicker message to a full Ticker', () => {
  const msg = MiniTickerSchema.parse(fixtures.miniTicker);
  expect(tickerFromMini(msg)).toEqual({
    symbol: 'BTCUSDT',
    eventTime: 1794471709017,
    last: '73607.75000000',
    open: '73960.44000000',
    high: '74811.45000000',
    low: '73390.13000000',
    quoteVolume: '941620555.65748450',
  });
});

test('patchFromTrade maps a trade to a { symbol, eventTime, last } patch only', () => {
  const msg = TradeSchema.parse(fixtures.trade);
  expect(patchFromTrade(msg)).toEqual({ symbol: 'BTCUSDT', eventTime: 1794471708443, last: '73607.75000000' });
});

test('tickerFromRest uses closeTime as eventTime', () => {
  const msg = Ticker24hSchema.parse({
    symbol: 'ETHUSDT',
    openPrice: '2000.00',
    highPrice: '2100.50',
    lowPrice: '1950.25',
    lastPrice: '2050.10',
    volume: '1234.5',
    quoteVolume: '2530000.75',
    openTime: 1000,
    closeTime: 2000,
  });
  expect(tickerFromRest(msg)).toEqual({
    symbol: 'ETHUSDT',
    eventTime: 2000,
    last: '2050.10',
    open: '2000.00',
    high: '2100.50',
    low: '1950.25',
    quoteVolume: '2530000.75',
  });
});
