import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import {
  createPicture,
  DashPathEffect,
  Fill,
  Group,
  Line,
  matchFont,
  Path,
  Picture,
  rect,
  Skia,
  type AndroidCanvasProps,
  Text,
  vec,
} from 'react-native-skia';
import { scheduleOnRN } from 'react-native-worklets';

import { AXIS_W, computeLayout, indexAtX, priceY, xCenter } from '@/chart/layout';
import { yToPrice } from '@/chart/scale';
import { formatFixed, priceDigits, stepDecimals } from '@/chart/ticks';
import type { ChartCandle } from '@/chart/types';
import { priceAffine, toTransform, volumeAffine } from '@/chart/transform';
import { followLiveEdge } from '@/chart/viewport';
import { BENCH_DELAY_MS, BENCH_RUN_MS, benchViewport } from '@/dev/chartBench';
import { isDevToolsEnabled } from '@/dev/gate';
import { StyledCanvas } from '@/ui/styled';
import { useThemeColors } from '@/ui/theme';
import { appendBodiesData, appendVolumeData, appendWicksData } from './chartPaths';
import { useChartGestures } from './useChartGestures';

// The font does not depend on the theme: once per module
const font = matchFont({ fontFamily: Platform.select({ ios: 'Helvetica', default: 'sans-serif' }), fontSize: 11 });

type Props = {
  candles: ChartCandle[];
  className?: string;
  /** Dev-only: drive pan and pinch from a frame callback for 10 s, see src/dev/chartBench.ts. */
  bench?: boolean;
};

// Android: the canvas is its own compositor layer. A TextureView (the default) copies every frame into the
// app window and redraws the window; on the M23 that doubled the slow frames during pan and pinch.
// Opaque: the Fill below paints the screen background, so the compositor skips blending. Ignored on iOS.
const ANDROID_CANVAS: AndroidCanvasProps = { backingView: 'SurfaceView', opaque: true };
const VOLUME_ALPHA = 0.3;

function logBench(event: string) {
  console.log(`[bench] ${event}`); // read by the measuring script through logcat
}

