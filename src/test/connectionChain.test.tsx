// One test of the whole connection chain, nothing in between is mocked except the edges:
//   AppState / NetInfo (jest mocks, driven by hand) -> useRealtimeLifecycle -> RealtimeClient
//   -> handleStatus (client.ts) -> useConnection store -> LiveConnectionBanner.
// Harness: the real `realtime` singleton from client.ts, with only the global WebSocket replaced by
// FakeSocket (the singleton's default createSocket does `new WebSocket(url)` at call time). This runs the
// production wiring (WS_URL, onStatus: handleStatus) instead of a re-assembled copy.
// The stale-banner scenario needs a client that does not hit its own 15 s heartbeat timeout before the
// banner's 30 s threshold, so it uses a fresh RealtimeClient with the same real handleStatus.
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { act, render, screen } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { KLINES_KEY, TICKERS_KEY } from '@/binance/queryKeys';
import { queryClient } from '@/queryClient';
import { handleStatus, realtime } from '@/realtime/client';
import { useRealtimeLifecycle } from '@/realtime/lifecycle';
import { RealtimeClient } from '@/realtime/RealtimeClient';
import { useConnection } from '@/store/connectionStore';
import { LiveConnectionBanner } from '@/ui/LiveConnectionBanner';

import { FakeSocket } from './FakeSocket';

// The first render in a cold worker (transform cache, Uniwind mock) is slow when the machine is busy.
jest.setTimeout(20_000);

function Harness({ client }: { client: RealtimeClient }) {
  useRealtimeLifecycle(client);
  return <LiveConnectionBanner />;
}

// currentState is a plain data property in the jest AppState mock (see lifecycle.test.tsx).
const originalCurrentState = AppState.currentState;
const setCurrentState = (value: string | null | undefined) =>
  Object.defineProperty(AppState, 'currentState', { value, configurable: true, writable: true });

let appStateHandler: (s: AppStateStatus) => void;
let netListener: (state: NetInfoState) => void;
const originalWebSocket = globalThis.WebSocket;

const setAppState = (s: AppStateStatus) =>
  act(async () => {
    appStateHandler(s);
  });
const setNet = (isConnected: boolean | null) =>
  act(async () => {
    netListener({ isConnected } as NetInfoState);
  });
const serverOpen = () =>
  act(async () => {
    FakeSocket.last().serverOpen();
  });
const advance = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

const banner = () => screen.queryByTestId('connection-banner');
const created = () => FakeSocket.instances.length;
const closedCount = () => FakeSocket.instances.filter((s) => s.closedWith !== null).length;

let invalidate: jest.SpyInstance;

beforeEach(() => {
  jest.useFakeTimers();
  FakeSocket.instances = [];
  globalThis.WebSocket = FakeSocket as unknown as typeof WebSocket;
  setCurrentState('active');
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    appStateHandler = handler;
    return { remove: jest.fn() };
  });
  jest.mocked(NetInfo.addEventListener).mockClear();
  jest.mocked(NetInfo.addEventListener).mockImplementation((listener) => {
    netListener = listener;
    return jest.fn();
  });
  invalidate = jest.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
  useConnection.setState({ status: 'idle', attempt: 0, lastMessageAt: null });
});

afterEach(async () => {
  // The singleton outlives the tree: stop it inside act (fake timers still installed) so a still-mounted
  // banner sees the store write without an act() warning and no reconnect timer leaks into the next test.
  await act(async () => {
    realtime.stop('idle');
  });
  jest.restoreAllMocks();
  jest.useRealTimers();
  globalThis.WebSocket = originalWebSocket;
  setCurrentState(originalCurrentState);
});

