import { z } from 'zod';

import { REST_BASE } from '@/config';

import { klineRow } from './fixtures';
import {
  BinanceHttpError,
  BinanceRegionError,
  BinanceTimeoutError,
  MAX_ATTEMPTS,
  REQUEST_TIMEOUT_MS,
  fetchKlines,
  fetchServerTime,
  fetchTickers24h,
  shouldRetry,
} from './rest';

const originalFetch = globalThis.fetch;
const fetchMock = jest.fn<Promise<Response>, [input: RequestInfo | URL, init?: RequestInit]>();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  jest.useRealTimers();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function abortError(): Error {
  const error = new Error('The operation was aborted.');
  error.name = 'AbortError';
  return error;
}

/** A fetch that never answers and rejects with AbortError when its signal fires, like real fetch. */
function hangUntilAborted(_input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    const signal = init?.signal;
    if (signal?.aborted) reject(abortError());
    signal?.addEventListener('abort', () => reject(abortError()));
  });
}

function ticker(symbol: string, lastPrice: string) {
  return {
    symbol,
    openPrice: '100.00000000',
    highPrice: '120.00000000',
    lowPrice: '90.00000000',
    lastPrice,
    volume: '10.50000000',
    quoteVolume: '1050.00000000',
    openTime: 1794385320000,
    closeTime: 1794471720000,
  };
}

function requestedUrl(): URL {
  const [input] = fetchMock.mock.calls[0] ?? [];
  return new URL(String(input));
}

describe('fetchTickers24h', () => {
  test('requests type=MINI with the upper-cased symbols as an encoded JSON array', async () => {
    fetchMock.mockResolvedValue(jsonResponse([ticker('BTCUSDT', '1'), ticker('ETHUSDT', '2')]));

    await fetchTickers24h(['btcusdt', 'ETHUSDT']);

    const raw = String(fetchMock.mock.calls[0]?.[0]);
    expect(raw.startsWith(`${REST_BASE}/api/v3/ticker/24hr?`)).toBe(true);
    expect(raw).toContain('type=MINI');
    expect(raw).toContain(`symbols=${encodeURIComponent('["BTCUSDT","ETHUSDT"]')}`);
    expect(requestedUrl().searchParams.get('symbols')).toBe('["BTCUSDT","ETHUSDT"]');
  });

  test('matches the response to the requested order by symbol', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([ticker('SOLUSDT', '3'), ticker('BTCUSDT', '1'), ticker('ETHUSDT', '2')]),
    );

    const result = await fetchTickers24h(['BTCUSDT', 'ETHUSDT', 'SOLUSDT']);

    expect(result.map((t) => t.symbol)).toEqual(['BTCUSDT', 'ETHUSDT', 'SOLUSDT']);
    expect(result.map((t) => t.lastPrice)).toEqual(['1', '2', '3']);
  });

  test('skips a symbol missing from a 200 response and keeps the rest in order', async () => {
    fetchMock.mockResolvedValue(jsonResponse([ticker('ETHUSDT', '2'), ticker('BTCUSDT', '1')]));

    const result = await fetchTickers24h(['BTCUSDT', 'GONEUSDT', 'ETHUSDT']);

    expect(result.map((t) => t.symbol)).toEqual(['BTCUSDT', 'ETHUSDT']);
  });

  test('passes unknown fields through the schema stripped', async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ ...ticker('BTCUSDT', '1'), extra: 'x' }]));

    const [first] = await fetchTickers24h(['BTCUSDT']);

    expect(first).not.toHaveProperty('extra');
  });

  test('HTTP 400 with a Binance body becomes BinanceHttpError with status and code', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ code: -1121, msg: 'Invalid symbol.' }, 400));

    const error = await fetchTickers24h(['NOPE']).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BinanceHttpError);
    expect(error).not.toBeInstanceOf(BinanceRegionError);
    expect(error).toMatchObject({ status: 400, code: -1121 });
    expect(error).toMatchObject({ message: expect.stringContaining('Invalid symbol.') });
  });

  test('an error status with a non-JSON body still gives BinanceHttpError without a code', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }));

    const error = await fetchTickers24h(['BTCUSDT']).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BinanceHttpError);
    expect(error).toMatchObject({ status: 502, code: undefined });
  });

  test('HTTP 451 becomes BinanceRegionError and is requested only once', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ code: 0, msg: 'Service unavailable from a restricted location.' }, 451));

    const error = await fetchTickers24h(['BTCUSDT']).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BinanceRegionError);
    expect(error).toBeInstanceOf(BinanceHttpError);
    expect(error).toMatchObject({ status: 451 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('a response of the wrong shape rejects with a ZodError', async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ ...ticker('BTCUSDT', '1'), lastPrice: 1 }]));

    await expect(fetchTickers24h(['BTCUSDT'])).rejects.toBeInstanceOf(z.ZodError);
  });

  test('network failures propagate unchanged', async () => {
    const failure = new TypeError('Network request failed');
    fetchMock.mockRejectedValue(failure);

    await expect(fetchTickers24h(['BTCUSDT'])).rejects.toBe(failure);
  });
});

