# Анимации в React Native: Reanimated 4, Gesture Handler 3 и Skia

Обновлено: 2026-10-21 · Тренинг 4 из 6 · ≈ 16 часов · Вакансия: [карточка](../../card.ru.md)

[Часть 1](04-animations-reanimated-skia.md) · Часть 2 из 5 · [часть 3](04-animations-reanimated-skia-part3.md) · [часть 4](04-animations-reanimated-skia-part4.md) · [часть 5](04-animations-reanimated-skia-part5.md)

Блоки 3–5: упражнения 1–2, жесты, скролл и клавиатура, layout animations. План и таблица «как было → как сейчас» — в [части 1](04-animations-reanimated-skia.md).

## Блок 3. Упражнения 1–2: тик цены и P&L (1,5 ч)

**Цель:** анимировать поток котировок без работы JS на каждый кадр и без ре-рендера строк.

**Что повторить:** блоки 1–2; деньги и P&L — [тренинг 2](../02-trading-app-architecture/02-trading-app-architecture-part2.md); подписка на стор вне React — [тренинг 5](../05-state-management-zustand-mobx/05-state-management-zustand-mobx.md); настоящий поток котировок — [тренинг 6](../06-websocket-demo-binance/06-websocket-demo-binance.md). Гайд Reanimated по производительности прямо советует: часто меняющееся число — shared value + анимированный `TextInput`, а не ре-рендер `Text`.

### Упражнение 1. Вспышка цены на тик (45 мин)

Задача: вотчлист из 20 символов. На каждом тике фон строки вспыхивает зелёным (рост) или красным (падение) и гаснет за 600 мс. Мок шлёт тики раз в 250 мс — как после conflation из тренинга 2 (4 раза в секунду на символ).

Стор котировок вне React — готовый код:

```ts
// file: ticker-store.ts
import { makeMutable, type SharedValue } from 'react-native-reanimated';

const prices = new Map<string, SharedValue<number>>();
const last = new Map<string, number>(); // копия на JS: не читаем .value в цикле

export function getPrice(symbol: string): SharedValue<number> {
  let sv = prices.get(symbol);
  if (!sv) {
    sv = makeMutable(100); // shared value вне компонента
    prices.set(symbol, sv);
  }
  return sv;
}

// Мок биржи: раз в 250 мс меняется примерно половина символов
export function startMockFeed(symbols: string[]): () => void {
  const id = setInterval(() => {
    for (const s of symbols) {
      if (Math.random() < 0.5) continue;
      const prev = last.get(s) ?? 100;
      const next = Math.max(0.01, Math.round((prev + (Math.random() - 0.5) * 0.4) * 100) / 100);
      last.set(s, next);
      getPrice(s).value = next; // раз на тик, не на кадр
    }
  }, 250);
  return () => clearInterval(id);
}
```

Строка — каркас, ядро пишешь сам:

```tsx
// file: PriceRow.tsx
import { memo } from 'react';
import { Text, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { getPrice } from './ticker-store';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export const PriceRow = memo(function PriceRow({ symbol }: { symbol: string }) {
  const price = getPrice(symbol);
  const flash = useSharedValue(0); // 1 → 0: сила подсветки
  const direction = useSharedValue(0); // 1 — рост, -1 — падение

  useAnimatedReaction(
    () => price.value,
    (current, previous) => {
      // TODO 1: previous === null или цена не изменилась — выйти
      // TODO 2: direction = знак изменения; flash: сразу 1, потом 0 за 600 мс
    },
  );

  const rowStyle = useAnimatedStyle(() => {
    // TODO 3: backgroundColor из flash и direction (interpolateColor)
    return { backgroundColor: 'transparent' };
  });

  const priceProps = useAnimatedProps(() => {
    const text = price.value.toFixed(2);
    return { text, defaultValue: text };
  });

  return (
    <Animated.View style={[{ flexDirection: 'row', height: 48, paddingHorizontal: 16 }, rowStyle]}>
      <Text style={{ fontSize: 16, fontWeight: '600', alignSelf: 'center' }}>{symbol}</Text>
      <View style={{ flex: 1 }} />
      <AnimatedTextInput
        editable={false}
        animatedProps={priceProps}
        style={{ fontSize: 16, fontVariant: ['tabular-nums'], color: '#111827' }}
      />
    </Animated.View>
  );
});
```

Критерии приёмки:

