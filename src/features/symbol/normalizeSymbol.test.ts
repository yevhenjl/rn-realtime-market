import { normalizeSymbol } from './normalizeSymbol';

describe('normalizeSymbol', () => {
  it('uppercases and trims', () => {
    expect(normalizeSymbol('btcusdt')).toBe('BTCUSDT');
    expect(normalizeSymbol(' ethUSDT ')).toBe('ETHUSDT');
    expect(normalizeSymbol('1000satsusdt')).toBe('1000SATSUSDT');
  });

  it('takes the first value of a repeated param', () => {
    expect(normalizeSymbol(['solusdt', 'x'])).toBe('SOLUSDT');
  });

  it.each([undefined, '', '   ', 'A', 'BTC/USDT', 'BTC-USDT', 'BTC USDT', '../x', 'A'.repeat(21), 'БТК'])(
    'rejects %p',
    (value) => {
      expect(normalizeSymbol(value)).toBeNull();
    },
  );

  it('rejects an empty array', () => {
    expect(normalizeSymbol([])).toBeNull();
  });
});
