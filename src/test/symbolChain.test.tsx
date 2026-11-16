// The symbol screen over the production chain, only the edges are replaced.
//   FakeSocket (global WebSocket) -> real `realtime` singleton (client.ts, handleStatus) -> useKlineStream
//   -> the app's real `queryClient` singleton (handleStatus invalidates it) -> useKlines -> SymbolScreen.
// Fetch is mocked at the network edge, so the real fetchKlines/Zod path runs. Skia/Reanimated do not exist
// in Jest: only the chart canvas (CandleChart) is a stub that records its renders.
// Already covered elsewhere and not repeated here: the hooks in isolation (useKlines.test.tsx: gap -> refetch,
// invalidation -> refetch), handleStatus invalidating on reconnect (client.test.ts, connectionChain.test.tsx),
// refcounted SUBSCRIBE/UNSUBSCRIBE (RealtimeClient tests). This file proves the pieces work together.
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Text as MockText } from 'react-native';

import SymbolScreen from '@/app/symbol/[symbol]';
import { kline, klineRow } from '@/binance/fixtures';
import { klinesKey } from '@/binance/queryKeys';
import type { ChartCandle } from '@/chart/types';
import { measureRenders } from '@/dev/renderStats';
import { queryClient } from '@/queryClient';
import { realtime } from '@/realtime/client';
import { useConnection } from '@/store/connectionStore';
import { useQuotes } from '@/store/quotesStore';

import { FakeSocket } from './FakeSocket';

jest.setTimeout(20_000);

const mockCandleChart = jest.fn();
jest.mock('@/features/symbol/CandleChart', () => ({
  CandleChart: (props: { candles: { t: number }[] }) => {
    mockCandleChart(props);
    return <MockText testID="candle-chart-mock">{`candles:${props.candles.length}`}</MockText>;
  },
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  Stack: { Screen: () => null },
}));

const MIN = 60_000;
const T0 = 1_794_471_600_000; // a minute boundary
const STREAM = 'btcusdt@kline_1m';

const originalFetch = globalThis.fetch;
const originalWebSocket = globalThis.WebSocket;
const fetchMock = jest.fn<Promise<Response>, [input: RequestInfo | URL, init?: RequestInit]>();

// A REST kline row (real fixture shape) moved onto minute `i`, closing at `close`.
const row = (i: number, close = 100 + i) => [T0 + i * MIN, '100', '200', '50', String(close), '1', T0 + i * MIN + 59_999, ...klineRow.slice(7)];
// REST history: minutes 0..n-1.
let historyLength = 3;
const klineCalls = () => fetchMock.mock.calls.filter(([url]) => String(url).includes('/klines'));

// A kline event of the combined stream, moved onto minute `i`.
const klineEnvelope = (i: number, close: string) => ({
  stream: STREAM,
  data: { ...kline, k: { ...kline.k, t: T0 + i * MIN, c: close } },
});

const advance = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });
const serverOpen = () =>
  act(async () => {
    FakeSocket.last().serverOpen();
  });
// TanStack batches observer notifications with setTimeout(0): advance 1 ms so the screen sees the new data.
const serverSend = (msg: unknown) =>
  act(async () => {
    FakeSocket.last().serverSend(msg);
    jest.advanceTimersByTime(1);
  });

type Control = { method: string; params?: string[] };
const controls = (socket: FakeSocket, method: string) =>
  (socket.sent as Control[]).filter((m) => m.method === method);
const cached = () => queryClient.getQueryData<ChartCandle[]>(klinesKey('BTCUSDT', '1m'));
const hasNoHoles = (list: ChartCandle[] | undefined) =>
  list !== undefined && list.every((c, i) => i === 0 || c.t - list[i - 1]!.t === MIN);

const renderScreen = async () => {
  const view = await render(
    <QueryClientProvider client={queryClient}>
      <SymbolScreen />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('candle-chart-mock')).toBeOnTheScreen());
  await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  return view;
};

