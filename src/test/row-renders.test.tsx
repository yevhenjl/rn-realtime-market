// After mounting, a watchlist row never re-renders because of ticks.
//
// Path of the ticks: the whole production chain, only the edges are replaced.
//   FakeSocket (global WebSocket) -> real `realtime` singleton (client.ts) -> useWatchlistStream (Zod, conflator
//   with its 200 ms timer on fake timers) -> real useQuotes.applyBatch -> TickerRow's transient subscription.
// The real watchlist screen is rendered, so the rows sit inside the same <Counted> / <Profiler> wrappers as in
// production; the counters are the production ones (src/dev/renderStats.tsx, `measureRenders` = the dev
// "Measure" button). Skia's native module does not exist in Jest: only the sparkline canvas is a stub.
//
// The test must FAIL if a row subscribes to the store during render (useQuotes selector, useState for the
// price): the first test is the requirement; the second proves the counter notices such a row.
// Not visible here: Reanimated's settled-animation sync (static flag FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS)
// lives only in the native build; it is off via package.json, pinned by src/test/reanimatedFlags.test.ts.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react-native';

import HomeScreen from '@/app/index';
import { klineRow } from '@/binance/fixtures';
import { WATCHLIST } from '@/config';
import { Counted, measureRenders } from '@/dev/renderStats';
import { formatPrice } from '@/features/watchlist/format';
import { realtime } from '@/realtime/client';
import { useQuotes } from '@/store/quotesStore';

import { FakeSocket } from './FakeSocket';

jest.mock('@/features/watchlist/Sparkline', () => ({ Sparkline: () => null }));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  Stack: { Screen: () => null },
}));

jest.setTimeout(30_000);

// 20 rounds of 20 miniTickers, one round per STEP_MS. STEP_MS > the conflator's 200 ms flush, so each round
// is exactly one store notification. The spec's 60 s of ticks cost 30-45 s of CI time (fake rAF frames for 20
// animating rows); the render count does not depend on the window length, only on whether a row subscribes.
const ROUNDS = 20;
const STEP_MS = 250;
const WINDOW_S = (ROUNDS * STEP_MS) / 1000;

const originalFetch = globalThis.fetch;
const originalWebSocket = globalThis.WebSocket;
const fetchMock = jest.fn<Promise<Response>, [input: RequestInfo | URL, init?: RequestInit]>();

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

const snapshotRow = (symbol: string, i: number) => ({
  symbol,
  openPrice: '100.00',
  highPrice: '130.00',
  lowPrice: '90.00',
  lastPrice: `${110 + i}.00`,
  volume: '10.00',
  quoteVolume: '1000.00',
  openTime: 1_000,
  closeTime: 2_000 + i,
});

const advance = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

const cellText = (testID: string): string =>
  screen.getByTestId(testID).props.jestAnimatedProps.value.text;

// Price of symbol index k in tick round r: it moves up and down per symbol. Every 5th round repeats the
// previous round's values with a new event time (the store re-emits equal values). Symbols with
// (k + 3) % 7 === 0 never change price: they only receive same-value ticks (intentional coverage).
const priceAt = (k: number, round: number): string => {
  const r = round % 5 === 0 ? round - 1 : round;
  return (110 + k + ((r * (k + 3)) % 7) * 0.5).toFixed(2);
};

// One miniTicker envelope per symbol, as Binance sends it on the combined stream.
const sendRound = (round: number) =>
  act(async () => {
    const socket = FakeSocket.last();
    WATCHLIST.forEach((symbol, k) => {
      const last = priceAt(k, round);
      socket.serverSend({
        stream: `${symbol.toLowerCase()}@miniTicker`,
        data: {
          e: '24hrMiniTicker',
          E: Date.now(),
          s: symbol,
          c: last,
          o: '100.00',
          h: '130.00',
          l: '90.00',
          v: '10.00',
          q: '1000.00',
        },
      });
    });
  });

