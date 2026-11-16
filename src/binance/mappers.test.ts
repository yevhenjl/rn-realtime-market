import { kline } from './fixtures';
import { candleFromKline } from './mappers';
import { KlineSchema } from './schemas';

describe('candleFromKline', () => {
  it('maps a real kline message to a numeric candle keyed by open time', () => {
    const msg = KlineSchema.parse(kline);
    expect(candleFromKline(msg)).toEqual({
      t: kline.k.t,
      o: 73607.15,
      h: 73607.79,
      l: 73607.15,
      c: 73607.75,
      v: 0.61042,
    });
  });

  it('uses the candle open time k.t, not the event time E', () => {
    const msg = KlineSchema.parse({ ...kline, E: 1, k: { ...kline.k, t: 60_000 } });
    expect(candleFromKline(msg).t).toBe(60_000);
  });
});