describe('connection chain: lifecycle -> RealtimeClient -> handleStatus -> store -> banner', () => {
  it('mounts active and online: connects, shows "Connecting", then no banner once open', async () => {
    await render(<Harness client={realtime} />);

    expect(created()).toBe(1);
    expect(FakeSocket.last().url).toBe('wss://data-stream.binance.vision/stream');
    expect(useConnection.getState().status).toBe('connecting');
    expect(screen.getByText('Connecting')).toBeOnTheScreen();

    await serverOpen();

    expect(useConnection.getState().status).toBe('open');
    expect(banner()).not.toBeOnTheScreen();
  });

  it('offline shows "No internet" and closes the socket; back online reconnects and refetches data', async () => {
    await render(<Harness client={realtime} />);
    await serverOpen();
    const first = FakeSocket.last();
    expect(banner()).not.toBeOnTheScreen();
    // `everOpened` in client.ts is module state shared by all tests: whether the first open above invalidated
    // depends on test order, so only what follows is asserted (a later return to `open` always invalidates).
    invalidate.mockClear();

    await setNet(false);

    expect(first.closedWith).toEqual({ code: 1000, reason: undefined });
    expect(useConnection.getState().status).toBe('offline');
    expect(screen.getByText('No internet')).toBeOnTheScreen();
    expect(created()).toBe(1);
    expect(invalidate).not.toHaveBeenCalled();

    await setNet(true);

    expect(created()).toBe(2);
    expect(FakeSocket.last()).not.toBe(first);
    expect(screen.getByText('Connecting')).toBeOnTheScreen();

    await serverOpen();

    expect(useConnection.getState().status).toBe('open');
    expect(banner()).not.toBeOnTheScreen();
    // handleStatus: a return to `open` after the first one invalidates klines and tickers.
    expect(invalidate).toHaveBeenCalledWith({ queryKey: KLINES_KEY });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: TICKERS_KEY });
  });

  it('background closes the socket without a banner; returning to active opens a new one', async () => {
    await render(<Harness client={realtime} />);
    await serverOpen();
    const first = FakeSocket.last();

    await setAppState('background');

    expect(first.closedWith?.code).toBe(1000);
    expect(useConnection.getState().status).toBe('idle');
    expect(banner()).not.toBeOnTheScreen();
    expect(created()).toBe(1);

    await setAppState('active');

    expect(created()).toBe(2);
    expect(screen.getByText('Connecting')).toBeOnTheScreen();

    await serverOpen();

    expect(useConnection.getState().status).toBe('open');
    expect(banner()).not.toBeOnTheScreen();
  });

  it('inactive (iOS shade, call) keeps the socket and the banner state untouched', async () => {
    await render(<Harness client={realtime} />);
    await serverOpen();

    await setAppState('inactive');

    expect(created()).toBe(1);
    expect(closedCount()).toBe(0);
    expect(useConnection.getState().status).toBe('open');
    expect(banner()).not.toBeOnTheScreen();
  });

  it('offline -> background -> active without network stays offline: "No internet", no new socket', async () => {
    await render(<Harness client={realtime} />);
    await serverOpen();
    await setNet(false);
    expect(screen.getByText('No internet')).toBeOnTheScreen();

    await setAppState('background');

    expect(useConnection.getState().status).toBe('idle');
    expect(banner()).not.toBeOnTheScreen();

    await setAppState('active');

    expect(useConnection.getState().status).toBe('offline');
    expect(screen.getByText('No internet')).toBeOnTheScreen();
    expect(created()).toBe(1);

    await setNet(true);

    expect(created()).toBe(2);
    await serverOpen();
    expect(useConnection.getState().status).toBe('open');
    expect(banner()).not.toBeOnTheScreen();
  });

  it('going offline while in background stays idle (no banner) and does not reconnect', async () => {
    await render(<Harness client={realtime} />);
    await serverOpen();
    await setAppState('background');

    await setNet(false);

    expect(useConnection.getState().status).toBe('idle');
    expect(banner()).not.toBeOnTheScreen();
    expect(created()).toBe(1);
  });

  it('a dropped socket shows "Reconnecting (attempt 1)", then the backoff timer opens a new socket', async () => {
    await render(<Harness client={realtime} />);
    await serverOpen();
    const first = FakeSocket.last();

    // The flip open -> reconnecting is driven from the act callback, not from inside advanceTimersByTime:
    // doing it inside advanceTimersByTime made this test hang (observed; the cause is not confirmed,
    // possibly the banner's 1 s useNow interval being cleared from within a fake-timer callback).
    await act(async () => {
      first.serverClose(1006);
    });

    expect(useConnection.getState()).toMatchObject({ status: 'reconnecting', attempt: 1 });
    expect(screen.getByText('Reconnecting (attempt 1)')).toBeOnTheScreen();
    expect(created()).toBe(1);

    await advance(500); // full-jitter delay of the first attempt is below 500 ms

    expect(created()).toBe(2);
    expect(screen.getByText('Reconnecting (attempt 1)')).toBeOnTheScreen();

    invalidate.mockClear();

    await serverOpen();

    expect(useConnection.getState().status).toBe('open');
    expect(banner()).not.toBeOnTheScreen();
    // handleStatus: a return to `open` after a drop invalidates klines and tickers.
    expect(invalidate).toHaveBeenCalledWith({ queryKey: KLINES_KEY });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: TICKERS_KEY });
  });

  it('unmount stops the client: socket closed, store idle', async () => {
    const { unmount } = await render(<Harness client={realtime} />);
    await serverOpen();
    const first = FakeSocket.last();

    await unmount();

    expect(first.closedWith?.code).toBe(1000);
    expect(useConnection.getState().status).toBe('idle');
  });

  it('a fresh message clears "Data is stale" on an open connection', async () => {
    // Same wiring (real handleStatus), but the client's own dead-socket timeout is pushed past the banner's 30 s.
    const client = new RealtimeClient({
      url: 'wss://data-stream.binance.vision/stream',
      createSocket: (url) => new FakeSocket(url) as unknown as WebSocket,
      onStatus: handleStatus,
      probeAfterMs: 300_000,
      staleAfterMs: 600_000,
    });
    const listener = jest.fn();
    client.subscribe('btcusdt@miniTicker', listener);
    await render(<Harness client={client} />);
    await serverOpen();
    expect(banner()).not.toBeOnTheScreen();

    await advance(31_000);

    expect(useConnection.getState().status).toBe('open');
    expect(screen.getByText('Data is stale')).toBeOnTheScreen();

    await act(async () => {
      FakeSocket.last().serverSend({ stream: 'btcusdt@miniTicker', data: { c: '1' } });
    });

    expect(listener).toHaveBeenCalledWith({ c: '1' });
    expect(useConnection.getState().lastMessageAt).toBe(Date.now());
    expect(banner()).not.toBeOnTheScreen();

    await advance(25_000); // still fresh: 25 s since the message

    expect(banner()).not.toBeOnTheScreen();
  });
});
