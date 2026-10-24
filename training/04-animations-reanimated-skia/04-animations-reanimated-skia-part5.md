# Анимации в React Native: Reanimated 4, Gesture Handler 3 и Skia

Обновлено: 2026-10-21 · Тренинг 4 из 6 · ≈ 16 часов · Вакансия: [карточка](../../card.ru.md)

[Часть 1](04-animations-reanimated-skia.md) · [часть 2](04-animations-reanimated-skia-part2.md) · [часть 3](04-animations-reanimated-skia-part3.md) · [часть 4](04-animations-reanimated-skia-part4.md) · Часть 5 из 5

Блоки 10–11: производительность, отладка, доступность, тесты; вопросы интервью, mock-интервью и источники. План — в [части 1](04-animations-reanimated-skia.md).

## Блок 10. Производительность, отладка, доступность, тесты (1 ч)

**Цель:** измерять, а не гадать; находить причину рывков; закрыть анимации тестами и учесть доступность.

**Что повторить: замеры**

- Только release-сборка: `npx expo run:android --variant release`, `npx expo run:ios --configuration Release` или preview-сборка EAS. В debug и в Expo Go цифры хуже реальных. На Android есть промежуточный вариант `debugOptimized` (RN 0.82+).
- `<PerformanceMonitor />` из Reanimated — FPS JS- и UI-потока прямо на экране. В dev-сборке есть ещё Dev Menu → Show Perf Monitor.
- React Native DevTools → Performance (RN 0.83+): таймлайн JS, треки React, сеть, свои метки.
- Flashlight (Android): `flashlight measure` — FPS, CPU по потокам, RAM и итоговый score; `flashlight test` — повторяемые прогоны по сценарию.
- Нативные профайлеры: Android Studio Profiler, Xcode Instruments.
- Замедлить анимации для отладки: iOS Simulator → Debug → Slow Animations; на Android — `toggleSlowAnimationsOnUIRuntime()` из `react-native-worklets`.
- 120 Гц на iPhone: `CADisableMinimumFrameDurationOnPhone = true` в Info.plist (в шаблоне RN — с 0.82; в Expo проверь `ios.infoPlist` в `app.json`).

**Что повторить: правила**

- Нет `setState` на кадр; нет чтения `.value` на JS в горячем коде.
- Анимируй `transform` и `opacity`. `width`, `height`, `top`, `margin` пересчитывают layout на каждом кадре.
- Меньше анимированных view: гайд Reanimated называет ~100 на слабом Android и ~500 на iOS. Дальше — один Canvas Skia.
- Worklet копирует замыкание: не тащи туда большие объекты. Данные для UI — в shared value, раз на тик.
- Skia: Paint, пути и шрифты — в модуле или в `useMemo`; путь из данных — `useDerivedValue` / `usePathValue`.
- Списки: FlashList v2 переиспользует ячейки — сбрасывай shared values при смене элемента; не запускай `entering` на каждую строку при скролле; не ставь Canvas в каждую строку длинного списка.
- Часто меняющееся число — анимированный `TextInput`, а не ре-рендер `Text`.
- Не передавай deps в хуки Reanimated на native.
- Много одновременных анимаций тормозят — посмотри флаги `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS` / `IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS` (нужен dev build; они влияют на обработку касаний, читай гайд).

**Что повторить: доступность**

- У анимаций и layout animations Reanimated по умолчанию `ReduceMotion.System`: при включённой настройке значение сразу конечное, `withDelay` не ждёт, `exiting` и shared transitions пропускаются.
- `useReducedMotion()` — значение на момент старта приложения. Бесконечные `useClock` / `useFrameCallback`, шейдеры и частицы выключай сам.
- `<ReducedMotionConfig mode={ReduceMotion.Never} />` меняет поведение глобально (например, для e2e-тестов).
- Скринридер: альтернатива жестам (`accessibilityActions`) и итоговые значения вместо покадровых.

**Что повторить: тесты**

- Чистые функции (формат, шкалы, снапы) — `node:test` или Jest, без рендера. Ты уже так делал в упражнениях 2, 3 и 9.
- Компоненты — Jest + `@testing-library/react-native`: resolver Reanimated, `setUpTests()`, fake timers, матчер `toHaveAnimatedStyle`. Старые `withReanimatedTimer` / `advanceAnimationByTime` — deprecated.
- Жесты — `createGestureController` или `fireGestureHandler` из `react-native-gesture-handler/jest-utils`.
- На устройстве — Maestro (ты использовал его в Hotline.Finance).
- Skia в Jest — свои `jestEnv` / `jestSetup` из пакета Skia (см. документацию).

