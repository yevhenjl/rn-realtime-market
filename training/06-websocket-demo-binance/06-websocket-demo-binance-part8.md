# Итоговый проект: живой рынок на Expo — system design, WebSocket, графики на Skia

Обновлено: 2026-10-21 · Тренинг 6 из 6 · ≈ 16 часов (+ ★ 13 часов) · Вакансия: [карточка](../../card.ru.md)

[1](06-websocket-demo-binance.md) · [2](06-websocket-demo-binance-part2.md) · [3](06-websocket-demo-binance-part3.md) · [4](06-websocket-demo-binance-part4.md) · [5](06-websocket-demo-binance-part5.md) · [6](06-websocket-demo-binance-part6.md) · [7](06-websocket-demo-binance-part7.md) · Часть 8 из 11 · [9](06-websocket-demo-binance-part9.md) · [10](06-websocket-demo-binance-part10.md) · [11](06-websocket-demo-binance-part11.md)

## Этап 7. Свечной график на Skia: live, pan, pinch, перекрестие, оси (2,25 ч)

**Цель.** Экран символа уровня трейдингового приложения: 500 минутных свечей из REST, живая свеча раз в 2 с и rollover, pan с инерцией, pinch-zoom вокруг пальцев, удержание — перекрестие с OHLC, шкала цен и сетка, объём, линия последней цены. Ноль ре-рендеров во время жестов.

**Что нужно знать**

