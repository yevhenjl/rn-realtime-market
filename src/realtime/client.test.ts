import type { ConnectionSnapshot } from './RealtimeClient';

// client.ts keeps a module-level `everOpened` flag: load a fresh copy of every module per test.
function load() {
  jest.resetModules();
  const client = jest.requireActual<typeof import('./client')>('./client');
  const { useConnection } = jest.requireActual<typeof import('@/store/connectionStore')>('@/store/connectionStore');
  const { queryClient } = jest.requireActual<typeof import('@/queryClient')>('@/queryClient');
  const { KLINES_KEY, TICKERS_KEY } = jest.requireActual<typeof import('@/binance/queryKeys')>('@/binance/queryKeys');
  const { metrics } = jest.requireActual<typeof import('@/dev/metrics')>('@/dev/metrics');
  const invalidate = jest.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
  return { ...client, useConnection, invalidate, KLINES_KEY, TICKERS_KEY, metrics };
}

const snap = (status: ConnectionSnapshot['status'], attempt = 0, lastMessageAt: number | null = null) => ({
  status,
  attempt,
  lastMessageAt,
});

test('realtime is an idle RealtimeClient; importing does not open a socket', () => {
  const WebSocketSpy = jest.fn();
  const original = globalThis.WebSocket;
  globalThis.WebSocket = WebSocketSpy as unknown as typeof WebSocket;
  try {
    const { realtime } = load();
    expect(realtime.getSnapshot().status).toBe('idle');
    expect(WebSocketSpy).not.toHaveBeenCalled();
  } finally {
    globalThis.WebSocket = original;
  }
});

test('handleStatus writes the snapshot into the connection store', () => {
  const { handleStatus, useConnection } = load();
  handleStatus(snap('connecting'));
  expect(useConnection.getState()).toEqual(snap('connecting'));
  handleStatus(snap('open', 0, 42));
  expect(useConnection.getState()).toEqual(snap('open', 0, 42));
});

test('first connect (idle -> connecting -> open) does not invalidate', () => {
  const { handleStatus, invalidate } = load();
  handleStatus(snap('connecting'));
  handleStatus(snap('open', 0, 1));
  expect(invalidate).not.toHaveBeenCalled();
});

test('open -> reconnecting -> open invalidates klines and tickers once each', () => {
  const { handleStatus, invalidate, KLINES_KEY, TICKERS_KEY } = load();
  handleStatus(snap('connecting'));
  handleStatus(snap('open', 0, 1));
  handleStatus(snap('reconnecting', 1, 1));
  handleStatus(snap('reconnecting', 2, 1)); // attempt changes, status does not
  handleStatus(snap('open', 2, 2));
  expect(invalidate).toHaveBeenCalledTimes(2);
  expect(invalidate).toHaveBeenCalledWith({ queryKey: KLINES_KEY });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: TICKERS_KEY });
});

test('periodic snapshots while open do not invalidate', () => {
  const { handleStatus, invalidate } = load();
  handleStatus(snap('connecting'));
  handleStatus(snap('open', 0, 1));
  handleStatus(snap('open', 0, 2));
  handleStatus(snap('open', 0, 3));
  expect(invalidate).not.toHaveBeenCalled();
});

test('return from offline or idle after a first open invalidates', () => {
  const { handleStatus, invalidate } = load();
  handleStatus(snap('connecting'));
  handleStatus(snap('open', 0, 1));
  handleStatus(snap('offline'));
  handleStatus(snap('connecting'));
  handleStatus(snap('open', 0, 2));
  expect(invalidate).toHaveBeenCalledTimes(2);

  invalidate.mockClear();
  handleStatus(snap('idle'));
  handleStatus(snap('connecting'));
  handleStatus(snap('open', 0, 3));
  expect(invalidate).toHaveBeenCalledTimes(2);
});

test('a failed first attempt (connecting -> reconnecting -> open) is still the first open: no invalidation', () => {
  const { handleStatus, invalidate } = load();
  handleStatus(snap('connecting'));
  handleStatus(snap('reconnecting', 1));
  handleStatus(snap('open', 1, 1));
  expect(invalidate).not.toHaveBeenCalled();
});

test('handleError warns in dev with the error message', () => {
  const { handleError } = load();
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  handleError(new Error('boom'));
  expect(warn).toHaveBeenCalledWith('[realtime]', 'boom');
  warn.mockRestore();
});