describe('rows do not render on ticks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.useFakeTimers();
    FakeSocket.instances = [];
    globalThis.WebSocket = FakeSocket as unknown as typeof WebSocket;
    // gcTime: Infinity - no garbage-collection timer, so Jest can exit.
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    useQuotes.setState(useQuotes.getInitialState(), true);
    fetchMock.mockReset();
    fetchMock.mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/ticker/24hr')) return Promise.resolve(jsonResponse(WATCHLIST.map(snapshotRow)));
      if (url.includes('/klines')) return Promise.resolve(jsonResponse([klineRow]));
      return Promise.reject(new Error(`unexpected request: ${url}`));
    });
    globalThis.fetch = fetchMock;
  });

  afterEach(async () => {
    realtime.stop();
    // Inside act: a row from the guard test may still be mounted and subscribed.
    await act(async () => {
      useQuotes.setState(useQuotes.getInitialState(), true);
    });
    jest.useRealTimers();
    globalThis.fetch = originalFetch;
    globalThis.WebSocket = originalWebSocket;
    queryClient.clear();
  });

  it(`0 row renders over ${ROUNDS} tick rounds (${WINDOW_S} s), while the prices on screen change`, async () => {
    await render(
      <QueryClientProvider client={queryClient}>
        <HomeScreen />
      </QueryClientProvider>,
    );
    // Mount settled: the snapshot is in the store and every row's sparkline query has resolved.
    await waitFor(() => expect(useQuotes.getState().bySymbol.BTCUSDT).toBeDefined());
    await waitFor(() =>
      expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('/klines'))).toHaveLength(
        WATCHLIST.length,
      ),
    );
    expect(screen.getAllByTestId(/^row-/)).toHaveLength(WATCHLIST.length);

    // The real client connects (the lifecycle hook is not part of the screen) and subscribes the 20 streams.
    realtime.start();
    await act(async () => {
      FakeSocket.last().serverOpen();
    });
    await advance(1_000); // sparkline renders, flashes and trend timings finish

    const before = WATCHLIST.map((_, k) => cellText(`price-${WATCHLIST[k]}`));
    expect(before[0]).toBe(formatPrice('110.00')); // the snapshot price is on screen
    let storeUpdates = 0;
    const unwatch = useQuotes.subscribe(() => {
      storeUpdates += 1;
    });

    // The production counters: reset now, report after WINDOW_S of fake time.
    const measured = measureRenders(WINDOW_S);
    for (let round = 1; round <= ROUNDS; round++) {
      await sendRound(round); // 20 miniTickers
      await advance(STEP_MS); // the conflator flushes (200 ms) and the store notifies once
    }
    const { rowRendersPerSec, commitsPerSec } = await measured;
    unwatch();

    // The ticks really went through: 400 messages were conflated into exactly one store update per round
    // (also the same-value rounds: the store gets a new eventTime) ...
    expect(storeUpdates).toBe(ROUNDS);
    // ... and every row shows its symbol's last price (animated props, no React in between).
    WATCHLIST.forEach((symbol, k) => {
      const last = priceAt(k, ROUNDS);
      expect(useQuotes.getState().bySymbol[symbol]?.last).toBe(last);
      expect(cellText(`price-${symbol}`)).toBe(formatPrice(last));
    });
    expect(WATCHLIST.map((symbol) => cellText(`price-${symbol}`))).not.toEqual(before);

    // Not a single row render (any non-mount commit inside a row's <Counted>) ...
    expect({ rowRendersPerSec }).toEqual({ rowRendersPerSec: 0 });
    // ... and the list is quiet too (a separate failure label: this is not the row requirement).
    expect({ listCommitsPerSec: commitsPerSec }).toEqual({ listCommitsPerSec: 0 });
  });

  it('the counter does see a row that subscribes to the store in render (guard against a vacuous test)', async () => {
    function SubscribedRow() {
      const ticker = useQuotes((s) => s.bySymbol.BTCUSDT); // what this test forbids
      return <>{ticker ? null : null}</>;
    }
    await render(
      <Counted id="subscribed">
        <SubscribedRow />
      </Counted>,
    );

    const measured = measureRenders(2);
    for (let i = 1; i <= 4; i++) {
      await act(async () => {
        useQuotes.getState().applyBatch(
          new Map([
            [
              'BTCUSDT',
              { symbol: 'BTCUSDT', eventTime: i, last: String(100 + i), open: '100', high: '1', low: '1', quoteVolume: '1' },
            ],
          ]),
        );
      });
      await advance(500);
    }

    expect((await measured).rowRendersPerSec).toBeGreaterThan(0);
  });
});
