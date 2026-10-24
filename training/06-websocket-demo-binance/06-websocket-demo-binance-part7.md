# Итоговый проект: живой рынок на Expo — system design, WebSocket, графики на Skia

Обновлено: 2026-10-21 · Тренинг 6 из 6 · ≈ 16 часов (+ ★ 13 часов) · Вакансия: [карточка](../../card.ru.md)

[1](06-websocket-demo-binance.md) · [2](06-websocket-demo-binance-part2.md) · [3](06-websocket-demo-binance-part3.md) · [4](06-websocket-demo-binance-part4.md) · [5](06-websocket-demo-binance-part5.md) · [6](06-websocket-demo-binance-part6.md) · Часть 7 из 11 · [8](06-websocket-demo-binance-part8.md) · [9](06-websocket-demo-binance-part9.md) · [10](06-websocket-demo-binance-part10.md) · [11](06-websocket-demo-binance-part11.md)

Этап 5 — математика графика по тестам. Этап 6 — watchlist, в котором строки не перерисовываются на тиках.

## Этап 5. Математика графика: чистые функции по тестам (1,5 ч)

**Цель.** Вся геометрия графика — чистые функции с тестами: шкалы, окно просмотра, «красивые» деления, живая свеча и rollover. Пишешь их сам по готовым тестам, как `RealtimeClient`.

**Что нужно знать**

- Модель окна: свеча `count − 1` — самая новая, справа. `candleW` — ширина слота свечи вместе с зазором, px. `offset` — сдвиг в историю от правого края, px. Центр свечи `i`: `x = width + offset − (count − 1 − i) × candleW − candleW / 2`.
- В каждой функции — `'worklet'`: их зовут из `useDerivedValue`, `usePathValue` и колбэков жестов на UI-потоке. Внутри — только математика и другие worklets; без `Intl`, без React.
- Это продолжение [тренинга 4, блок 7](../04-animations-reanimated-skia/04-animations-reanimated-skia-part3.md): `toY` → `priceToY`, `nearestIndex` → `indexAtX`, `visibleRange` — тот же, с теми же тестами.
- Тесты — Jest, как весь репозиторий: один `npm test`, покрытие, CI. Модули не импортируют React, RN, Skia и `uniwind`, поэтому работают и в голом Node: `npx tsx scripts/chart-repl.ts` с парой `console.log(niceTicks(…), zoomAt(…))` — быстрый способ «пощупать» функцию.
- Деньги здесь не считаем: для рисования хватает `number` ([тренинг 2, блок 5](../02-trading-app-architecture/02-trading-app-architecture-part2.md)).

**Шаги** (90 мин): прочитать тесты (10) → `scale.ts` (15) → `viewport.ts` (25) → `ticks.ts` (20) → `series.ts` (10) → `layout.ts` (10). Держи `npx jest --watch src/chart`.

**Контракт** — типы и сигнатуры готовы, тела пишешь сам (`return` — заглушки, чтобы всё компилировалось):