- [ ] Рост — зелёная вспышка, падение — красная, та же цена — без вспышки.
- [ ] Новый тик посреди затухания перезапускает вспышку сразу, без очереди.
- [ ] Строки не ре-рендерятся на тиках: `console.count(symbol)` в рендере не растёт (или React DevTools → «Highlight updates when components render»).
- [ ] Кнопка «Блок JS 2 с» из упражнения 1.3: начатые вспышки гаснут плавно.
- [ ] Reduce Motion включён: вспышки нет, но направление видно (стрелка ▲ / ▼ через `useAnimatedStyle`, без ре-рендера).
- [ ] ★ Список на FlashList v2: при переиспользовании строки не появляется вспышка «чужого» символа. Сбрось shared values в `useEffect` при смене `symbol`.

Подсказки:

- `useAnimatedReaction` даёт `previous` — сравнивай с ним.
- Вспышка: `withSequence(withTiming(1, { duration: 0 }), withTiming(0, { duration: 600 }))`.
- Цвет: `interpolateColor(flash.value, [0, 1], ['rgba(22,163,74,0)', 'rgba(22,163,74,0.35)'])`; красный — по `direction`.
- Текст без ре-рендера — `AnimatedTextInput` + `useAnimatedProps({ text, defaultValue })` и `editable={false}`. Так устроен и `PerformanceMonitor` внутри Reanimated.
- `fontVariant: ['tabular-nums']` — цифры одной ширины, текст не «прыгает».

### Упражнение 2. Счётчик P&L (45 мин)

Задача: крупное число P&L портфеля. При изменении оно плавно «досчитывает» от текущего значения до нового за 800 мс. Формат: `+$1,234.50`, `-$1,234.50`, `$0.00`. Деньги — в центах (целые), как в тренинге 2.

**Шаг 1** (15 мин, без AI, в node). Напиши `formatPnlCents` — worklet без `Intl`. Объект `Intl.NumberFormat` из замыкания приедет в worklet обычным объектом без методов (копируются только собственные поля), а наличие `Intl` в UI-рантайме лучше проверить, чем предполагать (см. ★ ниже).

```ts
// file: format-pnl.ts
export function formatPnlCents(cents: number): string {
  'worklet';
  // TODO: целые центы → знак, доллары с запятыми по тысячам, 2 знака центов
  return String(cents);
}
```

```ts
// file: format-pnl.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatPnlCents } from './format-pnl.ts';

const intl = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  signDisplay: 'exceptZero',
});

test('formatPnlCents совпадает с Intl', () => {
  for (const cents of [0, -0, 1, -1, 5, 99, 100, 123450, -123450, 123456789, -100000, 100000000000]) {
    assert.equal(formatPnlCents(cents), intl.format(cents / 100), `cents=${cents}`);
  }
});
```

Запуск: `node --test format-pnl.test.ts` (Node 24 запускает `.ts` напрямую). Ожидаемые значения, например: `0` → `$0.00`, `-1` → `-$0.01`, `123450` → `+$1,234.50`.

**Шаг 2** (20 мин). Компонент — каркас:

```tsx
// file: PnlCounter.tsx
import { useEffect } from 'react';
import { TextInput } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';

import { formatPnlCents } from './format-pnl';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export function PnlCounter({ cents }: { cents: number }) {
  const shown = useSharedValue(cents);

  useEffect(() => {
    // TODO 1: к новому значению за 800 мс: withTiming + Easing.out(Easing.cubic)
  }, [cents, shown]);

  // TODO 2: useDerivedValue → formatPnlCents(Math.round(shown.value))
  // TODO 3: useAnimatedProps → { text, defaultValue }; цвет — useAnimatedStyle по знаку
  void formatPnlCents;

  return <AnimatedTextInput editable={false} style={{ fontSize: 32, fontVariant: ['tabular-nums'] }} />;
}
```

**Шаг 3** (10 мин). Доступность и проверка на телефоне.

Критерии приёмки:

- [ ] Число досчитывает плавно; рендеров компонента столько же, сколько изменений `cents`.
- [ ] Финальный текст точно равен `Intl`-формату нового значения.
- [ ] Быстрые изменения подряд: анимация продолжается от показанного числа, без прыжка назад.
- [ ] Цвет: зелёный > 0, красный < 0, серый = 0.
- [ ] Скринридер читает итог, а не каждый кадр: `accessibilityLabel` обновляй в колбэке конца анимации через `scheduleOnRN`.
- [ ] ★ Проверь, есть ли `Intl` в UI-рантайме: `scheduleOnUI(() => console.log(typeof Intl))`. Запиши результат для iOS и Android.
- [ ] ★★ «Одометр»: каждая цифра — колонка 0–9, которая едет по `translateY`.

