import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import { Text as MockText } from 'react-native';

import SymbolScreen from '@/app/symbol/[symbol]';
import { fetchKlines } from '@/binance/rest';
import type { ChartCandle } from '@/chart/types';
import { realtime } from '@/realtime/client';
import { useQuotes } from '@/store/quotesStore';

// Skia and Reanimated need native modules that Jest does not have: only CandleChart is replaced.
const mockCandleChart = jest.fn();
jest.mock('@/features/symbol/CandleChart', () => ({
  CandleChart: (props: { candles: unknown[]; className?: string }) => {
    mockCandleChart(props);
    return <MockText testID="candle-chart-mock">{`candles:${props.candles.length}`}</MockText>;
  },
}));

const mockStackScreen = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  Stack: { Screen: (props: unknown) => (mockStackScreen(props), null) },
}));

jest.mock('@/binance/rest', () => ({
  ...jest.requireActual('@/binance/rest'),
  fetchKlines: jest.fn(),
}));

const paramsMock = jest.mocked(useLocalSearchParams);
const fetchMock = jest.mocked(fetchKlines);

const candles = (n: number): ChartCandle[] =>
  Array.from({ length: n }, (_, i) => ({ t: i * 60_000, o: 1, h: 2, l: 0.5, c: 1.5, v: 1 }));

const seedTicker = (last: string, open: string) =>
  useQuotes.getState().applyBatch(
    new Map([['BTCUSDT', { symbol: 'BTCUSDT', eventTime: 1, last, open, high: last, low: open, quoteVolume: '1' }]]),
  );

describe('symbol screen', () => {
  let queryClient: QueryClient;
  let subscribeSpy: jest.SpyInstance;

  // Resolves once the history request has settled, so no query notification lands after the test.
  const renderScreen = async () => {
    await render(
      <QueryClientProvider client={queryClient}>
        <SymbolScreen />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  };

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    useQuotes.setState(useQuotes.getInitialState(), true);
    fetchMock.mockReset();
    mockCandleChart.mockClear();
    mockStackScreen.mockClear();
    subscribeSpy = jest.spyOn(realtime, 'subscribe').mockImplementation(() => jest.fn());
    paramsMock.mockReturnValue({ symbol: 'btcusdt' });
  });

  afterEach(() => {
    subscribeSpy.mockRestore();
    queryClient.clear();
  });

  it('normalizes the param, titles the screen and loads history and the live stream for the symbol', async () => {
    fetchMock.mockResolvedValue(candles(3));

    await renderScreen();

    expect(screen.getByTestId('symbol-screen')).toBeOnTheScreen();
    expect(mockStackScreen).toHaveBeenCalledWith({ options: { title: 'BTCUSDT' } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('BTCUSDT', '1m', 500, expect.anything()));
    expect(subscribeSpy.mock.calls.map(([stream]) => stream)).toEqual(['btcusdt@kline_1m']);
    expect(await screen.findByText('candles:3')).toBeOnTheScreen();
    expect(mockCandleChart).toHaveBeenLastCalledWith(expect.objectContaining({ className: 'h-80' }));
    expect(screen.getByText(/Binance public market data/)).toBeOnTheScreen();
    expect(screen.getByTestId('disclaimer')).toHaveTextContent(
      'Market data: Binance public API. Not affiliated with Binance. Not financial advice.',
    );
  });

  it('without the dev bench param the chart gets no bench', async () => {
    fetchMock.mockResolvedValue(candles(3));
    await renderScreen();
    expect(mockCandleChart).toHaveBeenLastCalledWith(expect.objectContaining({ bench: false }));
  });

  it('passes the dev bench param to the chart (Jest runs with __DEV__, the bench gate is open)', async () => {
    paramsMock.mockReturnValue({ symbol: 'btcusdt', bench: '1' });
    fetchMock.mockResolvedValue(candles(3));
    await renderScreen();
    expect(mockCandleChart).toHaveBeenLastCalledWith(expect.objectContaining({ bench: true }));
  });

  it('shows the formatted price and the 24h change from the quotes store', async () => {
    fetchMock.mockResolvedValue([]);
    seedTicker('84710.60000000', '82425.35000000');

    await renderScreen();

    expect(screen.getByText('84,710.60')).toBeOnTheScreen();
    expect(screen.getByText('+2.77% · 24h')).toBeOnTheScreen();
  });

  it('shows dashes while the symbol has no ticker', async () => {
    fetchMock.mockResolvedValue([]);

    await renderScreen();

    expect(screen.getByText('—')).toBeOnTheScreen();
    expect(screen.getByText('— · 24h')).toBeOnTheScreen();
  });

  it('updates the price when the store changes', async () => {
    fetchMock.mockResolvedValue([]);
    seedTicker('100.50', '100.50');
    await renderScreen();
    expect(screen.getByText('100.500')).toBeOnTheScreen();

    await act(async () => {
      useQuotes.getState().applyBatch(
        new Map([['BTCUSDT', { symbol: 'BTCUSDT', eventTime: 2, last: '95.50' }]]),
      );
    });

    expect(screen.getByText('95.500')).toBeOnTheScreen();
    expect(screen.getByText('-4.98% · 24h')).toBeOnTheScreen();
  });

  it('an invalid param shows a message and starts no requests or subscriptions', async () => {
    paramsMock.mockReturnValue({ symbol: 'BTC/USDT' });

    await renderScreen();

    expect(screen.getByTestId('symbol-invalid')).toBeOnTheScreen();
    expect(screen.getByText('Unknown symbol')).toBeOnTheScreen();
    expect(screen.queryByTestId('symbol-screen')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(subscribeSpy).not.toHaveBeenCalled();
  });

  it('a missing param is handled the same way', async () => {
    paramsMock.mockReturnValue({});

    await renderScreen();

    expect(screen.getByTestId('symbol-invalid')).toBeOnTheScreen();
  });

  it('a failed history request shows the error and Retry refetches', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Binance HTTP 400: Invalid symbol.'));
    fetchMock.mockResolvedValueOnce(candles(2));

    await renderScreen();

    expect(await screen.findByTestId('symbol-error')).toBeOnTheScreen();
    expect(screen.getByText('Binance HTTP 400: Invalid symbol.')).toBeOnTheScreen();
    expect(screen.queryByTestId('candle-chart-mock')).toBeNull();

    fireEvent.press(screen.getByText('Retry'));

    expect(await screen.findByText('candles:2')).toBeOnTheScreen();
    expect(screen.queryByTestId('symbol-error')).toBeNull();
  });
});