```ts
// src/chart/types.ts — готовый
export type ChartCandle = { t: number; o: number; h: number; l: number; c: number; v: number };
export type Viewport = { candleW: number; offset: number };
export type PriceRange = { min: number; max: number };

// src/chart/scale.ts
export function priceToY(price: number, range: PriceRange, top: number, bottom: number): number; // бо́льшая цена выше; плоско — середина
export function yToPrice(y: number, range: PriceRange, top: number, bottom: number): number; // обратная
export function minMax(values: readonly number[]): PriceRange; // пусто → { min: 0, max: 1 }
export function priceRange(candles: readonly ChartCandle[], first: number, last: number, padRatio = 0.08): PriceRange;

// src/chart/viewport.ts — MIN_CANDLE_W = 3, MAX_CANDLE_W = 32
export function visibleRange(offset: number, candleW: number, width: number, count: number): [number, number];
export function maxOffset(count: number, candleW: number, width: number): number;
export function panBy(offset: number, dx: number, count: number, candleW: number, width: number): number;
export function zoomAt(start: Viewport, scale: number, focalX: number, width: number, count: number, minW?: number, maxW?: number): Viewport;
export function followLiveEdge(offset: number, appended: number, candleW: number): number;

// src/chart/ticks.ts
export function niceStep(span: number, maxTicks: number): number; // 1, 2, 5 × 10^k
export function stepDecimals(step: number): number;
export function niceTicks(min: number, max: number, maxTicks = 5): number[];
export function priceDigits(price: number): number; // ≥ 1000 → 2, ≥ 1 → 3, ≥ 0.01 → 5, иначе 8
export function formatFixed(value: number, decimals: number): string; // без Intl: "84,710.60"

// src/chart/series.ts
export function upsertCandle(list: ChartCandle[], c: ChartCandle, intervalMs: number, max = 1000):
  { list: ChartCandle[]; kind: 'replaced' | 'appended' | 'stale' | 'gap' };
export function applyTick(list: ChartCandle[], price: number, time: number, intervalMs: number, max = 1000): ChartCandle[];
export function aggregate(list: readonly ChartCandle[], intervalMs: number, factor: number): ChartCandle[]; // ★

// src/chart/layout.ts — AXIS_W = 64, TIME_H = 18; ChartLayout: count, first, last, width, candleW, bodyW, offset,
// range, priceTop, priceBottom, volTop, volBottom, maxVol, ticks, tickStep
export function computeLayout(candles: readonly ChartCandle[], vp: Viewport, width: number, height: number): ChartLayout;
export function xCenter(i: number, L: ChartLayout): number;
export function indexAtX(x: number, L: ChartLayout): number; // в [0, count − 1]
export function priceY(price: number, L: ChartLayout): number;
export function volumeY(v: number, L: ChartLayout): number; // maxVol → volTop, 0 → volBottom
```

`computeLayout`: `width` области свечей = ширина Canvas − `AXIS_W`; видимые свечи — `visibleRange`; шкала цен — `priceRange` по ним; полоса объёма — нижние 18% высоты над `TIME_H`; цены — от `priceTop = 8` до `priceBottom = volTop − 8`; делений — не больше `(priceBottom − priceTop) / 48`; `bodyW = max(1, floor(candleW × 0.7))`.

**Тесты** — готовые, по файлу на модуль:

```ts
// src/chart/scale.test.ts
import { minMax, priceRange, priceToY, yToPrice } from './scale';
import type { ChartCandle } from './types';

const c = (t: number, o: number, h: number, l: number, cl: number): ChartCandle => ({ t, o, h, l, c: cl, v: 1 });

test('priceToY: a higher price is higher on screen; yToPrice is the inverse', () => {
  const r = { min: 100, max: 200 };
  expect(priceToY(200, r, 0, 100)).toBe(0);
  expect(priceToY(100, r, 0, 100)).toBe(100);
  expect(priceToY(150, r, 10, 110)).toBe(60);
  expect(yToPrice(60, r, 10, 110)).toBe(150);
  expect(priceToY(5, { min: 5, max: 5 }, 0, 100)).toBe(50); // плоский ряд — середина
});

test('priceRange: only visible candles, padding, flat chart, no candles', () => {
  const list = [c(0, 10, 50, 5, 20), c(1, 20, 30, 18, 25), c(2, 25, 40, 22, 30)];
  expect(priceRange(list, 1, 2, 0)).toEqual({ min: 18, max: 40 }); // свеча 0 (high 50) не видна
  expect(priceRange(list, 1, 2, 0.5)).toEqual({ min: 7, max: 51 }); // отступ: 22 × 0.5 = 11
  expect(priceRange([c(0, 100, 100, 100, 100)], 0, 0)).toEqual({ min: 99, max: 101 });
  expect(priceRange([], 0, -1)).toEqual({ min: 0, max: 1 });
});

test('minMax for a sparkline', () => {
  expect(minMax([3, 1, 2])).toEqual({ min: 1, max: 3 });
  expect(minMax([])).toEqual({ min: 0, max: 1 });
});
```