describe('fetchKlines', () => {
  test('maps the real REST row to numbers: t = openTime, o/h/l/c/v in order', async () => {
    fetchMock.mockResolvedValue(jsonResponse([klineRow]));

    const candles = await fetchKlines('btcusdt', '1m', 1);

    expect(candles).toEqual([
      { t: 1794471720000, o: 73592.54, h: 73592.54, l: 73569.99, c: 73569.99, v: 0.90585 },
    ]);
    const url = requestedUrl();
    expect(url.pathname).toBe('/api/v3/klines');
    expect(url.searchParams.get('symbol')).toBe('BTCUSDT');
    expect(url.searchParams.get('interval')).toBe('1m');
    expect(url.searchParams.get('limit')).toBe('1');
  });

  test('distinct open/high/low/close map to distinct fields', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([[1000, '1.5', '9.5', '0.5', '4.5', '7.5', 1999, '0', 1, '0', '0', '0']]),
    );

    expect(await fetchKlines('BTCUSDT', '1h')).toEqual([{ t: 1000, o: 1.5, h: 9.5, l: 0.5, c: 4.5, v: 7.5 }]);
  });

  test('limit defaults to 500', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await fetchKlines('BTCUSDT', '5m');

    expect(requestedUrl().searchParams.get('limit')).toBe('500');
  });

  test('a row with a numeric price rejects with a ZodError', async () => {
    fetchMock.mockResolvedValue(jsonResponse([[1000, 1.5, '9.5', '0.5', '4.5', '7.5', 1999]]));

    await expect(fetchKlines('BTCUSDT', '1m')).rejects.toBeInstanceOf(z.ZodError);
  });
});

describe('fetchServerTime', () => {
  test('returns serverTime from /api/v3/time', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ serverTime: 1794471720000 }));

    expect(await fetchServerTime()).toBe(1794471720000);
    expect(requestedUrl().pathname).toBe('/api/v3/time');
  });

  test('a body without serverTime rejects with a ZodError', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ time: 1 }));

    await expect(fetchServerTime()).rejects.toBeInstanceOf(z.ZodError);
  });
});

describe('timeout and cancellation', () => {
  test('a request that hangs is aborted after the timeout with BinanceTimeoutError', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(hangUntilAborted);

    const result = fetchServerTime().catch((e: unknown) => e);
    await jest.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS - 1);
    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(false);
    await jest.advanceTimersByTimeAsync(1);

    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    expect(await result).toBeInstanceOf(BinanceTimeoutError);
  });

  test('a timeout is retryable, unlike a caller abort', async () => {
    expect(shouldRetry(0, new BinanceTimeoutError(REQUEST_TIMEOUT_MS))).toBe(true);
  });

  test('the timer is cleared after a fast response', async () => {
    jest.useFakeTimers();
    fetchMock.mockResolvedValue(jsonResponse({ serverTime: 1 }));

    await fetchServerTime();

    expect(jest.getTimerCount()).toBe(0);
  });

  test('the caller signal aborts the request with an AbortError, not a timeout', async () => {
    fetchMock.mockImplementation(hangUntilAborted);
    const caller = new AbortController();

    const result = fetchServerTime(caller.signal).catch((e: unknown) => e);
    caller.abort();

    const error = await result;
    expect(error).not.toBeInstanceOf(BinanceTimeoutError);
    expect(error).toMatchObject({ name: 'AbortError' });
    expect(shouldRetry(0, error)).toBe(false);
  });

  test('an already aborted caller signal never reaches the network as a live request', async () => {
    fetchMock.mockImplementation(hangUntilAborted);
    const caller = new AbortController();
    caller.abort();

    await expect(fetchServerTime(caller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('shouldRetry', () => {
  const http = (status: number) => new BinanceHttpError(status, undefined, `HTTP ${status}`);

  test('never retries 4xx other than 429', () => {
    expect(shouldRetry(0, http(400))).toBe(false);
    expect(shouldRetry(0, http(404))).toBe(false);
    expect(shouldRetry(0, http(418))).toBe(false);
  });

  test('retries 429 and 5xx', () => {
    expect(shouldRetry(0, http(429))).toBe(true);
    expect(shouldRetry(0, http(500))).toBe(true);
    expect(shouldRetry(0, http(503))).toBe(true);
  });

  test('retries a plain network error', () => {
    expect(shouldRetry(0, new TypeError('Network request failed'))).toBe(true);
  });

  test('never retries 451, even on the first failure', () => {
    expect(shouldRetry(0, new BinanceRegionError(undefined, 'region'))).toBe(false);
  });

  test('never retries ZodError or AbortError', () => {
    const zodError = z.number().safeParse('x').error;
    expect(zodError).toBeInstanceOf(z.ZodError);
    expect(shouldRetry(0, zodError)).toBe(false);
    expect(shouldRetry(0, abortError())).toBe(false);
  });

  test('allows MAX_ATTEMPTS requests in total: failureCount 0 and 1 retry, 2 does not', () => {
    expect(MAX_ATTEMPTS).toBe(3);
    expect(shouldRetry(0, http(503))).toBe(true); // 1st request failed -> 2nd
    expect(shouldRetry(1, http(503))).toBe(true); // 2nd failed -> 3rd
    expect(shouldRetry(2, http(503))).toBe(false); // 3rd failed -> give up
    expect(shouldRetry(5, http(503))).toBe(false);
    expect(shouldRetry(2, new TypeError('Network request failed'))).toBe(false);
  });
});
