import { REST_BASE, WATCHLIST, WS_URL } from './config';

describe('config', () => {
  it('has 20 unique uppercase USDT symbols', () => {
    expect(WATCHLIST).toHaveLength(20);
    expect(new Set(WATCHLIST).size).toBe(20);
    for (const symbol of WATCHLIST) expect(symbol).toMatch(/^[A-Z0-9]+USDT$/);
  });

  it('keeps the document order and excludes TRUMPUSDT', () => {
    expect(WATCHLIST[0]).toBe('BTCUSDT');
    expect(WATCHLIST[9]).toBe('LINKUSDT');
    expect(WATCHLIST[10]).toBe('XRPUSDT');
    expect(WATCHLIST[19]).toBe('WLDUSDT');
    expect(WATCHLIST as readonly string[]).not.toContain('TRUMPUSDT');
  });

  it('uses only secure market-data hosts', () => {
    expect(WS_URL).toBe('wss://data-stream.binance.vision/stream');
    expect(REST_BASE).toBe('https://data-api.binance.vision');
    expect(WS_URL.startsWith('wss://')).toBe(true);
    expect(REST_BASE.startsWith('https://')).toBe(true);
  });
});