```ts
// src/chart/viewport.test.ts
import { followLiveEdge, maxOffset, panBy, visibleRange, zoomAt } from './viewport';

test('visibleRange: the cases from training 4 still pass', () => {
  expect(visibleRange(0, 10, 100, 500)).toEqual([489, 499]);
  expect(visibleRange(25, 10, 100, 500)).toEqual([487, 497]);
  expect(visibleRange(0, 10, 100, 5)).toEqual([0, 4]);
  expect(visibleRange(0, 10, 100, 0)).toEqual([0, -1]);
});

test('panBy: finger to the right goes into history; clamped to [0, maxOffset]', () => {
  expect(maxOffset(500, 10, 100)).toBe(4900);
  expect(maxOffset(5, 10, 100)).toBe(0); // всё влезло — двигать некуда
  expect(panBy(0, 30, 500, 10, 100)).toBe(30);
  expect(panBy(10, -50, 500, 10, 100)).toBe(0);
  expect(panBy(4890, 50, 500, 10, 100)).toBe(4900);
});

test('zoomAt: the candle under the fingers stays in place', () => {
  const start = { candleW: 10, offset: 0 };
  expect(zoomAt(start, 2, 50, 100, 500)).toEqual({ candleW: 20, offset: 50 });
  expect(zoomAt(start, 2, 100, 100, 500)).toEqual({ candleW: 20, offset: 0 }); // зум у правого края
  expect(zoomAt(start, 10, 50, 100, 500).candleW).toBe(32); // MAX_CANDLE_W
  expect(zoomAt(start, 0.01, 50, 100, 500).candleW).toBe(3); // MIN_CANDLE_W
  expect(zoomAt({ candleW: 10, offset: 4900 }, 0.5, 50, 100, 500)).toEqual({ candleW: 5, offset: 2400 }); // clamp
});

test('followLiveEdge: at the live edge follow the market, in history stay still', () => {
  expect(followLiveEdge(0, 1, 10)).toBe(0);
  expect(followLiveEdge(0.4, 1, 10)).toBe(0); // хвост инерции — тоже «край»
  expect(followLiveEdge(300, 1, 10)).toBe(310);
});
```

```ts
// src/chart/ticks.test.ts
import { formatFixed, niceStep, niceTicks, priceDigits, stepDecimals } from './ticks';

test('niceStep: 1, 2 or 5 × 10^k', () => {
  expect(niceStep(200, 5)).toBe(50); // 40 → 50
  expect(niceStep(1, 5)).toBe(0.2);
  expect(niceStep(0.0005, 5)).toBe(0.0001);
  expect(niceStep(0, 5)).toBe(0);
});

test('niceTicks: round values inside [min, max]', () => {
  expect(niceTicks(84612.3, 84811.9, 5)).toEqual([84650, 84700, 84750, 84800]);
  expect(niceTicks(0.08321, 0.08369, 5)).toEqual([0.0833, 0.0834, 0.0835, 0.0836]); // без 0.08350000000000001
  expect(niceTicks(10, 10, 5)).toEqual([]);
});

test('stepDecimals and priceDigits', () => {
  expect([50, 1, 0.5, 0.05, 0.0001].map(stepDecimals)).toEqual([0, 0, 1, 2, 4]);
  expect([84710.6, 2.5, 0.08354, 0.000012].map(priceDigits)).toEqual([2, 3, 5, 8]);
});

test('formatFixed: thousands without Intl, no "-0.00"', () => {
  expect(formatFixed(84710.6, 2)).toBe('84,710.60');
  expect(formatFixed(1234567.891, 2)).toBe('1,234,567.89');
  expect(formatFixed(-1234.5, 1)).toBe('-1,234.5');
  expect(formatFixed(-0.0001, 2)).toBe('0.00');
  expect(formatFixed(999, 0)).toBe('999');
  expect(formatFixed(Number.NaN, 2)).toBe('—');
});
```

