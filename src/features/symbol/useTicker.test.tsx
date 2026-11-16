import { act, renderHook } from '@testing-library/react-native';

import { useQuotes } from '@/store/quotesStore';
import type { Ticker } from '@/store/types';

import { useTicker } from './useTicker';

const ticker = (over: Partial<Ticker> = {}): Ticker => ({
  symbol: 'BTCUSDT',
  eventTime: 1_000,
  last: '100.00',
  open: '90.00',
  high: '110.00',
  low: '80.00',
  quoteVolume: '1000.00',
  ...over,
});

const batch = (t: Ticker) => new Map([[t.symbol, t]]);

describe('useTicker', () => {
  beforeEach(() => {
    useQuotes.setState(useQuotes.getInitialState(), true);
  });

  it('is empty until the symbol has a ticker', async () => {
    const { result } = await renderHook(() => useTicker('BTCUSDT'));
    expect(result.current).toEqual({ last: undefined, open: undefined });
  });

  it('returns last and open of its own symbol only', async () => {
    useQuotes.getState().applyBatch(
      new Map([
        ['BTCUSDT', ticker()],
        ['ETHUSDT', ticker({ symbol: 'ETHUSDT', last: '3000.00' })],
      ]),
    );

    const { result } = await renderHook(() => useTicker('BTCUSDT'));

    expect(result.current).toEqual({ last: '100.00', open: '90.00' });
  });

  it('follows price changes', async () => {
    useQuotes.getState().applyBatch(batch(ticker()));
    const { result } = await renderHook(() => useTicker('BTCUSDT'));

    await act(async () => {
      useQuotes.getState().applyBatch(batch(ticker({ eventTime: 2_000, last: '101.00' })));
    });

    expect(result.current.last).toBe('101.00');
  });

  it('does not re-render when the store emits a new ticker object with the same last/open', async () => {
    useQuotes.getState().applyBatch(batch(ticker()));
    let renders = 0;
    await renderHook(() => {
      renders++;
      return useTicker('BTCUSDT');
    });
    const before = renders;

    await act(async () => {
      // Newer event time and a changed high: the store replaces the ticker object, last/open are equal.
      useQuotes.getState().applyBatch(batch(ticker({ eventTime: 2_000, high: '111.00' })));
    });

    expect(renders).toBe(before);
  });
});
