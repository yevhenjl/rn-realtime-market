// The app's single RealtimeClient. Not pure on purpose: it wires the client to the Zustand store and
// TanStack Query. It does not connect on import; the lifecycle hook owns start()/stop().
import { KLINES_KEY, TICKERS_KEY } from '@/binance/queryKeys';
import { fetchServerTime } from '@/binance/rest';
import { WS_URL } from '@/config';
import { bestClockOffset, type ClockSample, increment, metrics, recordHandlerMs } from '@/dev/metrics';
import { queryClient } from '@/queryClient';
import { useConnection } from '@/store/connectionStore';

import { RealtimeClient, type ConnectionSnapshot } from './RealtimeClient';

// True once the connection has been open at least once in this app run.
let everOpened = false;

/**
 * Writes the snapshot into the store and refetches data that may have a gap.
 * Rule (design §6): every return to `open` after the first one invalidates klines and the ticker snapshot.
 * Then `prev` is `connecting` or `reconnecting` (offline/idle always pass through `connecting` first).
 * The first connect of the app does not invalidate: the screens fetch on mount.
 * `prev !== 'open'` keeps the periodic once-a-second snapshots while open from refetching.
 * Invalidating a query without observers is free (no fetch).
 */
export function handleStatus(snapshot: ConnectionSnapshot): void {
  const prev = useConnection.getState().status;
  useConnection.setState(snapshot);
  // Count the transition only: periodic snapshots while reconnecting (attempt changes) are not new reconnects.
  if (snapshot.status === 'reconnecting' && prev !== 'reconnecting') increment('reconnects');
  if (snapshot.status !== 'open') return;
  if (everOpened && prev !== 'open') {
    void queryClient.invalidateQueries({ queryKey: KLINES_KEY });
    void queryClient.invalidateQueries({ queryKey: TICKERS_KEY });
  }
  everOpened = true;
}

export function handleError(e: Error): void {
  if (__DEV__) console.warn('[realtime]', e.message);
}

/**
 * Measures the phone clock's offset from Binance's (GET /api/v3/time, NTP-style midpoint) for the
 * latency metric. Call once at startup. Any failure is swallowed: latency is then shown uncorrected.
 *
 * With `samples > 1` the first request is a warm-up and is discarded: it pays DNS + TCP + TLS before the
 * server sees it, so its midpoint is off by hundreds of ms (measured on the M23: latency read ~0.85 s
 * instead of ~0.3 s). The rest reuse the kept-alive connection; the shortest round trip wins.
 */
export async function syncClock(signal?: AbortSignal, samples = 1): Promise<void> {
  try {
    const taken: ClockSample[] = [];
    for (let i = 0; i < samples; i++) {
      const sentAt = Date.now();
      const serverTime = await fetchServerTime(signal);
      if (signal?.aborted) return;
      if (samples > 1 && i === 0) continue; // warm-up
      taken.push({ sentAt, serverTime, receivedAt: Date.now() });
    }
    const offset = bestClockOffset(taken);
    if (offset === null) return;
    metrics.clockOffsetMs = offset;
    metrics.latency.length = 0; // samples taken before the sync used the uncorrected clock
  } catch {
    // offline, region block, timeout or abort: keep the previous offset (0 at startup)
  }
}

export const realtime = new RealtimeClient({
  url: WS_URL,
  onStatus: handleStatus,
  onError: handleError,
  onMessage: (handlerMs) => {
    increment('messages');
    recordHandlerMs(handlerMs);
  },
});