```js
// jest.config.js
module.exports = {
  preset: 'jest-expo',
  resolver: 'react-native-reanimated/jest/resolver', // web-реализация Reanimated и Worklets
  setupFiles: ['./node_modules/react-native-gesture-handler/jestSetup.js'],
  setupFilesAfterEnv: ['./jest-setup.ts'],
};
```

```ts
// file: jest-setup.ts
import { setUpTests } from 'react-native-reanimated';

setUpTests(); // матчеры toHaveAnimatedStyle / toHaveAnimatedProps, 60 fps
```

```ts
// file: reanimated-jest.d.ts
// Типы матчеров Reanimated: из коробки TypeScript их не видит
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveAnimatedStyle(
        style: Record<string, unknown> | Record<string, unknown>[],
        config?: { shouldMatchAllProps?: boolean },
      ): R;
      toHaveAnimatedProps(props: Record<string, unknown>): R;
    }
  }
}
export {};
```

Тест для упражнения 8 — красный, пока не сделаны TODO:

```tsx
// file: SwipeToConfirm.test.tsx
import { render, screen, waitFor } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { createGestureController } from 'react-native-gesture-handler/jest-utils';

import { SwipeToConfirm } from './SwipeToConfirm';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success' },
}));

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

// GestureDetector в dev-режиме требует GestureHandlerRootView выше по дереву — и в тестах тоже
function renderSwipe(onConfirm = jest.fn()) {
  return render(
    <GestureHandlerRootView>
      <SwipeToConfirm label="Купить BTC" onConfirm={onConfirm} />
    </GestureHandlerRootView>,
  );
}

test('свайп до конца подтверждает ордер ровно один раз', async () => {
  const onConfirm = jest.fn();
  renderSwipe(onConfirm);

  const pan = createGestureController('swipe-confirm'); // testID из usePanGesture
  pan.begin({ translationX: 0 });
  pan.activate({ translationX: 12 });
  pan.update({ translationX: 300 });
  pan.end({ translationX: 300 });

  await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
});

test('короткий свайп возвращает ползунок на место', () => {
  renderSwipe();
  const pan = createGestureController('swipe-confirm');
  pan.begin();
  pan.activate({ translationX: 12 });
  pan.update({ translationX: 60 });
  pan.end({ translationX: 60 });

  jest.advanceTimersByTime(1000); // пружина успела вернуться
  expect(screen.getByTestId('knob')).toHaveAnimatedStyle({ transform: [{ translateX: 0 }] });
});
```