```ts
// src/chart/series.test.ts
import { aggregate, applyTick, upsertCandle } from './series';
import type { ChartCandle } from './types';

const M = 60_000;
const H = 3_600_000;
const k = (t: number, c: number): ChartCandle => ({ t, o: c, h: c, l: c, c, v: 1 });

test('upsertCandle: same t replaces, t + interval rolls over, older is ignored, a hole is a gap', () => {
  let r = upsertCandle([], k(0, 1), M);
  expect(r.kind).toBe('appended');
  r = upsertCandle(r.list, k(0, 2), M);
  expect(r).toEqual({ list: [k(0, 2)], kind: 'replaced' });
  r = upsertCandle(r.list, k(M, 3), M, 1); // rollover; max = 1 обрезает хвост
  expect(r).toEqual({ list: [k(M, 3)], kind: 'appended' });
  const list = r.list;
  expect(upsertCandle(list, k(0, 9), M).kind).toBe('stale');
  expect(upsertCandle(list, k(0, 9), M).list).toBe(list); // та же ссылка — без ре-рендера
  expect(upsertCandle(list, k(3 * M, 4), M)).toEqual({ list, kind: 'gap' }); // нет свечи 2M → история по REST
});

test('applyTick: price ticks build candles of the interval', () => {
  let s = applyTick([], 100, 10 * H + 5, H);
  expect(s).toEqual([{ t: 10 * H, o: 100, h: 100, l: 100, c: 100, v: 0 }]);
  s = applyTick(s, 103, 10 * H + M, H);
  s = applyTick(s, 99, 10 * H + 2 * M, H);
  expect(s).toEqual([{ t: 10 * H, o: 100, h: 103, l: 99, c: 99, v: 0 }]);
  expect(applyTick(s, 99, 10 * H + 3 * M, H)).toBe(s); // цена та же — та же ссылка
  expect(applyTick(s, 50, 9 * H, H)).toBe(s); // опоздавший тик
  s = applyTick(s, 101, 11 * H, H, 1); // новый час; max = 1
  expect(s).toEqual([{ t: 11 * H, o: 101, h: 101, l: 101, c: 101, v: 0 }]);
});

test('★ aggregate: 1m × 5 → 5m', () => {
  const list = [0, 1, 2, 3, 4, 5].map((i) => ({ t: i * M, o: 10 + i, h: 20 + i, l: 5 - i, c: 11 + i, v: 1 }));
  expect(aggregate(list, M, 5)).toEqual([
    { t: 0, o: 10, h: 24, l: 1, c: 15, v: 5 },
    { t: 5 * M, o: 15, h: 25, l: 0, c: 16, v: 1 },
  ]);
});
```

```ts
// src/chart/layout.test.ts
import { AXIS_W, computeLayout, indexAtX, priceY, volumeY, xCenter } from './layout';

const candles = Array.from({ length: 100 }, (_, i) => ({ t: i * 60_000, o: 100, h: 110 + (i % 3), l: 90, c: 105, v: i }));

test('computeLayout: visible range, price range of the visible candles, volume, ticks', () => {
  const L = computeLayout(candles, { candleW: 10, offset: 0 }, 100 + AXIS_W, 300);
  expect([L.first, L.last, L.width]).toEqual([89, 99, 100]);
  expect(L.maxVol).toBe(99);
  expect(L.ticks.length).toBeGreaterThanOrEqual(2);
  expect(L.ticks.every((p) => p >= L.range.min && p <= L.range.max)).toBe(true);
  expect(L.priceBottom).toBeLessThan(L.volTop); // цены и объём не перекрываются
});

test('xCenter and indexAtX agree; prices and volume map to their areas', () => {
  const L = computeLayout(candles, { candleW: 10, offset: 25 }, 100 + AXIS_W, 300);
  expect(xCenter(97, L)).toBe(100);
  expect(xCenter(99, L)).toBe(120); // правее области: мы на 2,5 свечи в истории
  expect(indexAtX(100, L)).toBe(97);
  expect(indexAtX(1e6, L)).toBe(99);
  expect(indexAtX(-1e6, L)).toBe(0);
  expect(priceY(L.range.max, L)).toBe(L.priceTop);
  expect(L.maxVol).toBe(97); // видны свечи 87…97
  expect(volumeY(97, L)).toBe(L.volTop);
  expect(volumeY(0, L)).toBe(L.volBottom);
});
```

