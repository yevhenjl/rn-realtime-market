import { Stack, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { changePct, formatPct, formatPrice } from '@/features/watchlist/format';
import type { ChartCandle } from '@/chart/types';
import { parseBench } from '@/dev/chartBench';
import { Counted } from '@/dev/renderStats';
import { CandleChart } from '@/features/symbol/CandleChart';
import { useKlines, useKlineStream } from '@/features/symbol/useKlines';
import { useTicker } from '@/features/symbol/useTicker';
import { normalizeSymbol } from '@/features/symbol/normalizeSymbol';

// Stable reference while the history loads: a fresh [] per render would re-run the chart's path work.
const EMPTY: ChartCandle[] = [];

export default function SymbolScreen() {
  const { symbol: param, bench } = useLocalSearchParams<{ symbol: string; bench?: string }>();
  const symbol = normalizeSymbol(param);
  const runBench = parseBench(bench); // dev-only chart benchmark; without the dev gate always false

  if (symbol === null) {
    return (
      <View testID="symbol-invalid" className="flex-1 gap-2 bg-bg p-4">
        <Stack.Screen options={{ title: 'Symbol' }} />
        <Text selectable className="text-lg font-semibold text-fg">
          Unknown symbol
        </Text>
        <Text selectable className="text-base text-muted">
          Open a pair from the watchlist, for example BTCUSDT.
        </Text>
      </View>
    );
  }
  return <SymbolContent symbol={symbol} bench={runBench} />;
}

// The price header is its own component: a ticker update re-renders only this, never the chart's parent
// The structure guarantees it; it does not rely on the React Compiler memoizing the chart element
// (the compiler is off under Jest, so a structural split is also what the tests can pin).
function PriceHeader({ symbol }: { symbol: string }) {
  const ticker = useTicker(symbol);
  const pct = ticker.last !== undefined && ticker.open !== undefined ? changePct(ticker.last, ticker.open) : null;
  const changeClass = pct === null || pct === 0 ? 'text-muted' : pct > 0 ? 'text-up' : 'text-down';

  return (
    <View className="gap-1">
      <Text selectable className="text-3xl font-semibold tabular-nums text-fg">
        {ticker.last === undefined ? '—' : formatPrice(ticker.last)}
      </Text>
      <Text selectable className={`text-base tabular-nums ${changeClass}`}>
        {formatPct(pct)} · 24h
      </Text>
    </View>
  );
}

// Hooks need a valid symbol, so they live below the validation.
function SymbolContent({ symbol, bench }: { symbol: string; bench: boolean }) {
  const klines = useKlines(symbol);
  useKlineStream(symbol);

  const failed = klines.isError && klines.data === undefined; // a failed refetch keeps the old candles on screen

  return (
    <View testID="symbol-screen" className="flex-1 gap-3 bg-bg p-4">
      <Stack.Screen options={{ title: symbol }} />
      <PriceHeader symbol={symbol} />

      {failed ? (
        <View testID="symbol-error" className="gap-2 rounded-2xl border border-border bg-surface p-4">
          <Text selectable className="text-base font-semibold text-fg">
            Could not load candles
          </Text>
          <Text selectable className="text-sm text-muted">
            {klines.error?.message}
          </Text>
          <Text accessibilityRole="button" onPress={() => void klines.refetch()} className="text-base font-semibold text-accent">
            Retry
          </Text>
        </View>
      ) : (
        // The chart renders only when klines.data changes (live candle, ~2 s); ticks, gestures and the header never re-render it.
        <Counted id="chart">
          <CandleChart candles={klines.data ?? EMPTY} className="h-80" bench={bench} />
        </Counted>
      )}

      <Text selectable className="text-xs text-muted">
        Binance public market data · 1m candles · live
      </Text>
      {/* Legal disclaimer, the same wording as in README. */}
      <Text testID="disclaimer" selectable className="text-xs text-muted">
        Market data: Binance public API. Not affiliated with Binance. Not financial advice.
      </Text>
    </View>
  );
}