Если колбэки жеста в тесте не вызываются — сверься с [гайдом GH по тестам](https://docs.swmansion.com/react-native-gesture-handler/docs/guides/testing): там есть пример с `disableReanimated: true`.

**Практика**

- **10.1. Замер** (20 мин). Свечи (упражнение 4) и конфетти (упражнение 6) в release-сборке: `PerformanceMonitor` + Flashlight (Android) или Instruments (iOS). Запиши таблицу: UI FPS (минимум и среднее), JS FPS. Потом сломай специально: `scheduleOnRN(setState, …)` в каждом `onUpdate` жеста — и замерь снова. Готово: таблица «до / после» и вывод одной фразой.
- **10.2. Jest** (25 мин). Настрой по шаблону. Тесты swipe-to-confirm: красные → зелёные после TODO. Добавь тест для упражнения 1: через 600 мс после тика фон снова прозрачный (`toHaveAnimatedStyle`).
- **10.3. Reduce Motion** (15 мин). Включи настройку на телефоне и пройди все 9 демо. Составь список того, что ещё двигается, и почини 2 пункта.

**Самопроверка**

1. Почему FPS меряют в release-сборке?
2. UI 60 FPS, JS 20 FPS — анимация плавная? Что пострадает?
3. Три типичные причины рывков анимации в списке.
4. Как протестировать анимацию без симулятора?
5. Что делает `ReduceMotion.System` с `withDelay` и `exiting`?

**Готово, когда…** таблица замеров есть, тесты зелёные, проход с Reduce Motion сделан.

## Блок 11. Интервью (1 ч)

**Цель:** отвечать на вопросы по анимациям коротко, точно и с примерами из трейдинга; пройти mock-интервью.

**Что повторить:** журнал `mistakes.md`, таблицу «как было → как сейчас» из [части 1](04-animations-reanimated-skia.md) и свои демо из `anim-lab`.

**Практика**

- **11.1** (30 мин). 15 вопросов ниже: сначала ответь вслух сам (1–2 минуты на вопрос), потом сверь. Ошибки — в `mistakes.md`.
- **11.2** (30 мин). Mock-интервью с AI по промпту ниже, затем разбор: 3 слабых места → повтори нужные блоки. Повтори диагностику из блока 0 и сравни оценки.

### 15 вопросов и короткие ответы

1. **Почему анимации считают на UI-потоке?** JS-поток занят рендером React, логикой и разбором тиков; любая пауза там — пропущенный кадр. Reanimated выполняет worklets на UI-потоке синхронно с кадром (16,7 мс при 60 Гц), жесты Gesture Handler распознаются там же. JS только задаёт цель анимации.
2. **Что такое worklet?** Функция, которую Babel-плагин `react-native-worklets` готовит к запуску в другом JS-рантайме — UI runtime. Замыкание копируется при создании; внутри можно вызывать только worklets. Колбэки хуков Reanimated и жестов GH 3 становятся worklets автоматически, свои хелперы — с `'worklet'`. Мост к опыту: frame processors VisionCamera — тот же принцип.
3. **Shared value или state?** State — для React: изменение вызывает рендер, живёт на JS. Shared value — для анимаций: доступен обоим потокам, изменение не вызывает рендер. Правило: то, что меняется каждый кадр или каждый тик, — shared value; то, что меняет разметку, — state.
4. **Как вызвать JS из worklet в 2026 году?** `scheduleOnRN(fn, ...args)` из `react-native-worklets`; `runOnJS(fn)(args)` — deprecated. Обратно — `scheduleOnUI`, синхронно — `runOnUISync`. Функция для `scheduleOnRN` объявлена в теле компонента или модуля.
5. **Как анимировать обновление цены без ре-рендера списка?** Цена символа — shared value в сторе вне React: WebSocket → `price.value = next`, раз на тик (conflation: последняя цена по символу 4–10 раз в секунду — [тренинг 2](../02-trading-app-architecture/02-trading-app-architecture.md)). Строка — `memo`, на цену в React не подписана. `useAnimatedReaction` ловит изменение и запускает вспышку; текст — анимированный `TextInput` через `useAnimatedProps`. JS работает раз на тик, кадры — на UI.
6. **`useDerivedValue`, `useAnimatedReaction`, `useAnimatedStyle` — в чём разница?** Derived — вычисляемое значение (путь графика, текст). Reaction — побочный эффект при изменении (вспышка, хаптик через `scheduleOnRN`). AnimatedStyle — стиль view. В `useAnimatedStyle` shared values не меняют.
7. **timing, spring, decay — когда что?** Timing — заданное время и кривая (вспышка, прогресс). Spring — естественное движение и учёт скорости жеста (шторка, ползунок, «поп» бейджа). Decay — инерция после свайпа (скролл графика). В Reanimated 4 у пружины `duration` перцептивная, реальное время ≈ 1,5×; пороги заменены на `energyThreshold`.
8. **Что изменилось в Reanimated 4?** Только New Architecture (4.7 — RN 0.86–0.88). Worklets — отдельный пакет `react-native-worklets` с плагином `react-native-worklets/plugin`. CSS-анимации и transitions. `runOnJS` / `runOnUI` → `scheduleOnRN` / `scheduleOnUI`. Удалены `useAnimatedGestureHandler`, `useWorkletCallback`, `combineTransition`. Новые пружины; `useScrollViewOffset` → `useScrollOffset`; deps на native не нужны. Shared element transitions — экспериментально за флагом. В остальном API совместим с 3.x.
9. **CSS-анимации или shared values?** CSS — для анимаций от состояния: показать / скрыть, таб, пульс; меньше кода, и Reanimated проще их оптимизировать. Shared values — жесты, скролл, переходы экранов, связанные анимации, всё, что меняется каждый кадр.
10. **Skia, SVG или Lottie?** SVG — иконки и простые формы; каждый элемент — нативный view. Lottie — готовая анимация дизайнера из After Effects: проигрываешь, но мало управляешь из кода. Skia — графики, частицы, шейдеры, сотни примитивов в одном Canvas с анимацией на UI-потоке (Lottie можно проиграть и в Skia через `Skottie`). Свечи и конфетти — Skia, иконки ачивок — SVG, маскот — Lottie.
11. **Как сделать график на 1000+ свечей с зумом на 60 FPS?** Один Canvas; данные — в shared value (копия на UI раз на обновление). Рисую в `createPicture` внутри `useDerivedValue` только видимые свечи; pan и pinch одновременно (`useSimultaneousGestures`); инерция — `withDecay` с clamp; шкала Y — по видимым свечам; Paint создаю один раз. Ноль ре-рендеров при жестах. Для 50 000 свечей — агрегация в таймфреймы и прореживание по зуму.
12. **Как устроены жесты в GH 3 и как не сломать скролл?** Хуки `usePanGesture({ … })` + `GestureDetector`; колбэки — worklets на UI; `onActivate` / `onUpdate` / `onDeactivate` вместо `onStart` / `onEnd`. Чтобы не ломать вертикальный скролл — `activeOffsetX` + `failOffsetY` или `activateAfterLongPress`. Композиция — `useSimultaneousGestures`, `useExclusiveGestures`, `useCompetingGestures`.
13. **В чём подвох layout animations в списках?** Нужны стабильные ключи. В виртуализированных списках ячейки переиспользуются: FlashList просит `prepareForLayoutAnimationRender()` перед вставкой и удалением, а shared values в строке надо сбрасывать при смене элемента. Массовые `entering` при скролле дороги — `skipEnteringExitingAnimations` / `LayoutAnimationConfig`.
14. **Анимация дёргается. Как ищешь причину?** Release-сборка. Смотрю, какой поток проседает: `PerformanceMonitor` / Perf Monitor. Проседает JS — ищу ре-рендеры и тяжёлую логику (DevTools Performance, Profiler), убираю setState на кадр. Проседает UI — слишком много view, layout-свойства вместо transform, тяжёлая отрисовка: Flashlight, Instruments. Чиню и меряю снова.
15. **Как тестируешь анимации и учитываешь доступность?** Чистая математика — unit-тесты; компоненты — Jest с `setUpTests()`, fake timers и `toHaveAnimatedStyle`; жесты — `createGestureController`; поведение на устройстве — Maestro (использовал в Hotline.Finance). Доступность: Reduce Motion (`ReduceMotion.System` по умолчанию, свои бесконечные эффекты выключаю по `useReducedMotion`), альтернатива свайпу для скринридера, хаптик — не единственный сигнал.

### По-английски: 5 фраз

Интервью, скорее всего, на русском, но держи готовые фразы на случай перехода на английский:

- "Animations run on the UI thread, so a busy JS thread doesn't drop frames."
- "A shared value is visible to both threads, and changing it doesn't trigger a re-render."
- "For price ticks, I update a shared value once per tick, and a worklet animates every frame."
- "In Reanimated 4, I call JS from a worklet with scheduleOnRN."
- "For candlestick charts, I use one Skia canvas and draw only the visible candles."

### Промпт для mock-интервью

Скопируй в Claude или ChatGPT целиком:

```text
Ты — Senior Frontend-разработчик в компании с трейдинговой платформой: основное приложение
на React Native и геймифицированные mini-apps (турниры, челленджи, лояльность, ачивки).
Проводишь со мной техническое интервью на позицию React Native-разработчика, 45 минут, на русском.
Актуальные версии на 2026-10: Expo SDK 58, React Native 0.88, Reanimated 4.7 + react-native-worklets 0.13,
Gesture Handler 3, React Native Skia 2.14 / 3.x.

План:
1) 10 мин — теория: потоки, worklets, shared values, что изменилось в Reanimated 4.
2) 15 мин — live coding в чате. Дай одну задачу на выбор: вспышка цены на тик без ре-рендера строки
   или swipe-to-confirm с хаптиком. Код пишу я сам.
3) 10 мин — дизайн: свечной график на 1000+ свечей с зумом на 60 FPS.
4) 5 мин — производительность и отладка рывков.
5) 5 мин — мои вопросы к тебе.

Правила:
- Один вопрос за раз. Жди мой ответ. Не подсказывай, пока я не попрошу.
- На слабый ответ — один уточняющий вопрос, как на реальном интервью.
- Если я использую устаревший API (runOnJS, Gesture.Pan(), useAnimatedGestureHandler,
  Skia.Path.Make().moveTo), отметь это, но не исправляй сразу.
- В конце: оценка 1–5 по блокам (теория, код, дизайн, производительность, коммуникация),
  3 главных пробела и что повторить, со ссылками на официальную документацию.
```

Вариант на английском: замени «на русском» на «in English» и добавь: «После интервью отдельно перечисли мои языковые ошибки и предложи, как сказать лучше».

**Самопроверка:** повтори диагностику из блока 0 — цель: 2 балла по каждому вопросу.

**Готово, когда…** на все 15 вопросов отвечаешь вслух за 1–2 минуты каждый, mock-интервью пройдено, диагностика из блока 0 — на 2 по каждому пункту.

## Источники

Версии пакетов — npm registry (`npm view <pkg> version`, `dist-tags`); версии в Expo SDK 58 — файл `bundledNativeModules.json` пакета `expo@58.0.16`. Проверено 2026-10-21. API сверены по типам пакетов: код тренинга прошёл `tsc` (конфиг Expo SDK 58) с Reanimated 4.7.1, Worklets 0.13.0, Gesture Handler 3.3.0, Skia 2.14.0, keyboard-controller 1.22.7, expo-haptics 58.0.7. Тесты `node:test` из упражнений проверены на эталонных решениях (в тренинг они не входят); тесты Jest и код на устройстве не запускались.

Reanimated и Worklets:

- [Getting started](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/) — проверено 2026-10-21
- [Глоссарий](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary/) — проверено 2026-10-21
- [Миграция 3.x → 4.x](https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/) — проверено 2026-10-21
- [useSharedValue](https://docs.swmansion.com/react-native-reanimated/docs/core/useSharedValue/) — проверено 2026-10-21
- [useAnimatedStyle](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedStyle/) — проверено 2026-10-21
- [withSpring](https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/) — проверено 2026-10-21
- [CSS-анимации: animationName](https://docs.swmansion.com/react-native-reanimated/docs/css-animations/animation-name/) — проверено 2026-10-21
- [CSS transitions: transitionProperty](https://docs.swmansion.com/react-native-reanimated/docs/css-transitions/transition-property/) — проверено 2026-10-21
- [Layout transitions](https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/layout-transitions/) — проверено 2026-10-21
- [Shared element transitions](https://docs.swmansion.com/react-native-reanimated/docs/shared-element-transitions/overview/) — проверено 2026-10-21
- [Feature flags](https://docs.swmansion.com/react-native-reanimated/docs/guides/feature-flags/) — проверено 2026-10-21
- [useScrollOffset](https://docs.swmansion.com/react-native-reanimated/docs/scroll/useScrollOffset/) — проверено 2026-10-21
- [makeMutable](https://docs.swmansion.com/react-native-reanimated/docs/advanced/makeMutable/) — проверено 2026-10-21
- [Доступность (Reduce Motion)](https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/) — проверено 2026-10-21
- [useReducedMotion](https://docs.swmansion.com/react-native-reanimated/docs/device/useReducedMotion/) — проверено 2026-10-21
- [Производительность](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/) — проверено 2026-10-21
- [Тесты с Jest](https://docs.swmansion.com/react-native-reanimated/docs/guides/testing/) — проверено 2026-10-21
- [Релизы Reanimated (4.6, 4.7)](https://github.com/software-mansion/react-native-reanimated/releases) — проверено 2026-10-21
- [Reanimated 4 stable: CSS или worklets](https://swmansion.com/blog/reanimated-4-stable-release-the-future-of-react-native-animations-ba68210c3713) — проверено 2026-10-21
- [Worklets: scheduleOnRN](https://docs.swmansion.com/react-native-worklets/docs/threading/scheduleOnRN/) — проверено 2026-10-21
- [Worklets: тесты](https://docs.swmansion.com/react-native-worklets/docs/guides/testing) — проверено 2026-10-21

Gesture Handler:

- [Анонс Gesture Handler 3](https://swmansion.com/blog/introducing-gesture-handler-3-0-hook-based-api-deeper-reanimated-integration-more-9185b0c8e305) — проверено 2026-10-21
- [Миграция на 3.x](https://docs.swmansion.com/react-native-gesture-handler/docs/guides/upgrading-to-3) — проверено 2026-10-21
- [usePanGesture](https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/use-pan-gesture) — проверено 2026-10-21
- [useSimultaneousGestures](https://docs.swmansion.com/react-native-gesture-handler/docs/composition/use-simultaneous-gestures) — проверено 2026-10-21
- [Тесты](https://docs.swmansion.com/react-native-gesture-handler/docs/guides/testing) — проверено 2026-10-21

Skia:

- [Миграция на v3 (пакет `react-native-skia`)](https://wcandillon.github.io/react-native-skia/docs/getting-started/migration/) — проверено 2026-10-21
- [Установка](https://wcandillon.github.io/react-native-skia/docs/getting-started/installation/) — проверено 2026-10-21
- [Анимации с Reanimated](https://wcandillon.github.io/react-native-skia/docs/animations/animations/) — проверено 2026-10-21
- [Хуки анимаций](https://wcandillon.github.io/react-native-skia/docs/animations/hooks/) — проверено 2026-10-21
- [Жесты](https://wcandillon.github.io/react-native-skia/docs/animations/gestures/) — проверено 2026-10-21
- [Path](https://wcandillon.github.io/react-native-skia/docs/shapes/path/) — проверено 2026-10-21
- [Picture](https://wcandillon.github.io/react-native-skia/docs/shapes/pictures/) — проверено 2026-10-21
- [Atlas](https://wcandillon.github.io/react-native-skia/docs/shapes/atlas/) — проверено 2026-10-21
- [Шейдеры](https://wcandillon.github.io/react-native-skia/docs/shaders/overview/) — проверено 2026-10-21
- [Текст](https://wcandillon.github.io/react-native-skia/docs/text/text/) — проверено 2026-10-21
- [Релиз v2.14.0: удалён изменяемый SkPath](https://github.com/wcandillon/react-native-skia/releases/tag/v2.14.0) — проверено 2026-10-21
- [Релиз v2.6.0: неизменяемый Path API](https://github.com/wcandillon/react-native-skia/releases/tag/v2.6.0) — проверено 2026-10-21

Expo и другие библиотеки:

- [Expo SDK 58: Reanimated](https://docs.expo.dev/versions/v58.0.0/sdk/reanimated/) — проверено 2026-10-21
- [Expo SDK 58: Gesture Handler](https://docs.expo.dev/versions/v58.0.0/sdk/gesture-handler/) — проверено 2026-10-21
- [Expo SDK 58: Skia](https://docs.expo.dev/versions/v58.0.0/sdk/skia/) — проверено 2026-10-21
- [Expo SDK 58: Haptics](https://docs.expo.dev/versions/v58.0.0/sdk/haptics/) — проверено 2026-10-21
- [Expo SDK 58: keyboard-controller](https://docs.expo.dev/versions/v58.0.0/sdk/keyboard-controller/) — проверено 2026-10-21
- [Expo UI: BottomSheet (замена @gorhom/bottom-sheet)](https://docs.expo.dev/versions/v58.0.0/sdk/ui/drop-in-replacements/bottomsheet/) — проверено 2026-10-21
- [Expo: React Compiler](https://docs.expo.dev/guides/react-compiler/) — проверено 2026-10-21
- [keyboard-controller: useReanimatedKeyboardAnimation](https://kirillzyusko.github.io/react-native-keyboard-controller/docs/api/hooks/keyboard/use-reanimated-keyboard-animation) — проверено 2026-10-21
- [FlashList + Reanimated](https://shopify.github.io/flash-list/docs/guides/reanimated) — проверено 2026-10-21
- [FlashList: layout animations](https://shopify.github.io/flash-list/docs/guides/layout-animation) — проверено 2026-10-21
- [@gorhom/bottom-sheet: релизы](https://github.com/gorhom/react-native-bottom-sheet/releases) — проверено 2026-10-21
- [@gorhom/bottom-sheet: issue #2785](https://github.com/gorhom/react-native-bottom-sheet/issues/2785) — проверено 2026-10-21
- [React Native DevTools](https://reactnative.dev/docs/react-native-devtools) — проверено 2026-10-21
- [Flashlight](https://docs.flashlight.dev/) — проверено 2026-10-21
