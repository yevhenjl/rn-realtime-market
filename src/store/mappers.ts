import type { MiniTickerMsg, Ticker24h, TradeMsg } from '@/binance/schemas';

import type { Ticker, TickerPatch } from './types';

// Full ticker from a miniTicker stream message.
export function tickerFromMini(m: MiniTickerMsg): Ticker {
  return { symbol: m.s, eventTime: m.E, last: m.c, open: m.o, high: m.h, low: m.l, quoteVolume: m.q };
}

// A trade only carries the last price.
export function patchFromTrade(t: TradeMsg): TickerPatch {
  return { symbol: t.s, eventTime: t.E, last: t.p };
}

// REST snapshot: closeTime is the closest thing to an event time.
export function tickerFromRest(t: Ticker24h): Ticker {
  return {
    symbol: t.symbol,
    eventTime: t.closeTime,
    last: t.lastPrice,
    open: t.openPrice,
    high: t.highPrice,
    low: t.lowPrice,
    quoteVolume: t.quoteVolume,
  };
}