describe('metrics.reconnects', () => {
  test('counts transitions into reconnecting, not every snapshot while reconnecting', () => {
    const { handleStatus, metrics } = load();
    handleStatus(snap('connecting'));
    handleStatus(snap('open', 0, 1));
    expect(metrics.reconnects).toBe(0);

    handleStatus(snap('reconnecting', 1, 1));
    handleStatus(snap('reconnecting', 2, 1)); // attempt changes, status does not
    handleStatus(snap('reconnecting', 2, 1)); // periodic snapshot
    expect(metrics.reconnects).toBe(1);

    handleStatus(snap('open', 2, 2));
    handleStatus(snap('reconnecting', 1, 2));
    expect(metrics.reconnects).toBe(2);
  });

  test('offline, idle, connecting and open do not count', () => {
    const { handleStatus, metrics } = load();
    handleStatus(snap('connecting'));
    handleStatus(snap('open', 0, 1));
    handleStatus(snap('offline'));
    handleStatus(snap('connecting'));
    handleStatus(snap('open', 0, 2));
    handleStatus(snap('idle'));
    expect(metrics.reconnects).toBe(0);
  });
});

describe('syncClock', () => {
  const originalFetch = globalThis.fetch;
  const fetchMock = jest.fn<Promise<Response>, [input: RequestInfo | URL, init?: RequestInit]>();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000);
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => {
    jest.useRealTimers();
    fetchMock.mockReset();
    globalThis.fetch = originalFetch;
  });

  test('sets clockOffsetMs from the NTP midpoint: serverTime - (sentAt + receivedAt) / 2', async () => {
    const { syncClock, metrics } = load();
    fetchMock.mockImplementation(async () => {
      jest.setSystemTime(1_100); // the request took 100 ms
      return new Response(JSON.stringify({ serverTime: 1_350 }), { status: 200 });
    });

    metrics.latency.push(900, 950); // taken with the uncorrected clock
    await syncClock();

    expect(fetchMock.mock.calls[0]![0]).toContain('/api/v3/time');
    expect(metrics.clockOffsetMs).toBe(300);
    expect(metrics.latency).toEqual([]);
  });

  test('swallows network errors and keeps the offset', async () => {
    const { syncClock, metrics } = load();
    metrics.clockOffsetMs = 7;
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));

    metrics.latency.push(42);
    await expect(syncClock()).resolves.toBeUndefined();

    expect(metrics.clockOffsetMs).toBe(7);
    expect(metrics.latency).toEqual([42]); // a failed sync keeps the samples
  });

  test('swallows HTTP errors and malformed bodies', async () => {
    const { syncClock, metrics } = load();
    fetchMock.mockResolvedValueOnce(new Response('nope', { status: 451 }));
    await expect(syncClock()).resolves.toBeUndefined();
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ time: 1 }), { status: 200 }));
    await expect(syncClock()).resolves.toBeUndefined();
    expect(metrics.clockOffsetMs).toBe(0);
  });

  test('with samples > 1: discards the warm-up request and keeps the shortest round trip', async () => {
    const { syncClock, metrics } = load();
    // [round trip ms, serverTime at receive - midpoint offset]: the cold first request is far off.
    const replies = [
      { rtt: 1_200, offset: 500 }, // warm-up: DNS + TCP + TLS, discarded although its RTT is not the worst
      { rtt: 300, offset: -400 },
      { rtt: 80, offset: -460 },
      { rtt: 150, offset: -430 },
    ];
    let call = 0;
    fetchMock.mockImplementation(async () => {
      const { rtt, offset } = replies[call++]!;
      const sentAt = Date.now();
      jest.setSystemTime(sentAt + rtt);
      return new Response(JSON.stringify({ serverTime: sentAt + rtt / 2 + offset }), { status: 200 });
    });

    metrics.latency.push(900);
    await syncClock(undefined, 4);

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(metrics.clockOffsetMs).toBe(-460);
    expect(metrics.latency).toEqual([]);
  });

  test('with samples > 1: a failed request keeps the old offset', async () => {
    const { syncClock, metrics } = load();
    metrics.clockOffsetMs = 7;
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ serverTime: 1 }), { status: 200 }))
      .mockRejectedValueOnce(new TypeError('Network request failed'));

    await expect(syncClock(undefined, 3)).resolves.toBeUndefined();
    expect(metrics.clockOffsetMs).toBe(7);
  });

  test('an aborted sync does not write the offset', async () => {
    const { syncClock, metrics } = load();
    const controller = new AbortController();
    fetchMock.mockImplementation(async () => {
      controller.abort();
      return new Response(JSON.stringify({ serverTime: 5_000 }), { status: 200 });
    });

    await syncClock(controller.signal);

    expect(metrics.clockOffsetMs).toBe(0);
  });
});
