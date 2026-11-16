import { FlashList } from '@shopify/flash-list';
import { Stack, router } from 'expo-router';
import { Profiler, useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { WATCHLIST } from '@/config';
import { Counted, countCommit, measureRenders } from '@/dev/renderStats';
import { TickerRow } from '@/features/watchlist/TickerRow';
import { useTickerSnapshot } from '@/features/watchlist/useTickerSnapshot';
import { useWatchlistStream } from '@/features/watchlist/useWatchlistStream';

const MEASURE_SECONDS = 10;
const BATCH_MS = 200;

// Hidden native title: the screen draws its own (module constant: no new options object per render).
const SCREEN_OPTIONS = { headerTitle: '' };

const keyExtractor = (symbol: string) => symbol;
const renderFooter = () => <View className="h-24" />; // room for the connection banner

function DevButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="rounded-md border border-border bg-surface px-3 py-1.5">
      <Text className="text-sm font-medium text-fg">{label}</Text>
    </Pressable>
  );
}

export default function WatchlistScreen() {
  // __DEV__ controls drive the measurement table; in release builds the state stays at defaults.
  const [stress, setStress] = useState(false);
  const [flushMs, setFlushMs] = useState(BATCH_MS);
  const [measured, setMeasured] = useState<string | null>(null);

  useTickerSnapshot(WATCHLIST);
  useWatchlistStream(WATCHLIST, stress, flushMs);

  const openSymbol = useCallback((symbol: string) => {
    router.push({ pathname: '/symbol/[symbol]', params: { symbol } });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: string }) => (
      <Counted id={item}>
        <TickerRow symbol={item} onPress={openSymbol} />
      </Counted>
    ),
    [openSymbol],
  );

  const measure = useCallback(async () => {
    const { rowRendersPerSec, commitsPerSec } = await measureRenders(MEASURE_SECONDS);
    const line = `rows ${rowRendersPerSec.toFixed(2)}/s, list commits ${commitsPerSec.toFixed(2)}/s`;
    if (__DEV__) console.log(`[measure ${MEASURE_SECONDS}s] ${line}`);
    setMeasured(line);
  }, []);

  return (
    <View className="flex-1 bg-bg">
      {/* The native stack title is hidden for this screen: this is the one visible title. */}
      <Stack.Screen options={SCREEN_OPTIONS} />
      <View className="px-4 pb-2 pt-1">
        <Text accessibilityRole="header" className="text-2xl font-semibold text-fg">
          Realtime Market
        </Text>
      </View>
      {__DEV__ ? (
        <View className="gap-2 px-4 pb-2">
          <View className="flex-row flex-wrap gap-2">
            <DevButton
              label={stress ? 'Stress: on' : 'Stress: off'}
              onPress={() => setStress((on) => !on)}
            />
            <DevButton
              label={flushMs === 0 ? 'No batching' : `Batch ${BATCH_MS} ms`}
              onPress={() => setFlushMs((ms) => (ms === 0 ? BATCH_MS : 0))}
            />
            <DevButton label={`Measure ${MEASURE_SECONDS} s`} onPress={measure} />
          </View>
          {measured === null ? null : (
            <Text selectable className="text-sm tabular-nums text-muted">
              {measured}
            </Text>
          )}
        </View>
      ) : null}
      <Profiler id="list" onRender={countCommit}>
        <FlashList
          data={WATCHLIST}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListFooterComponent={renderFooter}
        />
      </Profiler>
    </View>
  );
}
