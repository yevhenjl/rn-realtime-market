import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { BinanceHttpError, fetchTickers24h } from '@/binance/rest';
import { TICKERS_KEY } from '@/binance/queryKeys';
import type { Ticker24h } from '@/binance/schemas';
import { WATCHLIST } from '@/config';
import { useQuotes } from '@/store/quotesStore';

import { useTickerSnapshot } from './useTickerSnapshot';

jest.mock('@/binance/rest', () => ({
  ...jest.requireActual('@/binance/rest'),
  fetchTickers24h: jest.fn(),
}));

const fetchMock = jest.mocked(fetchTickers24h);

const row = (symbol: string, closeTime: number, lastPrice: string): Ticker24h => ({
  symbol,
  openPrice: '100.00',
  highPrice: '110.00',
  lowPrice: '90.00',
  lastPrice,
  volume: '10.00',
  quoteVolume: '1000.00',
  openTime: closeTime - 86_400_000,
  closeTime,
});

// TanStack re-renders only for the result fields that were read during render ("tracked props"),
// so the probe reads the ones the screen will use (status / error / refetch).
function useProbe(symbols: readonly string[]) {
  const { status, error, refetch } = useTickerSnapshot(symbols);
  return { status, error, refetch };
}

describe('useTickerSnapshot', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    // gcTime: Infinity - no garbage-collection timer, so Jest can exit.
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    useQuotes.setState(useQuotes.getInitialState(), true);
    fetchMock.mockReset();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('puts the snapshot into the store: all symbols, WATCHLIST order', async () => {
    fetchMock.mockResolvedValue(WATCHLIST.map((s, i) => row(s, 1_000 + i, `${i + 1}.00`)));

    const { result } = await renderHook(() => useProbe(WATCHLIST), { wrapper });
    await waitFor(() => expect(Object.keys(useQuotes.getState().bySymbol)).toHaveLength(WATCHLIST.length));

    expect(Object.keys(useQuotes.getState().bySymbol)).toEqual([...WATCHLIST]);
    expect(useQuotes.getState().bySymbol.BTCUSDT).toEqual({
      symbol: 'BTCUSDT',
      eventTime: 1_000,
      last: '1.00',
      open: '100.00',
      high: '110.00',
      low: '90.00',
      quoteVolume: '1000.00',
    });
    expect(result.current.status).toBe('success');
    expect(fetchMock).toHaveBeenCalledWith(WATCHLIST, expect.any(AbortSignal));
  });

  it('is cached under a key that starts with TICKERS_KEY; invalidating it refetches and applies a newer snapshot', async () => {
    fetchMock.mockResolvedValueOnce([row('BTCUSDT', 1_000, '100.00')]);
    await renderHook(() => useProbe(['BTCUSDT']), { wrapper });
    await waitFor(() => expect(useQuotes.getState().bySymbol.BTCUSDT?.last).toBe('100.00'));

    const keys = queryClient.getQueryCache().getAll().map((q) => q.queryKey);
    expect(keys).toHaveLength(1);
    expect(keys[0]?.slice(0, TICKERS_KEY.length)).toEqual([...TICKERS_KEY]);

    fetchMock.mockResolvedValueOnce([row('BTCUSDT', 2_000, '105.00')]);
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: TICKERS_KEY });
    });

    await waitFor(() => expect(useQuotes.getState().bySymbol.BTCUSDT?.last).toBe('105.00'));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('an older snapshot does not overwrite a newer tick already in the store', async () => {
    useQuotes.getState().applyBatch(
      new Map([
        [
          'BTCUSDT',
          {
            symbol: 'BTCUSDT',
            eventTime: 5_000,
            last: '120.00',
            open: '100.00',
            high: '121.00',
            low: '90.00',
            quoteVolume: '1000.00',
          },
        ],
      ]),
    );
    fetchMock.mockResolvedValue([row('BTCUSDT', 1_000, '100.00'), row('ETHUSDT', 1_000, '10.00')]);

    const { result } = await renderHook(() => useProbe(['BTCUSDT', 'ETHUSDT']), { wrapper });
    await waitFor(() => expect(useQuotes.getState().bySymbol.ETHUSDT?.last).toBe('10.00'));

    expect(result.current.status).toBe('success');
    expect(useQuotes.getState().bySymbol.BTCUSDT?.last).toBe('120.00');
  });

  it('surfaces an error without touching the store, and refetch recovers', async () => {
    fetchMock.mockRejectedValueOnce(new BinanceHttpError(500, undefined, 'boom'));

    const { result } = await renderHook(() => useProbe(['BTCUSDT']), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('error'));

    expect(result.current.error).toBeInstanceOf(BinanceHttpError);
    expect(useQuotes.getState().bySymbol).toEqual({});

    fetchMock.mockResolvedValueOnce([row('BTCUSDT', 1_000, '100.00')]);
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(useQuotes.getState().bySymbol.BTCUSDT?.last).toBe('100.00'));
    expect(result.current.status).toBe('success');
  });
});
