import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { kline } from '@/binance/fixtures';
import { KLINES_KEY, klinesKey } from '@/binance/queryKeys';
import { fetchKlines } from '@/binance/rest';
import type { ChartCandle } from '@/chart/types';
import { metrics } from '@/dev/metrics';
import { realtime } from '@/realtime/client';

import { INTERVAL_MS, useKlines, useKlineStream } from './useKlines';

jest.mock('@/binance/rest', () => ({
  ...jest.requireActual('@/binance/rest'),
  fetchKlines: jest.fn(),
}));

const fetchMock = jest.mocked(fetchKlines);
const MIN = INTERVAL_MS['1m'];
const T0 = 1_794_471_600_000; // a minute boundary

const candle = (i: number, c = 100 + i): ChartCandle => ({ t: T0 + i * MIN, o: 100, h: 200, l: 50, c, v: 1 });
const history = (n: number) => Array.from({ length: n }, (_, i) => candle(i));

// A real kline message (fixtures) moved onto minute `i`, closing at `close`.
const klineMsg = (i: number, close: string) => ({ ...kline, k: { ...kline.k, t: T0 + i * MIN, c: close } });

describe('kline hooks', () => {
  let queryClient: QueryClient;
  let listener: ((data: unknown) => void) | null;
  let unsubscribe: jest.Mock;
  let subscribeSpy: jest.SpyInstance;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const emit = (data: unknown) => {
    if (!listener) throw new Error('not subscribed');
    listener(data);
  };
  const cached = () => queryClient.getQueryData<ChartCandle[]>(klinesKey('BTCUSDT', '1m'));

  beforeEach(() => {
    // gcTime: Infinity - no garbage-collection timer, so Jest can exit.
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    fetchMock.mockReset();
    metrics.invalid = 0;
    metrics.gaps = 0;
    listener = null;
    unsubscribe = jest.fn();
    subscribeSpy = jest.spyOn(realtime, 'subscribe').mockImplementation((_stream, cb) => {
      listener = cb;
      return unsubscribe;
    });
  });

  afterEach(() => {
    subscribeSpy.mockRestore();
    queryClient.clear();
  });

  describe('useKlines', () => {
    it('loads 500 one-minute candles for the symbol under a klines-rooted key', async () => {
      fetchMock.mockResolvedValue(history(3));

      const { result } = await renderHook(() => useKlines('BTCUSDT'), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('BTCUSDT', '1m', 500, expect.any(AbortSignal));
      expect(result.current.data).toEqual(history(3));
      expect(queryClient.getQueryData(['klines', 'BTCUSDT', '1m'])).toEqual(history(3));
    });

    it('a klines-root invalidation (what the realtime client does after a reconnect) refetches', async () => {
      fetchMock.mockResolvedValueOnce(history(3)).mockResolvedValueOnce(history(4));
      const { result } = await renderHook(() => useKlines('BTCUSDT'), { wrapper });
      await waitFor(() => expect(result.current.data).toHaveLength(3));

      await act(async () => {
        await queryClient.invalidateQueries({ queryKey: KLINES_KEY });
      });

      await waitFor(() => expect(result.current.data).toHaveLength(4));
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('uses the requested interval', async () => {
      fetchMock.mockResolvedValue([]);
      await renderHook(() => useKlines('ETHUSDT', '5m'), { wrapper });
      await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('ETHUSDT', '5m', 500, expect.anything()));
    });
  });

  describe('useKlineStream', () => {
    it('subscribes to the lowercase kline stream of the interval', async () => {
      await renderHook(() => useKlineStream('BTCUSDT', '1m'), { wrapper });

      expect(subscribeSpy).toHaveBeenCalledTimes(1);
      expect(subscribeSpy.mock.calls[0]![0]).toBe('btcusdt@kline_1m');
    });

    it('replaces the last candle when the message has the same open time', async () => {
      queryClient.setQueryData(klinesKey('BTCUSDT', '1m'), history(3));
      await renderHook(() => useKlineStream('BTCUSDT'), { wrapper });

      await act(async () => {
        emit(klineMsg(2, '123.50000000'));
      });

      expect(cached()).toHaveLength(3);
      expect(cached()!.at(-1)).toMatchObject({ t: T0 + 2 * MIN, c: 123.5 });
      expect(cached()!.slice(0, 2)).toEqual(history(2));
    });

    it('appends a candle for the next minute (rollover)', async () => {
      queryClient.setQueryData(klinesKey('BTCUSDT', '1m'), history(3));
      await renderHook(() => useKlineStream('BTCUSDT'), { wrapper });

      await act(async () => {
        emit(klineMsg(3, '130.00000000'));
      });

      expect(cached()).toHaveLength(4);
      expect(cached()!.at(-1)).toMatchObject({ t: T0 + 3 * MIN, c: 130 });
      expect(metrics.gaps).toBe(0);
    });

    it('ignores a stale candle: cache untouched, no gap', async () => {
      const list = history(3);
      queryClient.setQueryData(klinesKey('BTCUSDT', '1m'), list);
      await renderHook(() => useKlineStream('BTCUSDT'), { wrapper });

      await act(async () => {
        emit(klineMsg(0, '999.00000000'));
      });

      expect(cached()).toBe(list);
      expect(metrics.gaps).toBe(0);
    });

    it('a hole in the series counts a gap and refetches the history', async () => {
      fetchMock.mockResolvedValueOnce(history(3)).mockResolvedValueOnce(history(6));
      const { result } = await renderHook(
        () => {
          useKlineStream('BTCUSDT');
          return useKlines('BTCUSDT');
        },
        { wrapper },
      );
      await waitFor(() => expect(result.current.data).toHaveLength(3));

      await act(async () => {
        emit(klineMsg(5, '130.00000000'));
      }); // minutes 3 and 4 are missing

      expect(metrics.gaps).toBe(1);
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(result.current.data).toHaveLength(6));
    });

    it('a second gap while the history refetch is in flight does not abort it', async () => {
      let resolveRefetch: (list: ChartCandle[]) => void = () => {};
      let refetchSignal: AbortSignal | undefined;
      fetchMock.mockResolvedValueOnce(history(3)).mockImplementationOnce(
        (_symbol, _interval, _limit, signal) => {
          refetchSignal = signal;
          return new Promise<ChartCandle[]>((resolve) => {
            resolveRefetch = resolve;
          });
        },
      );
      const { result } = await renderHook(
        () => {
          useKlineStream('BTCUSDT');
          return useKlines('BTCUSDT');
        },
        { wrapper },
      );
      await waitFor(() => expect(result.current.data).toHaveLength(3));

      await act(async () => {
        emit(klineMsg(5, '130.00000000'));
      }); // gap: the refetch starts and stays pending
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

      await act(async () => {
        emit(klineMsg(8, '140.00000000')); // the next message still sees a hole: a second gap
      });

      expect(metrics.gaps).toBe(2);
      expect(refetchSignal?.aborted).toBe(false);
      expect(fetchMock).toHaveBeenCalledTimes(2);

      await act(async () => {
        resolveRefetch(history(9));
      });
      await waitFor(() => expect(result.current.data).toHaveLength(9));
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('an invalid message counts metrics.invalid and leaves the cache alone', async () => {
      const list = history(3);
      queryClient.setQueryData(klinesKey('BTCUSDT', '1m'), list);
      await renderHook(() => useKlineStream('BTCUSDT'), { wrapper });

      await act(async () => {
        emit({ ...kline, e: 'trade' });
        emit({ ...kline, k: { ...kline.k, c: 130 } }); // a number instead of a decimal string
        emit(null);
        emit('garbage');
      });

      expect(metrics.invalid).toBe(4);
      expect(cached()).toBe(list);
    });

    it('does not create a cache entry before the history arrives', async () => {
      await renderHook(() => useKlineStream('BTCUSDT'), { wrapper });

      await act(async () => {
        emit(klineMsg(0, '100.00000000'));
      });

      expect(cached()).toBeUndefined();
    });

    it('unsubscribes on unmount', async () => {
      const { unmount } = await renderHook(() => useKlineStream('BTCUSDT'), { wrapper });
      expect(unsubscribe).not.toHaveBeenCalled();

      await unmount();

      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('switching the symbol releases the old stream and subscribes to the new one', async () => {
      const { rerender } = await renderHook(({ symbol }: { symbol: string }) => useKlineStream(symbol), {
        wrapper,
        initialProps: { symbol: 'BTCUSDT' },
      });

      await rerender({ symbol: 'ETHUSDT' });

      expect(unsubscribe).toHaveBeenCalledTimes(1);
      expect(subscribeSpy.mock.calls.map(([stream]) => stream)).toEqual(['btcusdt@kline_1m', 'ethusdt@kline_1m']);
    });
  });
});