**Подсказки** (открывай по одной)

1. `priceToY`: доля `(price − min) / (max − min)` от низа: `bottom − доля × (bottom − top)`.
2. `visibleRange`: `last = count − 1 − floor(offset / candleW)`, `first = count − 1 − floor((width + offset) / candleW)`, обе в границах.
3. `zoomAt`: сначала «сколько свечей от точки под пальцами до правого края» в старом масштабе: `(width + offset − focalX) / candleW`. Новый `offset` — такое же число свечей в новом масштабе, минус `width − focalX`. Потом `clamp`.
4. `niceStep`: `raw = span / maxTicks`; `pow = 10 ** floor(log10(raw))`; `f = raw / pow` → 1, 2, 5 или 10.
5. `niceTicks`: цикл по целым `k` от `ceil(min / step)`; значение — `Number((k × step).toFixed(stepDecimals(step)))`; верхняя граница с допуском `step × 1e-9`.
6. `formatFixed`: `Math.abs(value).toFixed(decimals)`, запятые — с конца целой части через три цифры; знак «−» — только если число после округления не ноль.
7. `applyTick`: корзина `floor(time / interval) × interval`; та же корзина — обновить `c`, `h`, `l`; новая — свеча `o = h = l = c = price`.

**Критерии приёмки**

- [ ] 16 тестов `src/chart` зелёные; в `src/chart` нет импортов `react`, `react-native`, Skia и `uniwind`.
- [ ] В каждой функции, которую зовут на UI-потоке, есть `'worklet'`.
- [ ] Ты объясняешь `zoomAt` на бумаге с числами из теста.

**Самопроверка**

- Почему `upsertCandle` возвращает ту же ссылку для опоздавшего события?
- Что сделает график, если `kind === 'gap'`, и почему не дорисовывать пустые свечи сами?
- Почему `formatFixed`, а не `Intl.NumberFormat`, на UI-потоке?

**Готово, когда…** тесты зелёные, а `zoomAt` и `niceTicks` ты пишешь заново за 10 минут без подсказок.

## Этап 6. Watchlist: строки без ре-рендеров, вспышка, sparkline на Skia (1,5 ч)

**Цель.** 20 строк живут, но React их не перерисовывает на тиках. Цена, изменение, вспышка, цвет и sparkline обновляются на UI-потоке. Стили — `className` на токенах темы. Доказательство — `<Profiler>`.

**Что нужно знать**

