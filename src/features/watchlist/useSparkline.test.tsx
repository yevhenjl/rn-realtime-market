import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { SPARK_KEY } from '@/binance/queryKeys';
import { klineRow } from '@/binance/fixtures';
import { REST_BASE } from '@/config';

import { SPARK_STALE_TIME_MS, useSparkline } from './useSparkline';

const originalFetch = globalThis.fetch;
const fetchMock = jest.fn<Promise<Response>, [input: RequestInfo | URL, init?: RequestInit]>();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('useSparkline', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    // gcTime: Infinity - no garbage-collection timer, so Jest can exit.
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    fetchMock.mockReset();
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    queryClient.clear();
  });

  it('requests 24 hourly klines for the symbol and returns ChartCandle[]', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse([klineRow])));

    const { result } = await renderHook(() => useSparkline('ethusdt'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const raw = String(fetchMock.mock.calls[0]?.[0]);
    expect(raw.startsWith(`${REST_BASE}/api/v3/klines?`)).toBe(true);
    const params = new URL(raw).searchParams;
    expect(params.get('symbol')).toBe('ETHUSDT');
    expect(params.get('interval')).toBe('1h');
    expect(params.get('limit')).toBe('24');
    expect(result.current.data).toEqual([
      { t: 1794471720000, o: 73592.54, h: 73592.54, l: 73569.99, c: 73569.99, v: 0.90585 },
    ]);
  });

  it('is cached per symbol under SPARK_KEY', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse([klineRow])));

    const btc = await renderHook(() => useSparkline('BTCUSDT'), { wrapper });
    await waitFor(() => expect(btc.result.current.isSuccess).toBe(true));
    const eth = await renderHook(() => useSparkline('ETHUSDT'), { wrapper });
    await waitFor(() => expect(eth.result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryCache().getAll().map((q) => q.queryKey)).toEqual([
      [...SPARK_KEY, 'BTCUSDT'],
      [...SPARK_KEY, 'ETHUSDT'],
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not refetch on remount within 5 minutes, and does after', async () => {
    // TanStack decides staleness from Date.now(); shift only the clock, keep real timers.
    const realNow = Date.now();
    let offset = 0;
    const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => realNow + offset);
    try {
      fetchMock.mockImplementation(() => Promise.resolve(jsonResponse([klineRow])));

      const first = await renderHook(() => useSparkline('BTCUSDT'), { wrapper });
      await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
      await first.unmount();

      offset = SPARK_STALE_TIME_MS - 1_000;
      const second = await renderHook(() => useSparkline('BTCUSDT'), { wrapper });
      await waitFor(() => expect(second.result.current.isSuccess).toBe(true));
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await second.unmount();

      offset = SPARK_STALE_TIME_MS + 1_000;
      await renderHook(() => useSparkline('BTCUSDT'), { wrapper });
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    } finally {
      nowSpy.mockRestore();
    }
  });
});