// Opens the app's socket like the lifecycle hook does and lets the subscription flush out (250 ms gate).
// `everOpened` in client.ts is module state shared by the tests of this file: depending on test order the first
// open here already counts as a reconnect and refetches the history. Waiting for the fetch to settle makes the
// start state the same either way (history of `historyLength` candles, nothing in flight).
const connect = async () => {
  realtime.start();
  await serverOpen();
  await advance(300);
  await waitFor(() => expect(queryClient.isFetching()).toBe(0));
};

beforeEach(() => {
  jest.useFakeTimers();
  FakeSocket.instances = [];
  globalThis.WebSocket = FakeSocket as unknown as typeof WebSocket;
  historyLength = 3;
  fetchMock.mockReset();
  fetchMock.mockImplementation((input) => {
    const url = String(input);
    if (!url.includes('/klines')) return Promise.reject(new Error(`unexpected request: ${url}`));
    const rows = Array.from({ length: historyLength }, (_, i) => row(i));
    return Promise.resolve(
      new Response(JSON.stringify(rows), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
  });
  globalThis.fetch = fetchMock;
  mockCandleChart.mockClear();
  useQuotes.setState(useQuotes.getInitialState(), true);
  useConnection.setState({ status: 'idle', attempt: 0, lastMessageAt: null });
  queryClient.clear();
  queryClient.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } });
  jest.mocked(useLocalSearchParams).mockReturnValue({ symbol: 'btcusdt' });
});

afterEach(async () => {
  await act(async () => {
    realtime.stop('idle');
  });
  jest.useRealTimers();
  globalThis.fetch = originalFetch;
  globalThis.WebSocket = originalWebSocket;
  queryClient.clear();
});

describe('kline subscription lifecycle and resync over the real chain', () => {
  it('SUBSCRIBE btcusdt@kline_1m while the screen is open, UNSUBSCRIBE after leaving it', async () => {
    const { unmount } = await renderScreen();
    await connect();
    const socket = FakeSocket.last();

    expect(controls(socket, 'SUBSCRIBE')).toEqual([{ method: 'SUBSCRIBE', params: [STREAM], id: expect.any(Number) }]);
    expect(controls(socket, 'UNSUBSCRIBE')).toHaveLength(0);

    await unmount(); // navigate away
    await advance(300);

    expect(controls(socket, 'UNSUBSCRIBE')).toEqual([{ method: 'UNSUBSCRIBE', params: [STREAM], id: expect.any(Number) }]);
    expect(socket.closedWith).toBeNull(); // the connection stays: only the stream is dropped
  });

  it('a screen mounted before the socket opens subscribes once it is open; leaving before open sends nothing', async () => {
    const { unmount } = await renderScreen();
    realtime.start();
    await unmount(); // left before the socket opened: the desired set is empty again
    await serverOpen();
    await advance(300);

    const socket = FakeSocket.last();
    expect(controls(socket, 'SUBSCRIBE')).toHaveLength(0);
    expect(controls(socket, 'UNSUBSCRIBE')).toHaveLength(0);
  });

  it('live candles reach the screen through the socket: replace the last one, then append the next', async () => {
    await renderScreen();
    await connect();
    expect(cached()).toHaveLength(3);

    await serverSend(klineEnvelope(2, '777')); // same minute as the last history candle
    expect(cached()).toHaveLength(3);
    expect(cached()?.at(-1)?.c).toBe(777);

    await serverSend(klineEnvelope(3, '800')); // the next minute
    expect(cached()).toHaveLength(4);
    expect(cached()?.at(-1)).toMatchObject({ t: T0 + 3 * MIN, c: 800 });
    expect(screen.getByText('candles:4')).toBeOnTheScreen();
    expect(hasNoHoles(cached())).toBe(true);
  });

  it('after a dropped connection (airplane mode) the history is refetched, the stream resubscribed, no holes', async () => {
    await renderScreen();
    await connect();
    await serverSend(klineEnvelope(3, '800'));
    expect(cached()).toHaveLength(4);
    const callsBefore = klineCalls().length;
    const first = FakeSocket.last();

    // Offline for two more minutes: the server has candles 0..5, the client saw only 0..3.
    historyLength = 6;
    await act(async () => {
      first.serverClose(1006);
    });
    expect(useConnection.getState().status).toBe('reconnecting');
    await advance(500);
    expect(FakeSocket.instances).toHaveLength(2);
    await serverOpen();

    // Resync: the klines query was invalidated by handleStatus and its observer (the screen) refetched.
    await waitFor(() => expect(klineCalls()).toHaveLength(callsBefore + 1));
    await waitFor(() => expect(cached()).toHaveLength(6));
    expect(hasNoHoles(cached())).toBe(true);
    expect(await screen.findByText('candles:6')).toBeOnTheScreen();

    // The new socket resubscribes the stream (the flush after open), once.
    await advance(300);
    const second = FakeSocket.last();
    expect(second).not.toBe(first);
    expect(controls(second, 'SUBSCRIBE')).toEqual([{ method: 'SUBSCRIBE', params: [STREAM], id: expect.any(Number) }]);

    // The live candle merges into the refetched list: no hole, no duplicate.
    await serverSend(klineEnvelope(5, '900')); // current minute: replaces the last
    expect(cached()).toHaveLength(6);
    expect(cached()?.at(-1)?.c).toBe(900);
    await serverSend(klineEnvelope(6, '910')); // next minute: appended
    expect(cached()).toHaveLength(7);
    expect(hasNoHoles(cached())).toBe(true);
    expect(klineCalls()).toHaveLength(callsBefore + 1); // no further refetch: the merge was seamless
  });
});

