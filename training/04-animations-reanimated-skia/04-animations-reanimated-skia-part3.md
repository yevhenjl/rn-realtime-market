# Анимации в React Native: Reanimated 4, Gesture Handler 3 и Skia

Обновлено: 2026-10-21 · Тренинг 4 из 6 · ≈ 16 часов · Вакансия: [карточка](../../card.ru.md)

[Часть 1](04-animations-reanimated-skia.md) · [часть 2](04-animations-reanimated-skia-part2.md) · Часть 3 из 5 · [часть 4](04-animations-reanimated-skia-part4.md) · [часть 5](04-animations-reanimated-skia-part5.md)

Блоки 6–7: основы Skia и два графика для трейдинга. План и таблица «как было → как сейчас» — в [части 1](04-animations-reanimated-skia.md).

## Блок 6. Skia: основы (1,5 ч)

**Цель:** понимать, когда брать Skia, и рисовать на Canvas без ре-рендеров.

**Что повторить**

- **Что это.** React Native Skia — 2D-движок Skia (тот же, что в Chrome и Flutter) через JSI. Один `<Canvas>` рисует сотни фигур за проход — это дешевле сотни view. Гайд Reanimated: больше ~100 анимированных view на слабом Android (~500 на iOS) — смотри в сторону Skia.
- **Версии.** `@shopify/react-native-skia` 2.14 (2026-10-01) — последняя версия под этим именем, она в Expo SDK 58 и Expo Go. С 2026-10-02 проект выходит как `react-native-skia` 3.x: рендер Graphite (Metal / Vulkan), Android API 26+, iOS 15.1+, нужен dev build; у `<Canvas>` удалены `onSize`, `opaque`, `debug`, `colorSpace`, `androidWarmup`. v2 продолжают поддерживать (новые версии v2 — `react-native-skia@2`, на 2026-10-21 это 2.15.1). В тренинге — 2.14 из Expo SDK 58; переход на v3 — смена пакета и импортов плюс проверка по гайду миграции.
- **Фигуры:** `Rect`, `RoundedRect`, `Circle`, `Line`, `Path`, `Points`; `Group` — transform, opacity, clip. Краска: `color`, `style="stroke"`, `strokeWidth`, `strokeCap`, `strokeJoin`.
- **Path.** С 2.14 `SkPath` неизменяемый: `Skia.PathBuilder.Make().moveTo().lineTo().cubicTo().close().build()` (PathBuilder появился в 2.6). Готовые пути — `Skia.Path.MakeFromSVGString`, `Skia.Path.Circle`. У `<Path>` есть `start` / `end` (0..1) — обрезка: «рисование» линии, кольца прогресса.
- **Градиенты и эффекты:** `LinearGradient`, `RadialGradient`, `SweepGradient`; `BlurMask`, `Shadow`.
- **Текст:** `matchFont({ fontFamily, fontSize, fontWeight })` — системный шрифт; `useFont(require('./Inter.ttf'), 14)` — свой, до загрузки `null`. `<Text x y text font />`: `y` — базовая линия, а не верх. Многострочный текст — `Paragraph`.
- **Картинки:** `useImage(require('./badge.png'))` → `<Image image={img} x y width height fit="cover" />`.
- **Шейдеры:** SkSL (похож на GLSL) — `Skia.RuntimeEffect.Make(src)` → `<Shader source uniforms>` внутри `<Fill>` или фигуры. Uniforms могут быть derived value.
- **Анимация.** Shared и derived values Reanimated передаются прямо в пропсы (`cx={x}`, `path={pathSV}`, `uniforms={u}`), без `createAnimatedComponent`. Skia ≥ 2.10 требует Reanimated 4. Хуки: `usePathValue((builder) => { 'worklet'; … })`, `usePathInterpolation`, `useClock`. Цвета — `interpolateColors` из Skia: формат цвета другой.
- **Много объектов:** `Picture` — `createPicture((canvas) => …)` внутри `useDerivedValue`, когда число команд рисования меняется каждый кадр; `Atlas` + `useRSXformBuffer` — сотни одинаковых спрайтов (частицы).
- **Жесты и hit-testing.** Оберни `<Canvas>` в `GestureDetector`: `e.x`, `e.y` — уже в координатах Canvas. Попадание считаешь сам: индекс точки по `x` или `path.contains(x, y)`. Перетаскивать отдельные фигуры удобнее через прозрачный `Animated.View` поверх фигуры. Примеры в документации Skia ещё на старом `Gesture.Pan()` — переводи на хуки.
- **Размер Canvas.** Меряй родительский `View` через `onLayout` и передавай размеры в Canvas — так код без правок переживёт переход на v3.
- **Дорого:** создавать `Skia.Paint()`, пути и шрифты в рендере. Выноси их в модуль или в `useMemo`.
- **Skia vs SVG vs Lottie.** SVG — иконки и простые формы; каждый элемент — нативный view. Lottie — готовая анимация дизайнера из After Effects; проигрываешь, но мало управляешь из кода. Skia — графики, частицы, шейдеры, «много объектов» и интерактив. В Skia есть и `Skottie` — проигрыватель Lottie внутри Canvas.
- Ссылки: [миграция на v3](https://wcandillon.github.io/react-native-skia/docs/getting-started/migration/) · [анимации](https://wcandillon.github.io/react-native-skia/docs/animations/animations/) · [хуки](https://wcandillon.github.io/react-native-skia/docs/animations/hooks/) · [Path](https://wcandillon.github.io/react-native-skia/docs/shapes/path/) · [Picture](https://wcandillon.github.io/react-native-skia/docs/shapes/pictures/) · [Atlas](https://wcandillon.github.io/react-native-skia/docs/shapes/atlas/) · [шейдеры](https://wcandillon.github.io/react-native-skia/docs/shaders/overview/) · [текст](https://wcandillon.github.io/react-native-skia/docs/text/text/)

```tsx
// file: TournamentCard.tsx
import { useMemo } from 'react';
import { Platform } from 'react-native';
import {
  Canvas,
  Circle,
  Fill,
  LinearGradient,
  matchFont,
  Path,
  Shader,
  Skia,
  Text,
  useClock,
  vec,
} from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

const font = matchFont({
  fontFamily: Platform.select({ ios: 'Helvetica', default: 'sans-serif' }),
  fontSize: 12,
});

// SkSL: фон турнира медленно переливается
const glow = Skia.RuntimeEffect.Make(`
uniform float t;
uniform float2 size;
half4 main(float2 pos) {
  float2 uv = pos / size;
  float wave = 0.5 + 0.5 * sin(t / 600.0 + uv.x * 6.2831);
  return half4(0.05, 0.10 + 0.25 * wave, 0.20, 1.0);
}`)!;

export function TournamentCard({ width, height }: { width: number; height: number }) {
  // SkPath неизменяемый: строим через PathBuilder один раз
  const line = useMemo(
    () =>
      Skia.PathBuilder.Make()
        .moveTo(0, height * 0.8)
        .lineTo(width * 0.3, height * 0.5)
        .lineTo(width * 0.6, height * 0.6)
        .lineTo(width, height * 0.2)
        .build(),
    [width, height],
  );
  const clock = useClock(); // мс с момента монтирования, на UI-потоке
  const uniforms = useDerivedValue(() => ({ t: clock.value, size: vec(width, height) }));

  return (
    <Canvas style={{ width, height }}>
      <Fill>
        <Shader source={glow} uniforms={uniforms} />
      </Fill>
      <Path path={line} style="stroke" strokeWidth={2} strokeJoin="round">
        <LinearGradient start={vec(0, 0)} end={vec(width, 0)} colors={['#22c55e', '#a3e635']} />
      </Path>
      <Circle cx={width} cy={height * 0.2} r={4} color="#a3e635" />
      <Text x={8} y={16} text="Weekly BTC Cup" font={font} color="white" />
    </Canvas>
  );
}
```

**Практика**

- **6.1. Карточка турнира** (20 мин). На основе примера: шейдерный фон, название, призовой фонд, аватар лидера (`useImage`) в круге (`Group clip`). Готово: всё в одном Canvas; шрифт не мигает (обработан `null` у `useFont`).
- **6.2. PathBuilder** (20 мин). Функции `buildLine(points)` и `buildArea(points, height)` — замкнутая область под линией — для 50 точек. Залей область `LinearGradient` от цвета к прозрачному. Готово: край области совпадает с линией, нет «хвоста» к (0, 0).
- **6.3. Анимированный путь** (20 мин). При открытии экрана линия «рисуется» за 1 с: `end` от 0 до 1 через `withTiming`. ★ `usePathInterpolation` между графиком «до» и «после» тика. Готово: плавно, без ре-рендеров.
- **6.4. Skia, SVG или Lottie** (15 мин, без кода). Таблица «что выбрать и почему» для 6 задач IBIT: иконка ачивки, свечной график, конфетти, маскот из After Effects, кольцо прогресса, фон турнира. Потом сверь с AI.

**Самопроверка**

1. Почему один Canvas с 300 фигурами быстрее 300 view?
2. Как анимировать путь без ре-рендера компонента?
3. Чем `Picture` отличается от дерева Skia-компонентов? Когда нужен `Atlas`?
4. Как сделать hit-test по точке графика?
5. Что меняется при переходе на `react-native-skia` 3?
6. Почему `Skia.Path.Make().moveTo(…)` не компилируется в 2.14?

**Готово, когда…** карточка турнира и «рисующаяся» линия работают, таблица Skia / SVG / Lottie готова.

## Блок 7. Упражнения 3–4: графики (2 ч)

**Цель:** собрать два графика уровня трейдингового приложения — sparkline с перекрестием и свечи с зумом — без ре-рендеров во время жестов.

**Что повторить:** блок 6 (Path, Picture, жесты над Canvas), блок 4 (pan, pinch, композиция), блок 2 (`withDecay`). Правило: чистая математика графика — отдельный файл без React и Skia; его проверяешь в node за секунды.

Математика — каркас и тесты (первые 15 минут каждого упражнения — без AI):

```ts
// file: chart-math.ts
// Чистая математика графиков: без React и Skia, тестируется в node
export function toY(prices: number[], height: number, pad = 8): number[] {
  // TODO: min / max → y (бо́льшая цена — выше); все цены равны → середина
  return prices.map(() => height / 2);
}

export function nearestIndex(x: number, step: number, count: number): number {
  'worklet';
  // TODO: Math.round(x / step) в границах [0, count - 1]; count <= 1 → 0
  return 0;
}

export function visibleRange(offset: number, candleW: number, width: number, count: number): [number, number] {
  'worklet';
  // TODO: offset — сдвиг от правого края, px; верни [first, last] включительно
  return [0, count - 1];
}
```

```ts
// file: chart-math.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { nearestIndex, toY, visibleRange } from './chart-math.ts';

test('toY: большая цена — выше', () => {
  assert.deepEqual(toY([1, 2, 3], 100, 0), [100, 50, 0]);
  assert.deepEqual(toY([1, 3], 100, 10), [90, 10]);
  assert.deepEqual(toY([5, 5], 100, 0), [50, 50]); // плоский график — по центру
});

test('nearestIndex: ближайшая точка в границах массива', () => {
  assert.equal(nearestIndex(14, 10, 5), 1);
  assert.equal(nearestIndex(16, 10, 5), 2);
  assert.equal(nearestIndex(-30, 10, 5), 0);
  assert.equal(nearestIndex(999, 10, 5), 4);
  assert.equal(nearestIndex(5, 0, 1), 0); // одна точка
});

test('visibleRange: [first, last] от правого края', () => {
  assert.deepEqual(visibleRange(0, 10, 100, 500), [489, 499]);
  assert.deepEqual(visibleRange(25, 10, 100, 500), [487, 497]);
  assert.deepEqual(visibleRange(0, 10, 100, 5), [0, 4]); // свечей меньше, чем места
});
```

### Упражнение 3. Sparkline с перекрестием (50 мин)

Задача: мини-график цены за последние 60 тиков (новая точка раз в секунду) и перекрестие под пальцем: вертикальная линия, точка на графике, подпись цены.

```tsx
// file: Sparkline.tsx
import { useEffect, useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import { Canvas, Circle, Group, Line, matchFont, Path, Skia, Text, vec, type SkPath } from '@shopify/react-native-skia';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';

import { nearestIndex, toY } from './chart-math';

const HEIGHT = 160;
const font = matchFont({
  fontFamily: Platform.select({ ios: 'Helvetica', default: 'sans-serif' }),
  fontSize: 12,
});

function buildLine(ys: number[], step: number): SkPath {
  const b = Skia.PathBuilder.Make();
  // TODO: moveTo для первой точки, lineTo для остальных (x = i * step)
  return b.build();
}

export function Sparkline({ prices }: { prices: number[] }) {
  const [width, setWidth] = useState(0);
  const step = prices.length > 1 ? width / (prices.length - 1) : 0;
  const ys = useMemo(() => toY(prices, HEIGHT), [prices]);
  const line = useMemo(() => buildLine(ys, step), [ys, step]);

  // Копии для UI-потока: обновляются раз на тик, не на кадр
  const ysUI = useSharedValue<number[]>([]);
  const pricesUI = useSharedValue<number[]>([]);
  const stepUI = useSharedValue(0);
  useEffect(() => {
    ysUI.value = ys;
    pricesUI.value = prices;
    stepUI.value = step;
  }, [ys, prices, step, ysUI, pricesUI, stepUI]);

  const touchX = useSharedValue(-1); // -1 — пальца нет
  const pan = usePanGesture({
    activateAfterLongPress: 150, // быстрый свайп остаётся скроллу экрана
    // TODO: onActivate и onUpdate → touchX = e.x; onFinalize → touchX = -1
  });

  const index = useDerivedValue(() => nearestIndex(touchX.value, stepUI.value, ysUI.value.length));
  const cx = useDerivedValue(() => index.value * stepUI.value);
  const cy = useDerivedValue(() => ysUI.value[index.value] ?? 0);
  const p1 = useDerivedValue(() => vec(cx.value, 0));
  const p2 = useDerivedValue(() => vec(cx.value, HEIGHT));
  const label = useDerivedValue(() => (pricesUI.value[index.value] ?? 0).toFixed(2));
  const opacity = useDerivedValue(() => (touchX.value < 0 ? 0 : 1));

  return (
    <View style={{ height: HEIGHT }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <GestureDetector gesture={pan}>
        <Canvas style={{ width, height: HEIGHT }}>
          <Path path={line} style="stroke" strokeWidth={2} color="#22c55e" />
          <Group opacity={opacity}>
            <Line p1={p1} p2={p2} color="#9ca3af" strokeWidth={1} />
            <Circle cx={cx} cy={cy} r={4} color="#22c55e" />
            <Text x={8} y={14} text={label} font={font} color="#111827" />
          </Group>
        </Canvas>
      </GestureDetector>
    </View>
  );
}
```

Шаги: (1) 15 мин без AI — `toY`, `nearestIndex`, `buildLine`, тесты зелёные; (2) 20 мин — жест и перекрестие; (3) 15 мин — заливка под линией (`buildArea` из 6.2) и цвет: зелёный, если последняя цена ≥ первой, иначе красный.

Критерии приёмки:

- [ ] Перекрестие идёт за пальцем на 60 FPS; подпись — цена ближайшей точки, 2 знака.
- [ ] Палец за краем графика — индекс в границах массива, без `undefined`.
- [ ] Новые тики не ломают перекрестие, пока палец на графике.
- [ ] Быстрый вертикальный свайп по графику скроллит экран, а удержание включает перекрестие.
- [ ] Компонент не ре-рендерится во время жеста.
- [ ] ★ Хаптик `selectionAsync` при переходе на новую точку — не чаще одного раза на индекс (`useAnimatedReaction` по `index`).
- [ ] ★ Подпись не вылезает за края: x подписи через `clamp` и `font.measureText(text).width`.

### Упражнение 4. Свечи с pinch-zoom и скроллом (70 мин)

Задача: 500 минутных свечей (OHLC). Горизонтальный скролл пальцем с инерцией, pinch — зум (ширина свечи 3–32 px), шкала Y подстраивается под видимые свечи.

```tsx
// file: CandleChart.tsx
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Canvas, createPicture, Picture, Skia } from '@shopify/react-native-skia';
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures } from 'react-native-gesture-handler';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';

import { visibleRange } from './chart-math';

export type Candle = { t: number; o: number; h: number; l: number; c: number };

const HEIGHT = 280;
export const MIN_W = 3; // ширина свечи с зазором, px
export const MAX_W = 32;

// Paint — один раз на модуль: не в рендере и не в кадре
const up = Skia.Paint();
up.setColor(Skia.Color('#16a34a'));
const down = Skia.Paint();
down.setColor(Skia.Color('#dc2626'));

export function CandleChart({ candles }: { candles: Candle[] }) {
  const [width, setWidth] = useState(0);
  const data = useSharedValue<Candle[]>([]);
  useEffect(() => {
    data.value = candles; // копия на UI-поток при новых данных
  }, [candles, data]);

  const candleW = useSharedValue(10); // масштаб
  const offset = useSharedValue(0); // сдвиг от правого края, px
  const widthUI = useSharedValue(0);

  const pan = usePanGesture({
    // TODO: палец вправо → в историю (offset растёт); отпускание — withDecay с clamp [0, max]
  });
  const pinch = usePinchGesture({
    // TODO: candleW = clamp(startW * e.scale, MIN_W, MAX_W); startW запомни в onActivate
  });
  const gesture = useSimultaneousGestures(pan, pinch);

  const picture = useDerivedValue(() =>
    createPicture((canvas) => {
      const list = data.value;
      const [first, last] = visibleRange(offset.value, candleW.value, widthUI.value, list.length);
      // TODO 1: min(l) и max(h) по свечам first..last → шкала Y
      // TODO 2: тень — drawRect шириной 1 px (h..l), тело — drawRect (o..c), x — от правого края
      for (let i = first; i <= last; i++) {
        canvas.drawRect(Skia.XYWHRect(0, 0, 1, 1), list[i].c >= list[i].o ? up : down);
      }
    }),
  );

  return (
    <View
      style={{ height: HEIGHT }}
      onLayout={(e) => {
        setWidth(e.nativeEvent.layout.width);
        widthUI.value = e.nativeEvent.layout.width;
      }}
    >
      <GestureDetector gesture={gesture}>
        <Canvas style={{ width, height: HEIGHT }}>
          <Picture picture={picture} />
        </Canvas>
      </GestureDetector>
    </View>
  );
}

// Мок: случайное блуждание, n минутных свечей
export function mockCandles(n = 500, start = 64000): Candle[] {
  const out: Candle[] = [];
  let price = start;
  for (let i = 0; i < n; i++) {
    const o = price;
    const c = o + (Math.random() - 0.5) * 120;
    const h = Math.max(o, c) + Math.random() * 60;
    const l = Math.min(o, c) - Math.random() * 60;
    out.push({ t: Date.now() - (n - i) * 60_000, o, h, l, c });
    price = c;
  }
  return out;
}
```

Шаги: (1) 15 мин без AI — на бумаге формулы видимого диапазона и шкалы Y, `visibleRange` и тесты; потом сверь с AI. (2) 25 мин — рисование в `createPicture`: только видимые свечи. (3) 20 мин — pan с инерцией и pinch. (4) 10 мин — замер в release-сборке: `<PerformanceMonitor />` из Reanimated.

Критерии приёмки:

- [ ] 60 FPS на UI-потоке при скролле и зуме на среднем Android (release-сборка).
- [ ] Ноль ре-рендеров компонента во время жестов.
- [ ] Скролл не уходит дальше первой и последней свечи; инерция есть.
- [ ] Второй pinch не «прыгает»: масштаб запоминается на старте жеста.
- [ ] ★ Свеча под пальцами остаётся на месте при зуме (`e.focalX`).
- [ ] ★ Удержание — перекрестие с OHLC выбранной свечи (приём из упражнения 3).
- [ ] ★ Новая свеча каждые 5 с: если ты на правом краю, график едет; если ушёл в историю — стоит.

Подсказки:

- Свеча `i` от правого края: `x = width - (count - 1 - i) * w + offset - w`. Проверь на бумаге для `i = count - 1` и `offset = 0`.
- Шкала Y: `y = HEIGHT * (max - price) / (max - min)`; добавь отступ 8 px сверху и снизу.
- Почему `Picture`, а не 500 `<Rect>`: число видимых свечей меняется на каждом кадре зума.
- `Skia.Paint()` в кадре не создавай. Нужны разные цвета — заведи нужные Paint заранее.

**Самопроверка**

1. Почему перекрестие и свечи не вызывают ре-рендер React?
2. Где выполняется `createPicture` и почему там можно читать `data.value`?
3. Что будет, если 500 свечей заменить на 50 000? Что сделаешь (агрегация в таймфреймы, прореживание по зуму)?
4. Почему pan и pinch — `useSimultaneousGestures`, а не `useExclusiveGestures`?
5. Как перенести графики на Skia v3 и что проверить после переноса?

**Готово, когда…** оба графика работают в release-сборке на 60 FPS, тесты математики зелёные, на вопросы отвечаешь без подсказок.

Дальше: [часть 4 — геймификация и UX ордера](04-animations-reanimated-skia-part4.md).
