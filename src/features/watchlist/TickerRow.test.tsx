import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { Profiler, type ReactElement } from 'react';
import type { SharedValue } from 'react-native-reanimated';

import { useQuotes } from '@/store/quotesStore';
import type { Ticker } from '@/store/types';

import { TickerRow } from './TickerRow';

// Skia's native module (and CanvasKit, which is not installed) does not exist in Jest: only the
// sparkline canvas is replaced, by a spy that keeps the shared value the row feeds it.
// Reanimated, the store, the formatters and the row itself are real.
const mockSparkline = jest.fn<void, [{ values: SharedValue<number[]> }]>();
jest.mock('./Sparkline', () => ({
  Sparkline: (props: { values: SharedValue<number[]> }) => (mockSparkline(props), null),
}));

// The Uniwind mock answers every theme token with the same grey: distinct colours make the
// trend colour observable.
jest.mock('@/ui/theme', () => ({
  useThemeColors: () => ({
    bg: '#000000', fg: '#ffffff', muted: '#808080', border: '#333333',
    up: '#00ff00', down: '#ff0000', accent: '#0000ff',
  }),
}));

jest.setTimeout(20_000);

const HOUR = 3_600_000;
const NOW = Math.floor(1_800_000_000_000 / HOUR) * HOUR + 5 * 60_000; // 5 min into an hour

const ticker = (symbol: string, last: string, eventTime = NOW, open = '100'): Ticker => ({
  symbol,
  eventTime,
  last,
  open,
  high: last,
  low: open,
  quoteVolume: '1',
});

const push = (...tickers: Ticker[]) =>
  act(async () => {
    useQuotes.getState().applyBatch(new Map(tickers.map((t) => [t.symbol, t])));
  });

const advance = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

// What Reanimated applied to the row's animated props / styles (Jest has no native views).
const text = (testID: string): string => screen.getByTestId(testID).props.jestAnimatedProps.value.text;
const defaultValue = (testID: string): string =>
  screen.getByTestId(testID).props.jestAnimatedProps.value.defaultValue;
const style = (testID: string) => screen.getByTestId(testID).props.jestAnimatedStyle.value;
const opacity = (testID: string): number => style(testID).opacity;
const closes = (): number[] => mockSparkline.mock.calls.at(-1)![0].values.get();

// 24 hourly candles ending in the current hour, close = 100 + index.
const sparkRows = () =>
  Array.from({ length: 24 }, (_, i) => {
    const openTime = NOW - (NOW % HOUR) - (23 - i) * HOUR;
    return [openTime, '1', '1', '1', String(100 + i), '1', openTime + HOUR - 1];
  });

