import { memo, useEffect } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { applyTick } from '@/chart/series';
import type { ChartCandle } from '@/chart/types';
import { useQuotes } from '@/store/quotesStore';
import type { Ticker } from '@/store/types';
import { useThemeColors } from '@/ui/theme';

import { changePct, formatPct, formatPrice } from './format';
import { Sparkline } from './Sparkline';
import { SPARK_BUCKET_MS, SPARK_POINTS, useSparkline } from './useSparkline';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const DASH = '—';
const FLASH_PEAK = 0.3; // opacity of a full flash layer
const TREND_MS = 300;

// A fresh animation per flash: animation objects are single-use.
const flash = () => withSequence(withTiming(1, { duration: 0 }), withTiming(0, { duration: 600 }));

const sign = (pct: number | null) => (pct === null || pct === 0 ? 0 : pct > 0 ? 1 : -1);

type Props = { symbol: string; onPress: (symbol: string) => void };

/**
 * One watchlist row. Ticks never re-render it: a transient store subscription writes shared
 * values and the UI thread shows them (text through animatedProps, flash and colour through
 * animated styles). React renders it on mount, on a symbol change (FlashList recycling), on a
 * theme change, and when the sparkline query settles.
 */
export const TickerRow = memo(function TickerRow({ symbol, onPress }: Props) {
  const spark = useSparkline(symbol);
  const c = useThemeColors(); // colours for worklets and Skia: className cannot reach them
  const priceText = useSharedValue(DASH);
  const pctText = useSharedValue(DASH);
  const trend = useSharedValue(0); // -1..1: colour of the 24h change
  const flashUp = useSharedValue(0); // 1 -> 0: strength of the green flash
  const flashDown = useSharedValue(0); // 1 -> 0: strength of the red flash
  const closes = useSharedValue<number[]>([]); // sparkline points

  useEffect(() => {
    let series: ChartCandle[] = spark.data ?? []; // 24 hourly candles (REST)
    // Previous values of THIS symbol: they decide whether a tick is a flash, and let an
    // identical tick (the store re-emits equal values about once a second) do no work.
    let lastPrice: string | null = null;
    let lastOpen: string | null = null;

    const apply = (t: Ticker | undefined, animate: boolean) => {
      if (!t) return;
      const priceChanged = t.last !== lastPrice;
      if (!priceChanged && t.open === lastOpen) return;

      if (priceChanged) {
        if (animate && lastPrice !== null) {
          const delta = Number(t.last) - Number(lastPrice);
          if (delta > 0) {
            flashDown.set(0);
            flashUp.set(flash());
          } else if (delta < 0) {
            flashUp.set(0);
            flashDown.set(flash());
          }
        }
        priceText.set(formatPrice(t.last));
      }

      const pct = changePct(t.last, t.open);
      pctText.set(formatPct(pct));
      trend.set(animate ? withTiming(sign(pct), { duration: TREND_MS }) : sign(pct));

      if (priceChanged) {
        const price = Number(t.last);
        if (Number.isFinite(price)) {
          const next = applyTick(series, price, t.eventTime, SPARK_BUCKET_MS, SPARK_POINTS);
          if (next !== series) {
            series = next;
            closes.set(series.map((k) => k.c));
          }
        }
      }
      lastPrice = t.last;
      lastOpen = t.open;
    };

    // The row may have been recycled from another symbol: drop its flash and its points.
    flashUp.set(0);
    flashDown.set(0);
    closes.set(series.map((k) => k.c));
    const current = useQuotes.getState().bySymbol[symbol];
    if (current) {
      apply(current, false); // the current value shows without a flash
    } else {
      priceText.set(DASH);
      pctText.set(DASH);
      trend.set(0);
    }

    // Only a change of this symbol's ticker reference matters, not the other 19.
    return useQuotes.subscribe((state, prev) => {
      const t = state.bySymbol[symbol];
      if (t !== prev.bySymbol[symbol]) apply(t, true);
    });
  }, [symbol, spark.data, priceText, pctText, trend, flashUp, flashDown, closes]);

  // The flash colour comes from the layer's className (bg-up / bg-down); only opacity animates.
  const upFlashStyle = useAnimatedStyle(() => ({ opacity: flashUp.get() * FLASH_PEAK }));
  const downFlashStyle = useAnimatedStyle(() => ({ opacity: flashDown.get() * FLASH_PEAK }));
  const priceProps = useAnimatedProps(() => ({
    text: priceText.get(),
    defaultValue: priceText.get(),
  }));
  const pctProps = useAnimatedProps(() => ({
    text: pctText.get(),
    defaultValue: pctText.get(),
  }));
  const pctStyle = useAnimatedStyle(() => ({
    color: interpolateColor(trend.get(), [-1, 0, 1], [c.down, c.muted, c.up]),
  }));

  return (
    <Pressable
      onPress={() => onPress(symbol)}
      testID={`row-${symbol}`}
      accessibilityRole="button"
      accessibilityLabel={symbol}>
      <Animated.View
        pointerEvents="none"
        testID={`flash-up-${symbol}`}
        className="absolute inset-0 bg-up"
        style={upFlashStyle}
      />
      <Animated.View
        pointerEvents="none"
        testID={`flash-down-${symbol}`}
        className="absolute inset-0 bg-down"
        style={downFlashStyle}
      />
      <View className="h-14 flex-row items-center gap-3 px-4">
        <Text className="flex-1 text-base font-semibold text-fg">{symbol.replace(/USDT$/, '')}</Text>
        <Sparkline values={closes} up={c.up} down={c.down} className="h-7 w-18" />
        <AnimatedTextInput
          editable={false}
          pointerEvents="none"
          testID={`price-${symbol}`}
          className="w-26 text-right text-base tabular-nums text-fg"
          animatedProps={priceProps}
        />
        <AnimatedTextInput
          editable={false}
          pointerEvents="none"
          testID={`pct-${symbol}`}
          className="w-18 text-right tabular-nums"
          style={pctStyle}
          animatedProps={pctProps}
        />
      </View>
    </Pressable>
  );
});