export function CandleChart({ candles, className = 'h-80', bench = false }: Props) {
  const c = useThemeColors(); // theme tokens -> Skia colors; they change only on a theme switch
  // Paints: once per theme, not per tick render or per frame
  const builderInit = useMemo(() => Skia.PathBuilder.Make(), []);
  const gridPaint = useMemo(() => {
    const p = Skia.Paint();
    p.setColor(Skia.Color(c.border));
    p.setStrokeWidth(1);
    return p;
  }, [c.border]);
  const labelPaint = useMemo(() => {
    const p = Skia.Paint();
    p.setColor(Skia.Color(c.muted));
    return p;
  }, [c.muted]);

  const size = useSharedValue({ width: 0, height: 0 }); // size of the container (from its className), via onLayout
  const data = useSharedValue<ChartCandle[]>([]); // copy for the UI thread: every ~2 s, not per frame
  const candleW = useSharedValue(8);
  const offset = useSharedValue(0);
  const crossX = useSharedValue(-1);
  const crossY = useSharedValue(0);
  const lastT = useRef<number | null>(null);

  useEffect(() => {
    const newest = candles.at(-1)?.t ?? null;
    const prev = lastT.current;
    lastT.current = newest;
    if (prev !== null && newest !== null && newest > prev) {
      const appended = candles.filter((k) => k.t > prev).length; // rollover: usually 1
      offset.set(followLiveEdge(offset.get(), appended, candleW.get()));
    }
    data.set(candles);
  }, [candles, data, offset, candleW]);

  const count = useDerivedValue(() => data.get().length);
  const width = useDerivedValue(() => size.get().width);
  const gesture = useChartGestures({ candleW, offset, crossX, crossY, count, width });

  // Dev bench: the same shared values a pan or pinch writes, driven per frame on the UI thread.
  const [benchDone, setBenchDone] = useState(false);
  const benchT0 = useSharedValue(-1);
  const benchFrame = useFrameCallback((info) => {
    'worklet';
    if (count.get() === 0 || width.get() === 0) return; // wait for the history and the layout
    if (benchT0.get() < 0) {
      benchT0.set(info.timestamp);
      scheduleOnRN(logBench, 'armed');
    }
    const t = info.timestamp - benchT0.get();
    const vp = benchViewport(t, count.get(), width.get() - AXIS_W);
    if (vp) {
      candleW.set(vp.candleW);
      offset.set(vp.offset);
    } else if (t >= BENCH_DELAY_MS + BENCH_RUN_MS) {
      benchT0.set(Number.POSITIVE_INFINITY); // t < 0 from now on: nothing more to do until the stop lands
      scheduleOnRN(logBench, 'done');
      scheduleOnRN(setBenchDone, true);
    }
  }, false);
  useEffect(() => {
    if (!bench || benchDone || !isDevToolsEnabled()) return; // the gate again: any caller may pass `bench`
    benchFrame.setActive(true);
    return () => benchFrame.setActive(false);
  }, [bench, benchDone, benchFrame]);

  // Frame geometry on the UI thread; recomputed only when data, zoom, offset or size change
  const layout = useDerivedValue(() =>
    computeLayout(data.get(), { candleW: candleW.get(), offset: offset.get() }, size.get().width, size.get().height),
  );
  // Candles and volume live in data space (x = candle index, y = price - ref or volume) and are rebuilt only
  // when the data changes (~every 2 s); pan and pinch only move a Group transform. Rebuilding ~400 rects on
  // the UI thread every frame was the frame-time bottleneck: 10 % slow frames -> 3 % in the bench.
  // Not usePathValue: in Skia 3.7.4 it rebuilds every frame. Reads inline: a derived value takes its
  // inputs from its own closure only. One builder: each derived resets it first.
  const builder = useSharedValue(builderInit);
  const ref = useDerivedValue(() => data.get().at(-1)?.c ?? 0); // keeps float32 path coordinates small
  const upBodies = useDerivedValue(() => {
    const list = data.get();
    const r = ref.get();
    const b = builder.get();
    b.reset();
    appendBodiesData(b, list, true, r);
    return b.build();
  });
  const downBodies = useDerivedValue(() => {
    const list = data.get();
    const r = ref.get();
    const b = builder.get();
    b.reset();
    appendBodiesData(b, list, false, r);
    return b.build();
  });
  const upWicks = useDerivedValue(() => {
    const list = data.get();
    const r = ref.get();
    const b = builder.get();
    b.reset();
    appendWicksData(b, list, true, r);
    return b.build();
  });
  const downWicks = useDerivedValue(() => {
    const list = data.get();
    const r = ref.get();
    const b = builder.get();
    b.reset();
    appendWicksData(b, list, false, r);
    return b.build();
  });
  const upVolume = useDerivedValue(() => {
    const list = data.get();
    const b = builder.get();
    b.reset();
    appendVolumeData(b, list, true);
    return b.build();
  });
  const downVolume = useDerivedValue(() => {
    const list = data.get();
    const b = builder.get();
    b.reset();
    appendVolumeData(b, list, false);
    return b.build();
  });
  // Per frame: two transforms instead of new geometry
  const priceTransform = useDerivedValue(() => toTransform(priceAffine(layout.get(), ref.get())));
  const volumeTransform = useDerivedValue(() => toTransform(volumeAffine(layout.get())));
  // Candles and volume stay left of the price axis: the newest visible candle can stick out past L.width while panning.
  const plotClip = useDerivedValue(() => rect(0, 0, layout.get().width, size.get().height));

  // Grid and price scale: the number of ticks changes with zoom -> one Picture (draw commands), not N nodes
  const grid = useDerivedValue(() =>
    createPicture((canvas) => {
      const L = layout.get();
      const d = stepDecimals(L.tickStep);
      for (const p of L.ticks) {
        const y = priceY(p, L);
        canvas.drawLine(0, y, L.width, y, gridPaint);
        canvas.drawText(formatFixed(p, d), L.width + 6, y + 4, labelPaint, font);
      }
    }),
  );

  // Last price line
  const lastY = useDerivedValue(() => {
    const list = data.get();
    const k = list[list.length - 1];
    return k ? priceY(k.c, layout.get()) : -100;
  });
  const lastP1 = useDerivedValue(() => vec(0, lastY.get()));
  const lastP2 = useDerivedValue(() => vec(layout.get().width, lastY.get()));
  const lastLabel = useDerivedValue(() => {
    const list = data.get();
    const k = list[list.length - 1];
    return k ? formatFixed(k.c, priceDigits(k.c)) : '';
  });
  const labelX = useDerivedValue(() => layout.get().width + 6);
  const lastLabelY = useDerivedValue(() => lastY.get() + 4);

  // Crosshair: candle under the finger, OHLC on top, price under the finger on the right
  const crossIndex = useDerivedValue(() => (crossX.get() < 0 ? -1 : indexAtX(crossX.get(), layout.get())));
  const crossOpacity = useDerivedValue(() => (crossIndex.get() < 0 ? 0 : 1));
  const crossLineX = useDerivedValue(() => xCenter(Math.max(0, crossIndex.get()), layout.get()));
  const v1 = useDerivedValue(() => vec(crossLineX.get(), 0));
  const v2 = useDerivedValue(() => vec(crossLineX.get(), size.get().height));
  const h1 = useDerivedValue(() => vec(0, crossY.get()));
  const h2 = useDerivedValue(() => vec(layout.get().width, crossY.get()));
  const ohlc = useDerivedValue(() => {
    const k = data.get()[crossIndex.get()];
    if (!k) return '';
    const d = priceDigits(k.c);
    return `O ${formatFixed(k.o, d)}  H ${formatFixed(k.h, d)}  L ${formatFixed(k.l, d)}  C ${formatFixed(k.c, d)}`;
  });
  const crossPrice = useDerivedValue(() => {
    const L = layout.get();
    const p = yToPrice(crossY.get(), L.range, L.priceTop, L.priceBottom);
    return formatFixed(p, priceDigits(p));
  });
  const crossPriceY = useDerivedValue(() => crossY.get() + 4);

  return (
    <View
      className={className}
      testID="candle-chart"
      onLayout={(e) => size.set({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
    >
      <GestureDetector gesture={gesture}>
        <StyledCanvas className="flex-1" android={ANDROID_CANVAS}>
          <Fill color={c.bg} />
          <Picture picture={grid} />
          <Group clip={plotClip}>
            <Group transform={volumeTransform}>
              <Path path={upVolume} color={c.up} opacity={VOLUME_ALPHA} />
              <Path path={downVolume} color={c.down} opacity={VOLUME_ALPHA} />
            </Group>
            <Group transform={priceTransform}>
              <Path path={upBodies} color={c.up} />
              <Path path={downBodies} color={c.down} />
              {/* strokeWidth 0 = hairline: 1 px at any zoom, the transform does not scale it */}
              <Path path={upWicks} color={c.up} style="stroke" strokeWidth={0} />
              <Path path={downWicks} color={c.down} style="stroke" strokeWidth={0} />
            </Group>
          </Group>
          <Line p1={lastP1} p2={lastP2} color={c.accent} strokeWidth={1}>
            <DashPathEffect intervals={[4, 4]} />
          </Line>
          <Text x={labelX} y={lastLabelY} text={lastLabel} font={font} color={c.accent} />
          <Group opacity={crossOpacity}>
            <Line p1={v1} p2={v2} color={c.muted} strokeWidth={1} />
            <Line p1={h1} p2={h2} color={c.muted} strokeWidth={1} />
            <Text x={8} y={14} text={ohlc} font={font} color={c.fg} />
            <Text x={labelX} y={crossPriceY} text={crossPrice} font={font} color={c.fg} />
          </Group>
        </StyledCanvas>
      </GestureDetector>
    </View>
  );
}