**Самопроверка**

1. Почему тик идёт через shared value, а не через `setState`?
2. Почему `Math.round` в центах, а не `toFixed` от float в долларах?
3. Почему `AnimatedTextInput`, а не `Animated.Text`?
4. Что случится со вспышками в FlashList, когда ячейки переиспользуются?

**Готово, когда…** оба демо работают на телефоне, тест формата зелёный, ре-рендеров при тиках нет.

## Блок 4. Жесты, скролл и клавиатура (1,5 ч)

**Цель:** писать жесты на хуках Gesture Handler 3 и сочетать их со скроллом без конфликтов.

**Что повторить**

- Gesture Handler распознаёт жесты нативно, колбэки — worklets на UI-потоке. Корень приложения — в `GestureHandlerRootView`.
- **GH 3** (2026-05-28) — хуки вместо builder: `usePanGesture`, `useTapGesture`, `useLongPressGesture`, `usePinchGesture`, `useRotationGesture`, `useFlingGesture`, `useNativeGesture`, `useManualGesture`. Привязка — `<GestureDetector gesture={g}>`. Builder `Gesture.Pan()` deprecated: работает, но связи между ним и хуками невозможны.
- **Жизненный цикл:** `onBegin` (касание) → `onActivate` (жест распознан; было `onStart`) → `onUpdate` (каждое движение; `changeX` / `changeY` теперь здесь, `onChange` удалён) → `onDeactivate` (было `onEnd`; вместо `success` — `e.canceled`) → `onFinalize` (всегда). Поля `state` / `oldState` из событий убраны.
- **Событие плоское:** `e.translationX`, `e.velocityX`, `e.changeX`, `e.x`, `e.absoluteX`; у pinch — `e.scale`, `e.focalX`.
- **Конфиг** принимает shared values (например, `enabled`) — без ре-рендера. `runOnJS: true` — колбэки на JS (простая логика без анимаций). `testID` — для тестов.
- Колбэки, написанные прямо в объекте `usePanGesture({ … })`, автоматически становятся worklets. Функцию, объявленную отдельно, помечай `'worklet'`.
- **Композиция:** `useSimultaneousGestures(a, b)` — одновременно (pan + pinch на графике); `useExclusiveGestures(a, b, c)` — порядок = приоритет; `useCompetingGestures(a, b)` — побеждает первый активированный. Связи между разными детекторами — в конфиге: `simultaneousWith`, `requireToFail`, `block`.
- **Жест в вертикальном списке:** `activeOffsetX: [-10, 10]` + `failOffsetY: [-10, 10]`, либо `activateAfterLongPress`.
- **Скролл:** `useAnimatedScrollHandler({ onScroll, onBeginDrag, onEndDrag, onMomentumEnd })` для `Animated.ScrollView` / `Animated.FlatList`. Нужно только смещение — `useScrollOffset(animatedRef)`. Прокрутить из worklet — `scrollTo(ref, x, y, animated)`.
- **Клавиатура:** `useAnimatedKeyboard` deprecated. Бери `react-native-keyboard-controller`: `KeyboardProvider` в корне, `KeyboardStickyView`, `KeyboardAwareScrollView`, `useReanimatedKeyboardAnimation()` → `{ height, progress }`.
- Ссылки: [миграция на GH 3](https://docs.swmansion.com/react-native-gesture-handler/docs/guides/upgrading-to-3) · [usePanGesture](https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/use-pan-gesture) · [композиция](https://docs.swmansion.com/react-native-gesture-handler/docs/composition/use-simultaneous-gestures) · [useScrollOffset](https://docs.swmansion.com/react-native-reanimated/docs/scroll/useScrollOffset/) · [keyboard-controller](https://kirillzyusko.github.io/react-native-keyboard-controller/docs/api/hooks/keyboard/use-reanimated-keyboard-animation)

```tsx
// file: Gestures.tsx
import { Text } from 'react-native';
import {
  GestureDetector,
  useExclusiveGestures,
  useLongPressGesture,
  usePanGesture,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withDecay, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// Карточка тянется по X и после отпускания летит по инерции в пределах ±120
export function DraggableCard() {
  const x = useSharedValue(0);
  const start = useSharedValue(0);

  const pan = usePanGesture({
    activeOffsetX: [-10, 10], // только горизонтальное движение
    failOffsetY: [-10, 10], // вертикаль отдаём скроллу
    onActivate: () => {
      start.value = x.value;
    },
    onUpdate: (e) => {
      x.value = start.value + e.translationX;
    },
    onDeactivate: (e) => {
      x.value = withDecay({ velocity: e.velocityX, clamp: [-120, 120] });
    },
  });

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ height: 64, backgroundColor: '#1f2937' }, style]} />
    </GestureDetector>
  );
}

// Строка вотчлиста: long press → меню, double tap → избранное, tap → открыть
type RowProps = { onOpen: () => void; onFavorite: () => void; onMenu: () => void };

export function WatchlistRow({ onOpen, onFavorite, onMenu }: RowProps) {
  const scale = useSharedValue(1);
  const longPress = useLongPressGesture({
    minDuration: 400,
    onBegin: () => {
      scale.value = withSpring(0.97);
    },
    onActivate: () => scheduleOnRN(onMenu),
    onFinalize: () => {
      scale.value = withSpring(1);
    },
  });
  const doubleTap = useTapGesture({ numberOfTaps: 2, onActivate: () => scheduleOnRN(onFavorite) });
  const tap = useTapGesture({ onActivate: () => scheduleOnRN(onOpen) });
  // порядок = приоритет: tap ждёт, пока long press и double tap не провалятся
  const gesture = useExclusiveGestures(longPress, doubleTap, tap);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ height: 56, justifyContent: 'center' }, style]}>
        <Text>BTCUSDT</Text>
      </Animated.View>
    </GestureDetector>
  );
}
```

Скролл и клавиатура — коротко:

```tsx
// file: AssetScreen.tsx
import { Pressable, Text, TextInput } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

export function AssetScreen() {
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });
  // Цена в шапке уменьшается и тускнеет на первых 120 px скролла
  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(scrollY.value, [0, 120], [1, 0.7], Extrapolation.CLAMP) }],
    opacity: interpolate(scrollY.value, [0, 120], [1, 0.4], Extrapolation.CLAMP),
  }));

  return (
    <>
      <Animated.View style={headerStyle}>
        <Text style={{ fontSize: 32 }}>$64,210.55</Text>
      </Animated.View>
      <Animated.ScrollView onScroll={onScroll}>
        <TextInput keyboardType="decimal-pad" placeholder="Сумма, USDT" />
      </Animated.ScrollView>
      {/* KeyboardProvider — в корневом layout */}
      <KeyboardStickyView offset={{ closed: 0, opened: 8 }}>
        <Pressable>
          <Text>Купить</Text>
        </Pressable>
      </KeyboardStickyView>
    </>
  );
}
```

**Практика**

- **4.1. Перетаскивание с инерцией** (20 мин). Повтори `DraggableCard` по памяти. Готово: второй захват не «прыгает» (offset сохраняется); скорость пальца переходит в инерцию; карточка не уходит за ±120. Объясни, зачем `start`.
- **4.2. Tap, double tap, long press** (20 мин). 30 строк `WatchlistRow` в `ScrollView`. Готово: все три жеста работают, скролл не ломается. Объясни, почему одиночный тап срабатывает с задержкой и как этого избежать (не вешать double tap на строку списка; избранное — отдельной кнопкой).
- **4.3. Сворачивающаяся шапка** (25 мин). Экран актива из `AssetScreen`; потом перепиши на `useScrollOffset`. Готово: шапка не ре-рендерится; на быстром флинге и на «резинке» iOS вверху нет дёрганий.
- **4.4. Кнопка над клавиатурой** (15 мин). Тикет ордера: поле суммы и кнопка «Купить», которая едет вместе с клавиатурой. Сначала `KeyboardStickyView`, потом вручную: `translateY: height.value` из `useReanimatedKeyboardAnimation()`. Готово: кнопка движется кадр в кадр с клавиатурой на iOS и Android.

**Самопроверка**

1. Как в GH 3 переименовали `onStart`, `onEnd`, `onChange`?
2. Как сделать горизонтальный свайп в строке вертикального списка?
3. Exclusive, competing, simultaneous — по примеру на каждую.
4. Почему колбэк, объявленный вне `usePanGesture` без `'worklet'`, падает?
5. Зачем `useScrollOffset`, если есть `useAnimatedScrollHandler`?

**Готово, когда…** 4.1–4.4 работают, в коде нет ни одного `Gesture.`.

## Блок 5. Layout animations (1 ч)

**Цель:** анимировать появление, удаление и перестановку элементов без ручных координат.

**Что повторить**

- `entering` / `exiting` — пресеты (`FadeIn`, `SlideInRight`, `ZoomIn` …) с модификаторами `.duration()`, `.delay()`, `.springify()`, `.reduceMotion()`. `Keyframe` — свои ключевые кадры.
- `layout` — перестановка и смена размера: `LinearTransition` (бывший `Layout`, он deprecated), `SequencedTransition`, `FadingTransition`, `JumpingTransition`, `CurvedTransition`, `EntryExitTransition` (вместо удалённого `combineTransition`).
- Ключ — стабильный `id`, не индекс. Иначе Reanimated видит «тот же элемент с новым текстом», и анимировать нечего.
- `<LayoutAnimationConfig skipEntering>` — не анимировать первый показ. `Animated.FlatList`: `itemLayoutAnimation`, `skipEnteringExitingAnimations`. FlashList v2: перед вставкой или удалением вызови `prepareForLayoutAnimationRender()`; ячейки переиспользуются, поэтому shared values в строке сбрасывай.
- В 4.7 новый движок layout animations включён по умолчанию; откат — флаг `USE_LEGACY_LAYOUT_ANIMATIONS_PROXY`.
- Shared element transitions — экспериментально: флаг `ENABLE_SHARED_ELEMENT_TRANSITIONS` (dev build, в Expo Go флаги не работают), только native stack, без tabs. В продакшене на 2026-10 на них не рассчитывай.
- Ссылки: [layout transitions](https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/layout-transitions/) · [shared element transitions](https://docs.swmansion.com/react-native-reanimated/docs/shared-element-transitions/overview/) · [feature flags](https://docs.swmansion.com/react-native-reanimated/docs/guides/feature-flags/) · [FlashList + Reanimated](https://shopify.github.io/flash-list/docs/guides/reanimated)

```tsx
// file: Leaderboard.tsx
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

export type Player = { id: string; name: string; points: number };

export function Leaderboard({ players }: { players: Player[] }) {
  const sorted = useMemo(() => [...players].sort((a, b) => b.points - a.points), [players]);
  return (
    <View>
      {sorted.map((p, i) => (
        <Animated.View
          key={p.id} // стабильный ключ — иначе нечего анимировать
          layout={LinearTransition.springify()}
          entering={FadeIn.duration(250)}
          exiting={FadeOut.duration(200)}
          style={{ height: 52, flexDirection: 'row', alignItems: 'center' }}
        >
          <Text style={{ width: 32 }}>{i + 1}</Text>
          <Text style={{ flex: 1 }}>{p.name}</Text>
          <Text style={{ fontVariant: ['tabular-nums'] }}>{p.points}</Text>
        </Animated.View>
      ))}
    </View>
  );
}
```

### Упражнение 5. Лидерборд турнира (40 мин)

Задача: топ-10 турнира; очки обновляются каждые 2 с (мок), места меняются.

Критерии приёмки:

- [ ] Строки плавно едут на новые места (`layout`); новичок в топе появляется (`entering`), выбывший исчезает (`exiting`).
- [ ] Строка «ты» подсвечена; при росте места — короткая вспышка (приём из упражнения 1).
- [ ] При первом открытии экрана строки не «влетают» (`LayoutAnimationConfig skipEntering`).
- [ ] Ключи — `id`. Попробуй `key={i}` и запиши в `mistakes.md`, что изменилось.
- [ ] Очки — `tabular-nums`; ★ очки досчитываются, как P&L из упражнения 2.
- [ ] ★ Тот же лидерборд на 200 строк в FlashList v2 с `prepareForLayoutAnimationRender()`. Сравни поведение.

**Самопроверка**

1. Почему при `key={index}` перестановка не анимируется?
2. Чем `layout` отличается от `entering`?
3. Что не так с layout animations в списках с переиспользованием ячеек?

**Готово, когда…** лидерборд работает, и ты объясняешь роль ключей.

Дальше: [часть 3 — основы Skia и графики](04-animations-reanimated-skia-part3.md).