describe('TickerRow', () => {
  const originalFetch = globalThis.fetch;
  let queryClient: QueryClient;
  let rowUpdates: number;

  const onRender = (_id: string, phase: string) => {
    if (phase !== 'mount') rowUpdates += 1;
  };
  const tree = (symbol: string): ReactElement => (
    <QueryClientProvider client={queryClient}>
      <Profiler id="row" onRender={onRender}>
        <TickerRow symbol={symbol} onPress={jest.fn()} />
      </Profiler>
    </QueryClientProvider>
  );

  // `withSpark: false` makes the klines request fail (retry off), leaving the row with no history.
  const mount = async (symbol = 'BTCUSDT', withSpark = true) => {
    globalThis.fetch = jest.fn(() =>
      withSpark
        ? Promise.resolve(new Response(JSON.stringify(sparkRows()), { status: 200 }))
        : Promise.reject(new Error('offline')),
    ) as unknown as typeof fetch;
    const view = await render(tree(symbol));
    if (withSpark) await waitFor(() => expect(closes()).toHaveLength(24));
    await advance(1_000); // let flashes and the trend timing from mounting settle
    rowUpdates = 0;
    return view;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockSparkline.mockClear();
    useQuotes.setState(useQuotes.getInitialState(), true);
    // gcTime: Infinity - no garbage-collection timer, so Jest can exit.
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  });

  afterEach(() => {
    jest.useRealTimers();
    globalThis.fetch = originalFetch;
    queryClient.clear();
  });

  it('shows dashes before the symbol has a ticker', async () => {
    await mount();

    expect(text('price-BTCUSDT')).toBe('—');
    expect(text('pct-BTCUSDT')).toBe('—');
    expect(opacity('flash-up-BTCUSDT')).toBe(0);
    expect(opacity('flash-down-BTCUSDT')).toBe(0);
  });

  it('shows the ticker already in the store without a flash', async () => {
    await push(ticker('BTCUSDT', '110'));
    await mount();

    expect(text('price-BTCUSDT')).toBe('110.000');
    expect(text('pct-BTCUSDT')).toBe('+10.00%');
    // Nothing flashed even though the first value arrived through the same path as ticks.
    await advance(16);
    expect(opacity('flash-up-BTCUSDT')).toBe(0);
    expect(opacity('flash-down-BTCUSDT')).toBe(0);
  });

  it('a rising price updates price and change text and flashes green, then fades', async () => {
    await push(ticker('BTCUSDT', '110'));
    await mount();

    await push(ticker('BTCUSDT', '112', NOW + 1_000));
    await advance(16);

    expect(text('price-BTCUSDT')).toBe('112.000');
    expect(text('pct-BTCUSDT')).toBe('+12.00%');
    // Android applies a text update through defaultValue: it must carry the same string.
    expect(defaultValue('price-BTCUSDT')).toBe(text('price-BTCUSDT'));
    expect(defaultValue('pct-BTCUSDT')).toBe(text('pct-BTCUSDT'));
    expect(opacity('flash-up-BTCUSDT')).toBeGreaterThan(0.2);
    expect(opacity('flash-down-BTCUSDT')).toBe(0);

    await advance(700);
    expect(opacity('flash-up-BTCUSDT')).toBe(0);
  });

  it('a falling price flashes red and the change colour follows the sign of the 24h change', async () => {
    await push(ticker('BTCUSDT', '110'));
    await mount();
    await advance(1_000);
    expect(style('pct-BTCUSDT').color).toBe('rgba(0, 255, 0, 1)'); // +10%: up colour

    await push(ticker('BTCUSDT', '95', NOW + 1_000)); // -5%
    await advance(16);
    expect(opacity('flash-down-BTCUSDT')).toBeGreaterThan(0.2);
    expect(opacity('flash-up-BTCUSDT')).toBe(0);
    expect(text('pct-BTCUSDT')).toBe('-5.00%');

    await advance(100); // mid-transition: neither the old nor the new colour (smooth, not a jump)
    const mid = style('pct-BTCUSDT').color;
    expect(mid).not.toBe('rgba(0, 255, 0, 1)');
    expect(mid).not.toBe('rgba(255, 0, 0, 1)');

    await advance(500);
    expect(style('pct-BTCUSDT').color).toBe('rgba(255, 0, 0, 1)');
  });

  it('ticks never re-render the row, whatever the store emits', async () => {
    await push(ticker('BTCUSDT', '110'), ticker('ETHUSDT', '50'));
    await mount();

    for (let i = 1; i <= 25; i++) {
      await push(ticker('BTCUSDT', String(110 + i), NOW + i * 1_000)); // price moves
      await push(ticker('ETHUSDT', String(50 + i), NOW + i * 1_000)); // another symbol
    }
    await push(ticker('BTCUSDT', '135', NOW + 99_000)); // same values, new object
    await advance(2_000);

    expect(text('price-BTCUSDT')).toBe('135.000');
    expect(rowUpdates).toBe(0);
  });

  it('does not flash or touch the sparkline when the store re-emits the same values', async () => {
    await push(ticker('BTCUSDT', '110'));
    await mount();
    const pointsBefore = closes();
    const callsBefore = mockSparkline.mock.calls.length;

    await push(ticker('BTCUSDT', '110', NOW + 1_000)); // new ticker object, equal values
    await advance(16);

    expect(opacity('flash-up-BTCUSDT')).toBe(0);
    expect(opacity('flash-down-BTCUSDT')).toBe(0);
    expect(text('price-BTCUSDT')).toBe('110.000');
    expect(closes()).toBe(pointsBefore); // same array: no new points were written
    expect(mockSparkline.mock.calls.length).toBe(callsBefore);
  });

  it('ignores other symbols', async () => {
    await push(ticker('BTCUSDT', '110'));
    await mount();

    await push(ticker('ETHUSDT', '3000', NOW + 1_000), ticker('SOLUSDT', '20', NOW + 1_000));
    await advance(16);

    expect(text('price-BTCUSDT')).toBe('110.000');
    expect(opacity('flash-up-BTCUSDT')).toBe(0);
    expect(opacity('flash-down-BTCUSDT')).toBe(0);
  });

  it('feeds the sparkline: history, then the live price in the last point', async () => {
    await push(ticker('BTCUSDT', '110'));
    await mount();
    // 24 candles, the last one (this hour) closes at the live price.
    expect(closes()).toHaveLength(24);
    expect(closes().slice(0, 23)).toEqual(Array.from({ length: 23 }, (_, i) => 100 + i));
    expect(closes()[23]).toBe(110);

    await push(ticker('BTCUSDT', '121', NOW + 1_000));
    expect(closes()).toHaveLength(24);
    expect(closes()[23]).toBe(121);

    await push(ticker('BTCUSDT', '130', NOW + HOUR)); // next hour: a new point, the oldest drops out
    expect(closes()).toHaveLength(24);
    expect(closes()[22]).toBe(121);
    expect(closes()[23]).toBe(130);
    expect(closes()[0]).toBe(101);
  });

  describe('reuse by FlashList (symbol change)', () => {
    it('resets texts, flash and sparkline when the new symbol has no ticker yet', async () => {
      await push(ticker('BTCUSDT', '110'));
      const view = await mount('BTCUSDT');
      await push(ticker('BTCUSDT', '115', NOW + 1_000)); // BTC flash is running
      await advance(16);
      expect(opacity('flash-up-BTCUSDT')).toBeGreaterThan(0.2);

      await view.rerender(tree('ETHUSDT'));
      await waitFor(() => expect(closes()).toHaveLength(24)); // ETH history

      expect(text('price-ETHUSDT')).toBe('—');
      expect(text('pct-ETHUSDT')).toBe('—');
      expect(opacity('flash-up-ETHUSDT')).toBe(0);
      expect(opacity('flash-down-ETHUSDT')).toBe(0);
      expect(closes()[23]).toBe(123); // history only: no BTC price leaked into ETH's last point
      await advance(1_000);
      expect(opacity('flash-up-ETHUSDT')).toBe(0);
    });

    it('shows the new symbol without a flash, and stops listening to the old one', async () => {
      await push(ticker('BTCUSDT', '110'), ticker('ETHUSDT', '3000', NOW, '2000'));
      const view = await mount('BTCUSDT');

      await view.rerender(tree('ETHUSDT'));
      await advance(16);
      expect(text('price-ETHUSDT')).toBe('3,000.00');
      expect(text('pct-ETHUSDT')).toBe('+50.00%');
      expect(opacity('flash-up-ETHUSDT')).toBe(0);
      expect(opacity('flash-down-ETHUSDT')).toBe(0);

      // The old symbol's ticks must not reach the recycled row ...
      await push(ticker('BTCUSDT', '1', NOW + 1_000));
      await advance(16);
      expect(text('price-ETHUSDT')).toBe('3,000.00');
      expect(opacity('flash-down-ETHUSDT')).toBe(0);
      // ... the new symbol's ticks do.
      await push(ticker('ETHUSDT', '3100', NOW + 2_000, '2000'));
      await advance(16);
      expect(text('price-ETHUSDT')).toBe('3,100.00');
      expect(opacity('flash-up-ETHUSDT')).toBeGreaterThan(0.2);
    });

    it('a price that equals the old symbol\'s last price does not count as unchanged', async () => {
      await push(ticker('BTCUSDT', '110'), ticker('ETHUSDT', '112'));
      const view = await mount('BTCUSDT');
      await view.rerender(tree('ETHUSDT'));
      await advance(16);

      await push(ticker('ETHUSDT', '110', NOW + 1_000)); // equals BTC's old price, but is a fall for ETH
      await advance(16);

      expect(opacity('flash-down-ETHUSDT')).toBeGreaterThan(0.2);
    });
  });

  it('works without sparkline history', async () => {
    await mount('BTCUSDT', false);

    await push(ticker('BTCUSDT', '110'));
    await push(ticker('BTCUSDT', '111', NOW + 1_000));

    expect(text('price-BTCUSDT')).toBe('111.000');
    expect(closes()).toEqual([111]);
  });
});