- **Transient updates** — приём из [README Zustand](https://github.com/pmndrs/zustand#transient-updates-for-often-occurring-state-changes): `subscribe` вне рендера, без ре-рендера. Строка подписывается в `useEffect` и пишет shared values. React рендерит строку при монтировании, при смене символа и при смене темы.
- **Текст без ре-рендера** — `AnimatedTextInput` + `useAnimatedProps(() => ({ text, defaultValue }))` и `editable={false}` ([тренинг 4, упражнение 1](../04-animations-reanimated-skia/04-animations-reanimated-skia-part2.md)). Форматируем на JS-потоке (`Intl` — раз на пачку), UI-поток только показывает строку.
- **Стили строки.** Статика — `className`: `h-14 flex-row items-center gap-3 px-4`, `tabular-nums` (цифры одной ширины не «прыгают»). Анимирует только Reanimated: вспышка — два слоя `bg-up` и `bg-down`, у них меняется только `opacity`; цвет процента — `interpolateColor` в `useAnimatedStyle`. Переключить `className` на тике — значит вернуть рендер.
- **Цвета для worklet.** `interpolateColor` нужны строки цветов: `useThemeColors()` (этап 0) берёт их из CSS-переменных темы. Hex в коде строки нет.
- **FlashList переиспользует строки**: строка BTC может стать строкой SOL. Прошлая цена живёт внутри эффекта конкретного символа; при смене символа — сброс вспышки и точек.
- **Sparkline**: 24 часовые свечи по REST (`klines?interval=1h&limit=24`, weight 2, ≈ 4,3 КБ), последняя точка — из тика через `applyTick`. Путь строит `usePathValue` на UI-потоке из shared value; размер Canvas — из `className` через `onLayout`. Canvas в каждой строке — нормально для ≈ 15 видимых строк; для сотен строк — один Canvas или статичные картинки.
- Счётчик рендеров — `src/dev/renderStats.tsx` из этапа 4 ([часть 6](06-websocket-demo-binance-part6.md)).

**Шаги** (90 мин)

1. **Форматтеры** (10 мин, сам). `src/features/watchlist/format.ts`: `formatPrice(value: string)` — `Intl.NumberFormat('en-US')`, число знаков — `priceDigits` из `src/chart/ticks.ts`; `changePct(last, open): number | null` — 2 знака, округление до вывода; `formatPct(pct)` — знак ставишь сам: `signDisplay` в Hermes на iOS нет ([IntlAPIs.md](https://github.com/facebook/hermes/blob/static_h/doc/IntlAPIs.md)). Форматтеры создавай один раз (`Map` по числу знаков). Тест готовый:
   ```ts
   // src/features/watchlist/format.test.ts
   import { changePct, formatPct, formatPrice } from './format';

   test('price digits depend on the price level', () => {
     expect(formatPrice('84710.60000000')).toBe('84,710.60');
     expect(formatPrice('2.50000000')).toBe('2.500');
     expect(formatPrice('0.08354000')).toBe('0.08354');
     expect(formatPrice('abc')).toBe('—');
   });

   test('24h change: sign, rounding, no "-0.00"', () => {
     expect(changePct('84710.6', '82425.35')).toBe(2.77);
     expect(formatPct(changePct('84710.6', '82425.35'))).toBe('+2.77%');
     expect(formatPct(changePct('99', '100'))).toBe('-1.00%');
     expect(formatPct(changePct('99.999', '100'))).toBe('0.00%');
     expect(formatPct(changePct('1', '0'))).toBe('—');
   });
   ```
   Jest работает в Node (V8, полный ICU): зелёный тест не доказывает поведение Hermes — проверь цифры на устройстве.
2. **Список** (10 мин). `src/app/index.tsx`: `useTickerSnapshot(WATCHLIST)`, `useWatchlistStream(WATCHLIST, stress, flushMs)`, FlashList с `data={WATCHLIST}` (символы, не тикеры) и `keyExtractor={(s) => s}`; переход — `router.push({ pathname: '/symbol/[symbol]', params: { symbol } })` через `useCallback`. Фон — `View className="flex-1 bg-bg"` вокруг списка, место под баннер — `ListFooterComponent={<View className="h-24" />}`. Вокруг FlashList — `<Profiler id="list" onRender={countCommit}>`, вокруг строки — `<Counted id={item}>`. В `__DEV__` — кнопки (`Pressable` + `Text` с `className`): Stress on / off, Batch 200 ms / No batching (`flushMs` 0), Measure 10 s и Theme — `Uniwind.setTheme(theme === 'dark' ? 'light' : 'dark')`, `theme` — из `useUniwind()`.
3. **Строка** (30 мин, сам) — каркас, TODO внутри эффекта:
   ```tsx
   // src/features/watchlist/TickerRow.tsx — импорты: react, react-native, reanimated, applyTick, useQuotes, useThemeColors, format, Sparkline
   const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
   const HOUR = 3_600_000;
   // Новая анимация на каждую вспышку: объект анимации одноразовый
   const flash = () => withSequence(withTiming(1, { duration: 0 }), withTiming(0, { duration: 600 }));

   export const TickerRow = memo(function TickerRow({ symbol, onPress }: { symbol: string; onPress: (s: string) => void }) {
     const spark = useSparkline(symbol);
     const c = useThemeColors(); // цвета для worklet и Skia: className туда не дотянется
     const priceText = useSharedValue('—');
     const pctText = useSharedValue('—');
     const trend = useSharedValue(0); // −1…1: цвет изменения за 24 ч
     const flashUp = useSharedValue(0); // 1 → 0: сила зелёной вспышки
     const flashDown = useSharedValue(0); // 1 → 0: сила красной вспышки
     const closes = useSharedValue<number[]>([]); // точки sparkline

     useEffect(() => {
       let series: ChartCandle[] = spark.data ?? []; // 24 часовые свечи (REST)
       let lastPrice: string | null = null; // прошлая цена ЭТОГО символа — для вспышки
       const apply = (t: Ticker | undefined, animate: boolean) => {
         if (!t) return;
         // TODO 1: animate и цена изменилась → (рост ? flashUp : flashDown).set(flash())
         // TODO 2: priceText / pctText — formatPrice, formatPct(changePct(…)); trend → знак изменения (withTiming, если animate)
         // TODO 3: series = applyTick(series, цена, t.eventTime, HOUR, 24); новая ссылка → closes.set(series.map((k) => k.c))
         lastPrice = t.last;
       };
       flashUp.set(0); // строка могла достаться от другого символа
       flashDown.set(0);
       closes.set(series.map((k) => k.c));
       apply(useQuotes.getState().bySymbol[symbol], false); // текущее значение — без вспышки
       // TODO 4: return useQuotes.subscribe((state, prev) => …) — apply(t, true), только если ссылка на тикер символа изменилась
     }, [symbol, spark.data, priceText, pctText, trend, flashUp, flashDown, closes]);

     // Цвет вспышки задаёт className слоя (bg-up / bg-down); анимируется только opacity
     const upFlashStyle = useAnimatedStyle(() => ({ opacity: flashUp.get() * 0.3 }));
     const downFlashStyle = useAnimatedStyle(() => ({ opacity: flashDown.get() * 0.3 }));
     const priceProps = useAnimatedProps(() => ({ text: priceText.get(), defaultValue: priceText.get() }));
     const pctProps = useAnimatedProps(() => ({ text: pctText.get(), defaultValue: pctText.get() }));
     const pctStyle = useAnimatedStyle(() => ({
       color: interpolateColor(trend.get(), [-1, 0, 1], [c.down, c.muted, c.up]),
     }));

     return (
       <Pressable onPress={() => onPress(symbol)} testID={`row-${symbol}`} accessibilityRole="button" accessibilityLabel={symbol}>
         <Animated.View pointerEvents="none" className="absolute inset-0 bg-up" style={upFlashStyle} />
         <Animated.View pointerEvents="none" className="absolute inset-0 bg-down" style={downFlashStyle} />
         <View className="h-14 flex-row items-center gap-3 px-4">
           <Text className="flex-1 text-base font-semibold text-fg">{symbol.replace(/USDT$/, '')}</Text>
           <Sparkline values={closes} up={c.up} down={c.down} className="h-7 w-18" />
           <AnimatedTextInput editable={false} className="w-26 text-right text-base tabular-nums text-fg" animatedProps={priceProps} />
           <AnimatedTextInput editable={false} className="w-18 text-right tabular-nums" style={pctStyle} animatedProps={pctProps} />
         </View>
       </Pressable>
     );
   });
   ```
   `className` и анимированный `style` на одном элементе — нормально: статика из класса, анимированное свойство — из Reanimated, inline-стиль сильнее класса. `w-26` = 104 px, `w-18` = 72 px, `h-7` = 28 px: в Tailwind 4 шаг шкалы — 4 px.
4. **Sparkline** (20 мин). Данные — `useSparkline(symbol)`: `useQuery({ queryKey: ['spark', symbol], queryFn: ({ signal }) => fetchKlines(symbol, '1h', 24, signal), staleTime: 5 * 60_000 })`. Компонент:
   ```tsx
   // src/features/watchlist/Sparkline.tsx
   import { Path, usePathValue } from 'react-native-skia';
   import { useDerivedValue, useSharedValue, type SharedValue } from 'react-native-reanimated';

   import { minMax, priceToY } from '../../chart/scale';
   import { StyledCanvas } from '../../ui/styled';

   type Props = { values: SharedValue<number[]>; up: string; down: string; className?: string };

   // Размер — из className через onLayout; путь строится на UI-потоке: новая точка не вызывает ре-рендер строки
   export function Sparkline({ values, up, down, className }: Props) {
     const size = useSharedValue({ width: 0, height: 0 });
     const path = usePathValue((b) => {
       'worklet';
       const { width, height } = size.get();
       const v = values.get();
       if (v.length < 2 || width === 0) return;
       const range = minMax(v);
       const step = width / (v.length - 1);
       // TODO: moveTo первой точки, lineTo остальных: x = i × step, y = priceToY(v[i], range, 2, height − 2)
     });
     const color = useDerivedValue(() => {
       const v = values.get();
       return v.length > 1 && v[v.length - 1]! < v[0]! ? down : up;
     });
     return (
       <StyledCanvas
         className={className}
         pointerEvents="none"
         onLayout={(e) => size.set({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
       >
         <Path path={path} style="stroke" strokeWidth={1.5} strokeJoin="round" color={color} />
       </StyledCanvas>
     );
   }
   ```
   У `usePathValue` колбэк — worklet с явной директивой `'worklet'`: это не хук Reanimated, плагин сам его не найдёт. `style="stroke"` у `<Path>` — режим рисования Skia, а не стиль React Native.
5. **Замер** (10 мин). Запиши свои числа — они пойдут в README и на интервью:

   | Режим | Сообщений/с | Рендеров строк/с | Коммитов списка/с |
   |---|---|---|---|
   | miniTicker, батч 200 мс | | | |
   | stress (+ trade), батч 200 мс | | | |
   | stress, без батча | | | |

   Ожидание, а не факт — проверь: рендеров строк на тиках — 0 во всех режимах; коммиты списка — только от экрана, а не от тиков.
6. **Тема** (5 мин). Нажми Theme под нагрузкой: фон, текст, вспышки и sparkline сменили цвета. Profiler покажет рендеры строк в момент переключения — так и должно быть; после него на тиках снова 0.
7. **Ревью с AI** (5 мин): «Вот путь тика до строки и мои замеры. Где ещё работа на JS-потоке? Что изменится на 500 символах? Без кода».

**Критерии приёмки**

- [ ] Рост — зелёная вспышка, падение — красная; та же цена и переиспользованная строка — без вспышки.
- [ ] Цвет изменения плавно меняется при смене знака; нет `-0.00%` и «прыгающих» цифр.
- [ ] Sparkline появляется после REST и двигает последнюю точку раз в секунду.
- [ ] Profiler: 0 рендеров строк в секунду на тиках; таблица замеров заполнена.
- [ ] В строке и sparkline нет `StyleSheet` и hex-цветов; смена темы перекрашивает список.

**Самопроверка**

- Почему строка не рендерится, хотя цена меняется каждую секунду? Где тогда выполняется работа?
- Как FlashList может показать вспышку «чужой» цены и что тебя от этого защищает?
- Почему вспышка — два слоя с `opacity`, а не `bg-up` / `bg-down` в `className` по знаку?
- Почему форматирование на JS-потоке, а показ — на UI? Когда это станет узким местом?

**Готово, когда…** в стресс-режиме список плавный, а Profiler показывает 0 рендеров строк.

[Дальше: часть 8 — свечной график на Skia →](06-websocket-demo-binance-part8.md)