- **Дерево Skia статично.** 4 `<Path>` (рост и падение × свечи и объём), `<Picture>` для сетки и подписей, линии и тексты. Меняются только их пропсы — shared и derived values. React рендерит компонент, когда приходят новые свечи (раз в 2 с) и при смене темы; размер — shared value, без рендера.
- **Где что считается.** Геометрия кадра — `useDerivedValue(() => computeLayout(…))` из этапа 5. Пути — `usePathValue`: колбэк получает `SkPathBuilder`, результат — неизменяемый `SkPath` в shared value ([хуки Skia](https://wcandillon.github.io/react-native-skia/docs/animations/hooks/)). Число делений сетки меняется при зуме — поэтому `createPicture` внутри `useDerivedValue`, как свечи в [тренинге 4, упражнение 4](../04-animations-reanimated-skia/04-animations-reanimated-skia-part3.md).
- **Дорогое — один раз.** `matchFont` — на уровне модуля; `Skia.Paint()` — в `useMemo` по цвету темы: краска пересоздаётся только при смене темы. В кадре ничего не создаём, кроме путей и прямоугольников.
- **Цвета — из темы.** `useThemeColors()` (этап 0) даёт строки цветов для `color` у `<Path>`, `<Line>`, `<Text>` и для красок сетки. При смене темы компонент перерисуется: дерево Skia то же, меняются пропсы.
- **Данные на UI-поток** — `data.set(candles)` в `useEffect`, когда приходит новый массив, то есть раз в 2 с, а не в кадре.
- **Жесты GH 3** ([тренинг 4, блок 4](../04-animations-reanimated-skia/04-animations-reanimated-skia-part2.md)): скролл — `usePanGesture` с `activeOffsetX` и `changeX`, отпускание — `withDecay` с `clamp`; зум — `usePinchGesture`, `e.scale` считается от начала жеста; перекрестие — `usePanGesture({ activateAfterLongPress: 250 })`. Композиция: `useSimultaneousGestures(scroll, pinch)` и `useCompetingGestures(crosshair, …)` — первый активированный жест отменяет остальные.
- **Живой край.** Пришла новая свеча, а ты в истории — `followLiveEdge` сдвигает `offset`, и картинка не уезжает.
- **Размер** — из `className` контейнера (`h-80` по умолчанию): `onLayout` пишет ширину и высоту в shared value `size`, Canvas — `StyledCanvas` с `className="flex-1"`. `onSize` у Canvas не используем: в Skia 3 его нет.

**Шаги** (135 мин)

| # | Мин | Что делаешь |
|---|---|---|
| 1 | 20 | Данные: `useKlines` + `useKlineStream` (готовые), экран символа |
| 2 | 15 | Каркас `CandleChart`: размер, данные на UI-поток, `layout` |
| 3 | 30 | Сам: свечи и объём в `chartPaths.ts` |
| 4 | 10 | Сетка и шкала цен: `Picture`; подпись последней цены |
| 5 | 30 | Сам: pan с инерцией и pinch вокруг пальцев в `useChartGestures.ts` |
| 6 | 15 | Перекрестие с OHLC; проверка «ноль ре-рендеров» |
| 7 | 15 | Устройство: чек-лист ниже, `PerformanceMonitor` |

1. **Данные** (20 мин) — готовые хуки:
   ```ts
   // src/features/symbol/useKlines.ts
   import { useQuery, useQueryClient } from '@tanstack/react-query';
   import { useEffect } from 'react';

   import { candleFromKline } from '../../binance/mappers';
   import { fetchKlines } from '../../binance/rest';
   import { KlineSchema } from '../../binance/schemas';
   import { klineStream } from '../../binance/streams';
   import { upsertCandle } from '../../chart/series';
   import type { ChartCandle } from '../../chart/types';
   import { metrics } from '../../dev/metrics';
   import { realtime } from '../../realtime/client';

   export const INTERVAL_MS = { '1m': 60_000, '5m': 300_000, '1h': 3_600_000 } as const;
   export type Interval = keyof typeof INTERVAL_MS;
   export const klinesKey = (symbol: string, interval: Interval) => ['klines', symbol, interval] as const;

   // История: 500 свечей по REST (weight 2, ≈ 85 КБ без gzip)
   export function useKlines(symbol: string, interval: Interval = '1m') {
     return useQuery({ queryKey: klinesKey(symbol, interval), queryFn: ({ signal }) => fetchKlines(symbol, interval, 500, signal) });
   }

   // Живая свеча раз в 2 с — редкое событие: пишем прямо в кэш Query. Дыра → история по REST
   export function useKlineStream(symbol: string, interval: Interval = '1m') {
     const queryClient = useQueryClient();
     useEffect(
       () =>
         realtime.subscribe(klineStream(symbol, interval), (data) => {
           const r = KlineSchema.safeParse(data);
           if (!r.success) {
             metrics.invalid++;
             return;
           }
           let gap = false;
           queryClient.setQueryData<ChartCandle[]>(klinesKey(symbol, interval), (old) => {
             if (!old) return old; // истории ещё нет: REST вернёт и текущую свечу
             const res = upsertCandle(old, candleFromKline(r.data), INTERVAL_MS[interval]);
             gap = res.kind === 'gap';
             return res.list;
           });
           if (gap) {
             metrics.gaps++;
             void queryClient.invalidateQueries({ queryKey: klinesKey(symbol, interval) });
           }
         }),
       [queryClient, symbol, interval],
     );
   }
   ```
   Подход «поток пишет в кэш Query» — из [статьи TkDodo](https://tkdodo.eu/blog/using-web-sockets-with-react-query). Котировкам он не подходит (десятки событий в секунду), свече — подходит. `subscribe` возвращает отписку — она и есть cleanup эффекта. Экран `src/app/symbol/[symbol].tsx`: `useLocalSearchParams`, цена из `useTicker(symbol)` (один компонент, ≤ 5 рендеров в секунду — допустимо), `useKlines`, `useKlineStream`, `<CandleChart candles={klines.data ?? []} className="h-80" />`, `testID="symbol-screen"`, подпись источника данных. Стили — `className`: `flex-1 gap-3 bg-bg p-4`, цена — `text-3xl font-semibold tabular-nums text-fg`. Цвет изменения за 24 ч — `text-up` / `text-down` / `text-muted` по знаку: этот экран и так рендерится раз в пачку, поэтому `className` по условию здесь допустим.
2. **График** — компонент готовый, твои части — в шагах 3 и 5:
   ```tsx
   // src/features/symbol/CandleChart.tsx
   import { useEffect, useMemo, useRef } from 'react';
   import { Platform, View } from 'react-native';
   import { GestureDetector } from 'react-native-gesture-handler';
   import { useDerivedValue, useSharedValue } from 'react-native-reanimated';
   import { createPicture, DashPathEffect, Group, Line, matchFont, Path, Picture, Skia, Text, usePathValue, vec } from 'react-native-skia';

   import { computeLayout, indexAtX, priceY, xCenter } from '../../chart/layout';
   import { yToPrice } from '../../chart/scale';
   import { formatFixed, priceDigits, stepDecimals } from '../../chart/ticks';
   import type { ChartCandle } from '../../chart/types';
   import { followLiveEdge } from '../../chart/viewport';
   import { StyledCanvas } from '../../ui/styled';
   import { useThemeColors } from '../../ui/theme';
   import { appendCandles, appendVolume } from './chartPaths';
   import { useChartGestures } from './useChartGestures';

   // Шрифт от темы не зависит — один раз на модуль
   const font = matchFont({ fontFamily: Platform.select({ ios: 'Helvetica', default: 'sans-serif' }), fontSize: 11 });

   type Props = { candles: ChartCandle[]; className?: string };

   export function CandleChart({ candles, className = 'h-80' }: Props) {
     const c = useThemeColors(); // токены темы → цвета Skia; меняются только при смене темы
     // Краски — раз на тему, не в рендере тиков и не в кадре
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

     const size = useSharedValue({ width: 0, height: 0 }); // размер из className контейнера, через onLayout
     const data = useSharedValue<ChartCandle[]>([]); // копия на UI-поток: раз в 2 с, не на кадр
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
         const appended = candles.filter((k) => k.t > prev).length; // rollover: обычно 1
         offset.set(followLiveEdge(offset.get(), appended, candleW.get()));
       }
       data.set(candles);
     }, [candles, data, offset, candleW]);

     const count = useDerivedValue(() => data.get().length);
     const width = useDerivedValue(() => size.get().width);
     const gesture = useChartGestures({ candleW, offset, crossX, crossY, count, width });

     // Геометрия кадра — на UI-потоке; пересчёт, только когда меняются данные, зум, сдвиг или размер
     const layout = useDerivedValue(() =>
       computeLayout(data.get(), { candleW: candleW.get(), offset: offset.get() }, size.get().width, size.get().height),
     );
     const upCandles = usePathValue((b) => {
       'worklet';
       appendCandles(b, data.get(), layout.get(), true);
     });
     const downCandles = usePathValue((b) => {
       'worklet';
       appendCandles(b, data.get(), layout.get(), false);
     });
     const upVolume = usePathValue((b) => {
       'worklet';
       appendVolume(b, data.get(), layout.get(), true);
     });
     const downVolume = usePathValue((b) => {
       'worklet';
       appendVolume(b, data.get(), layout.get(), false);
     });

     // Сетка и шкала цен: число делений меняется при зуме → Picture (команды рисования), а не N узлов
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

     // Линия последней цены
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

     // Перекрестие: свеча под пальцем, OHLC сверху, цена под пальцем справа
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
           <StyledCanvas className="flex-1">
             <Picture picture={grid} />
             <Path path={upVolume} color={c.up} opacity={0.3} />
             <Path path={downVolume} color={c.down} opacity={0.3} />
             <Path path={upCandles} color={c.up} />
             <Path path={downCandles} color={c.down} />
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
   ```
   `lastT` — `useRef`, но читаем и пишем его только в эффекте: в рендере это ошибка `react-hooks/refs`. Краски сетки и подписей — в `useMemo` по цвету: worklet `createPicture` захватывает новые краски после смены темы. `canvas.drawText(text, x, y, paint, font)` — `y` у текста — базовая линия, а не верх.
3. **Свечи и объём** (30 мин, сам):
   ```ts
   // src/features/symbol/chartPaths.ts
   import { rect, type SkPathBuilder } from 'react-native-skia';

   import { priceY, volumeY, xCenter, type ChartLayout } from '../../chart/layout';
   import type { ChartCandle } from '../../chart/types';

   // Все растущие (или все падающие) свечи — в ОДИН путь: 2 узла Skia вместо 2 × N
   export function appendCandles(b: SkPathBuilder, list: readonly ChartCandle[], L: ChartLayout, up: boolean): void {
     'worklet';
     for (let i = L.first; i <= L.last; i++) {
       const c = list[i];
       if (!c || c.c >= c.o !== up) continue;
       const x = xCenter(i, L);
       // TODO: тень — b.addRect(rect(x − 0.5, y(high), 1, y(low) − y(high)));
       //       тело — rect(x − bodyW / 2, min(y(open), y(close)), bodyW, max(1, |y(close) − y(open)|)); y(p) = priceY(p, L)
     }
   }

   export function appendVolume(b: SkPathBuilder, list: readonly ChartCandle[], L: ChartLayout, up: boolean): void {
     'worklet';
     for (let i = L.first; i <= L.last; i++) {
       const c = list[i];
       if (!c || c.c >= c.o !== up) continue;
       const y = volumeY(c.v, L);
       b.addRect(rect(xCenter(i, L) - L.bodyW / 2, y, L.bodyW, L.volBottom - y));
     }
   }
   ```
   Тень — прямоугольник шириной 1 px, а не линия: у залитого пути линия нулевой площади не рисуется. Перекрытие тени и тела в одном пути — не проблема.
4. **Сетка и шкала** (10 мин). Прочитай `grid` и подпись последней цены в компоненте. Поэкспериментируй: 48 px между делениями — в `computeLayout`; что будет при 24 px?
5. **Жесты** (30 мин, сам) — каркас `src/features/symbol/useChartGestures.ts`:
   ```ts
   import { useCompetingGestures, usePanGesture, usePinchGesture, useSimultaneousGestures } from 'react-native-gesture-handler';
   import { cancelAnimation, useSharedValue, withDecay, type SharedValue } from 'react-native-reanimated';

   import { AXIS_W } from '../../chart/layout';
   import { maxOffset, panBy, zoomAt } from '../../chart/viewport';

   type Args = {
     candleW: SharedValue<number>;
     offset: SharedValue<number>;
     crossX: SharedValue<number>; // −1 — перекрестия нет
     crossY: SharedValue<number>;
     count: SharedValue<number>;
     width: SharedValue<number>; // ширина Canvas вместе со шкалой цен
   };

   // Все колбэки — worklets на UI-потоке: ни одного ре-рендера во время жеста
   export function useChartGestures({ candleW, offset, crossX, crossY, count, width }: Args) {
     const pinching = useSharedValue(false);
     const startW = useSharedValue(0);
     const startOffset = useSharedValue(0);
     const focalX = useSharedValue(0);

     const scroll = usePanGesture({
       activeOffsetX: [-8, 8],
       onBegin: () => {
         cancelAnimation(offset); // палец остановил инерцию
       },
       onUpdate: (e) => {
         if (pinching.get()) return; // во время pinch сдвиг считает zoomAt
         // TODO: offset ← panBy(offset, e.changeX, count, candleW, width − AXIS_W)
       },
       onDeactivate: (e) => {
         if (pinching.get()) return;
         // TODO: инерция — withDecay({ velocity: e.velocityX, clamp: [0, maxOffset(…)] })
       },
     });

     const pinch = usePinchGesture({
       onActivate: (e) => {
         pinching.set(true);
         // TODO: запомни startW, startOffset и focalX — масштаб считаем от начала жеста
       },
       onUpdate: (e) => {
         // TODO: vp = zoomAt({ candleW: startW, offset: startOffset }, e.scale, focalX, width − AXIS_W, count) → candleW, offset
       },
       onFinalize: () => {
         pinching.set(false);
       },
     });

     // Удержание 250 мс — перекрестие; быстрое движение достаётся скроллу
     const crosshair = usePanGesture({
       activateAfterLongPress: 250,
       onActivate: (e) => {
         crossX.set(e.x);
         crossY.set(e.y);
       },
       onUpdate: (e) => {
         crossX.set(e.x);
         crossY.set(e.y);
       },
       onFinalize: () => {
         crossX.set(-1);
       },
     });

     const navigate = useSimultaneousGestures(scroll, pinch);
     return useCompetingGestures(crosshair, navigate);
   }
   ```
   Почему `changeX`, а не `translationX`: после pinch смещение от начала pan уже не верно, а приращение — верно. Каркас и шаг 3 компилируются; ESLint предупреждает о неиспользуемых переменных — предупреждения уйдут вместе с TODO.
6. **Перекрестие и «ноль ре-рендеров»** (15 мин). Оберни `CandleChart` в `<Counted id="chart">` из этапа 6: во время pan, pinch и перекрестия счётчик не растёт; растёт раз в 2 с — от новой свечи. ★ Подпись OHLC не вылезает за край: `font.measureText(text).width` и `clamp`.
7. **Устройство** (15 мин) — чек-лист ниже. В dev включи `<PerformanceMonitor />` из Reanimated (этап 8): ориентир по FPS JS и UI. Честный FPS — release-сборка `preview` (этап 8).

**Критерии приёмки**

- [ ] 500 свечей; последняя меняется раз в ≈ 2 с; на границе минуты появляется новая свеча, и если ты у правого края — график едет за рынком.
- [ ] Ушёл в историю — новая свеча не сдвигает картинку; скролл не уходит дальше первой свечи; инерция есть.
- [ ] Pinch: свеча под пальцами остаётся на месте; второй pinch не «прыгает»; ширина свечи 3–32 px.
- [ ] Удержание 250 мс → перекрестие с OHLC и ценой под пальцем; быстрый свайп — скролл, а не перекрестие.
- [ ] Шкала цен — «круглые» деления, подписи без `84710.60000000001`; объём не перекрывает свечи.
- [ ] Ноль ре-рендеров во время жестов (Profiler); после режима полёта история перезапрашивается, дыр нет.
- [ ] Ушёл с экрана — `UNSUBSCRIBE` для `@kline_1m` (видно в логе исходящих сообщений).
- [ ] Цвета графика — из темы: после смены темы (кнопка Theme в списке) свечи, сетка и подписи перекрашены.

**Самопроверка**

- Почему свечи — 4 пути, а сетка — `Picture`? Что изменится, если рисовать 500 `<Rect>`?
- Где выполняется `computeLayout` и почему там можно читать `data.get()`?
- Что будет, если копировать свечи на UI-поток в каждом кадре?
- Почему pan и pinch — simultaneous, а перекрестие с ними — competing?
- Как цвет `--color-up` из `global.css` доходит до краски Skia? Что будет, если создавать `Paint` в рендере или в кадре?
- 50 000 свечей: что сделаешь? (Агрегация в старший таймфрейм — `aggregate`, ★ G; рисуем только видимое.)

**Готово, когда…** график на телефоне ведёт себя как в трейдинговом приложении, а на «почему так?» по каждой строке у тебя есть ответ.

[Дальше: часть 9 — качество, наблюдаемость и open source →](06-websocket-demo-binance-part9.md)
