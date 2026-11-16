// Binance REST client (public market data, no keys). Pure TS: no React or React Native imports.
import { z } from 'zod';

import type { ChartCandle } from '@/chart/types';
import { REST_BASE } from '@/config';

import { KlineRowSchema, Ticker24hSchema, type Ticker24h } from './schemas';
import type { KlineInterval } from './streams';

/** Per-request budget, covers connecting, headers and reading the body. */
export const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Total attempts per query: the first request plus retries.
 * TanStack calls `retry(failureCount, error)` after each failure, with failureCount = 0 after
 * the first one. Failure #1 (count 0) and #2 (count 1) may retry; failure #3 (count 2) is final.
 */
export const MAX_ATTEMPTS = 3;

export class BinanceHttpError extends Error {
  readonly status: number;
  /** Binance error code from the `{code, msg}` body (e.g. -1121 Invalid symbol), if present. */
  readonly code: number | undefined;

  constructor(status: number, code: number | undefined, message: string) {
    super(message);
    this.name = 'BinanceHttpError';
    this.status = status;
    this.code = code;
  }
}

/** HTTP 451: Binance blocks the caller's region. Not retried, no fallback host. */
export class BinanceRegionError extends BinanceHttpError {
  constructor(code: number | undefined, message: string) {
    super(451, code, message);
    this.name = 'BinanceRegionError';
  }
}

/** The request outlived REQUEST_TIMEOUT_MS. Unlike AbortError (the caller's choice), it is retryable. */
export class BinanceTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Binance request timed out after ${timeoutMs} ms`);
    this.name = 'BinanceTimeoutError';
  }
}

const ErrorBodySchema = z.object({ code: z.number(), msg: z.string() });

async function toHttpError(response: Response): Promise<BinanceHttpError> {
  let code: number | undefined;
  let message = `Binance HTTP ${response.status}`;
  try {
    const body = ErrorBodySchema.safeParse(await response.json());
    if (body.success) {
      code = body.data.code;
      message = `${message}: ${body.data.msg}`;
    }
  } catch {
    // Body is not JSON (proxy or CDN error page): status alone is enough.
  }
  return response.status === 451
    ? new BinanceRegionError(code, message)
    : new BinanceHttpError(response.status, code, message);
}

/**
 * GET + JSON with a timeout combined with the caller's signal.
 * Manual combinator instead of `AbortSignal.timeout/any`: those exist in RN 0.88 (Hermes
 * polyfill in react-native/src/private/webapis/dom/abort-api/AbortSignal.js) but
 * `timeout` never clears its timer, `any` keeps listeners on the caller's signal, and
 * neither is driven by Jest fake timers. Here the timer and listener are always cleaned up.
 */
async function getJson(path: string, callerSignal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  const onCallerAbort = () => controller.abort(callerSignal?.reason);
  if (callerSignal?.aborted) {
    onCallerAbort();
  } else {
    callerSignal?.addEventListener('abort', onCallerAbort);
  }

  try {
    const response = await fetch(`${REST_BASE}${path}`, { signal: controller.signal });
    if (!response.ok) throw await toHttpError(response);
    return await response.json();
  } catch (error) {
    if (timedOut && !callerSignal?.aborted) throw new BinanceTimeoutError(REQUEST_TIMEOUT_MS);
    throw error;
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener('abort', onCallerAbort);
  }
}

/**
 * 24h mini tickers in the REQUESTED order (Binance returns its own order).
 * A symbol missing from a 200 response is skipped, not an error: a partial snapshot still seeds
 * the rows it has and the live stream fills the rest. (An unknown symbol makes Binance answer
 * 400 -1121 for the whole request, which is thrown as BinanceHttpError.)
 */
export async function fetchTickers24h(
  symbols: readonly string[],
  signal?: AbortSignal,
): Promise<Ticker24h[]> {
  const upper = symbols.map((symbol) => symbol.toUpperCase());
  const query = encodeURIComponent(JSON.stringify(upper));
  const json = await getJson(`/api/v3/ticker/24hr?type=MINI&symbols=${query}`, signal);
  const tickers = z.array(Ticker24hSchema).parse(json);

  const bySymbol = new Map(tickers.map((ticker) => [ticker.symbol, ticker]));
  const ordered: Ticker24h[] = [];
  for (const symbol of upper) {
    const ticker = bySymbol.get(symbol);
    if (ticker) ordered.push(ticker);
  }
  return ordered;
}

/** Candles oldest first (Binance order). Strings become numbers here, at the boundary. */
export async function fetchKlines(
  symbol: string,
  interval: KlineInterval,
  limit = 500,
  signal?: AbortSignal,
): Promise<ChartCandle[]> {
  const query = `symbol=${encodeURIComponent(symbol.toUpperCase())}&interval=${interval}&limit=${limit}`;
  const json = await getJson(`/api/v3/klines?${query}`, signal);
  return z
    .array(KlineRowSchema)
    .parse(json)
    .map(([t, o, h, l, c, v]) => ({
      t,
      o: Number(o),
      h: Number(h),
      l: Number(l),
      c: Number(c),
      v: Number(v),
    }));
}

const ServerTimeSchema = z.object({ serverTime: z.number() });

export async function fetchServerTime(signal?: AbortSignal): Promise<number> {
  const json = await getJson('/api/v3/time', signal);
  return ServerTimeSchema.parse(json).serverTime;
}

function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError';
}

/**
 * TanStack `retry` option: `failureCount` is the number of failures so far, minus one
 * (0 after the first failure). Allows at most MAX_ATTEMPTS requests in total.
 * Retried: 429, 5xx, timeouts and network errors. Never: 451, other 4xx, AbortError
 * (the caller cancelled) and ZodError (a wrong-shape response will not fix itself).
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount + 1 >= MAX_ATTEMPTS) return false;
  if (error instanceof BinanceRegionError) return false;
  if (error instanceof BinanceHttpError) return error.status === 429 || error.status >= 500;
  if (error instanceof z.ZodError) return false;
  if (isAbortError(error)) return false;
  return true;
}