describe('the chart does not re-render for anything but new candles', () => {
  // Gestures run on the UI thread (shared values) and cannot be driven from Jest: that part is checked with the
  // React Profiler on a device. What is pinned here is the JS side that could re-render the chart during them:
  // the ticker header (PriceHeader is its own component, so a tick never reaches the chart's parent).
  const renderPrice = (n: number) =>
    act(async () => {
      useQuotes.getState().applyBatch(
        new Map([
          ['BTCUSDT', { symbol: 'BTCUSDT', eventTime: n, last: String(100 + n), open: '100', high: '200', low: '50', quoteVolume: '1' }],
        ]),
      );
    });

  it('ticker updates re-render the screen but not the chart', async () => {
    await renderScreen();
    await connect();
    await renderPrice(1);
    expect(screen.getByText('101.000')).toBeOnTheScreen();
    mockCandleChart.mockClear();

    const measured = measureRenders(1);
    for (let n = 2; n <= 6; n++) {
      await renderPrice(n);
      await advance(200);
    }
    await advance(1_000);
    const { rowRendersPerSec } = await measured;

    expect(screen.getByText('106.000')).toBeOnTheScreen(); // SymbolContent did re-render
    expect({ chartRenders: rowRendersPerSec }).toEqual({ chartRenders: 0 }); // <Counted id="chart">
    expect(mockCandleChart).not.toHaveBeenCalled(); // and the component body did not run
  });

  it('a live update of the current candle re-renders the chart exactly once (the counter is not vacuous)', async () => {
    await renderScreen();
    await connect();
    mockCandleChart.mockClear();

    const measured = measureRenders(1);
    await serverSend(klineEnvelope(2, '777'));
    await advance(1_000);
    const { rowRendersPerSec } = await measured;

    expect(rowRendersPerSec).toBe(1);
    expect(mockCandleChart).toHaveBeenCalledTimes(1);
    expect(mockCandleChart.mock.calls[0]?.[0].candles.at(-1).c).toBe(777);
  });

  it('a new candle re-renders the chart once, interleaved ticker updates add none', async () => {
    await renderScreen();
    await connect();
    mockCandleChart.mockClear();

    const measured = measureRenders(1);
    await renderPrice(1);
    await serverSend(klineEnvelope(3, '800'));
    await renderPrice(2);
    await advance(1_000);
    const { rowRendersPerSec } = await measured;

    expect(rowRendersPerSec).toBe(1);
    expect(mockCandleChart).toHaveBeenCalledTimes(1);
    expect(screen.getByText('candles:4')).toBeOnTheScreen();
  });
});
