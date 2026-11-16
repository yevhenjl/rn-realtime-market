// The home screen is the watchlist: FlashList of WATCHLIST
// symbols, seeded by one REST snapshot (mocked fetch) and wired to the real quotes store.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import HomeScreen from '@/app/index';
import { klineRow } from '@/binance/fixtures';
import { WATCHLIST } from '@/config';
import { useQuotes } from '@/store/quotesStore';

// Skia's native module (and CanvasKit, which is not installed) does not exist in Jest: only the
// sparkline canvas is replaced. Reanimated, FlashList, the rows and the store are real.
jest.mock('@/features/watchlist/Sparkline', () => ({ Sparkline: () => null }));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  Stack: { Screen: () => null },
}));

jest.setTimeout(20_000);

const originalFetch = globalThis.fetch;
const fetchMock = jest.fn<Promise<Response>, [input: RequestInfo | URL, init?: RequestInit]>();

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

// Prices differ per symbol (index + 1) so a mix-up of rows shows.
const tickerRow = (symbol: string, i: number) => ({
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

// Text of an AnimatedTextInput row cell as Reanimated applied it (Jest has no native text input).
const cellText = (testID: string): string =>
  screen.getByTestId(testID).props.jestAnimatedProps.value.text;

describe('home screen (watchlist)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // gcTime: Infinity - no garbage-collection timer, so Jest can exit.
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    useQuotes.setState(useQuotes.getInitialState(), true);
    jest.mocked(router.push).mockClear();
    fetchMock.mockReset();
    fetchMock.mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/ticker/24hr')) return Promise.resolve(jsonResponse(WATCHLIST.map(tickerRow)));
      if (url.includes('/klines')) return Promise.resolve(jsonResponse([klineRow]));
      return Promise.reject(new Error(`unexpected request: ${url}`));
    });
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    queryClient.clear();
  });

  const renderHome = async () => {
    await render(
      <QueryClientProvider client={queryClient}>
        <HomeScreen />
      </QueryClientProvider>,
    );
    // The snapshot has arrived once the first symbol's price is in the store.
    await waitFor(() => expect(useQuotes.getState().bySymbol.BTCUSDT).toBeDefined());
  };

  it('shows the Realtime Market header and the 20 WATCHLIST rows in order after the snapshot', async () => {
    await renderHome();

    expect(screen.getByRole('header', { name: 'Realtime Market' })).toBeOnTheScreen();
    expect(WATCHLIST).toHaveLength(20);
    const rows = screen.getAllByTestId(/^row-/).map((row) => row.props.testID);
    expect(rows).toEqual(WATCHLIST.map((symbol) => `row-${symbol}`));
  });

  it('requests the snapshot for exactly the WATCHLIST symbols', async () => {
    await renderHome();

    const snapshotUrls = fetchMock.mock.calls
      .map(([input]) => String(input))
      .filter((url) => url.includes('/ticker/24hr'));
    expect(snapshotUrls).toHaveLength(1);
    const symbols = JSON.parse(new URL(snapshotUrls[0]!).searchParams.get('symbols')!);
    expect(symbols).toEqual([...WATCHLIST]);
  });

  it('puts each symbol\'s snapshot price and 24h change into its own row', async () => {
    await renderHome();

    await waitFor(() => expect(cellText('price-BTCUSDT')).toBe('110.000'));
    // i-th symbol: last = 110 + i, open = 100 -> +(10 + i)%
    WATCHLIST.forEach((symbol, i) => {
      expect(cellText(`price-${symbol}`)).toBe(`${110 + i}.000`);
      expect(cellText(`pct-${symbol}`)).toBe(`+${(10 + i).toFixed(2)}%`);
    });
  });

  it('opens the symbol screen when a row is pressed', async () => {
    await renderHome();

    fireEvent.press(screen.getByTestId('row-SOLUSDT'));

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/symbol/[symbol]',
      params: { symbol: 'SOLUSDT' },
    });
  });
});
