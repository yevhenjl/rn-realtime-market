# Анимации в React Native: Reanimated 4, Gesture Handler 3 и Skia

Обновлено: 2026-10-21 · Тренинг 4 из 6 · ≈ 16 часов · Вакансия: [карточка](../../card.ru.md)

Часть 1 из 5 · [часть 2](04-animations-reanimated-skia-part2.md) · [часть 3](04-animations-reanimated-skia-part3.md) · [часть 4](04-animations-reanimated-skia-part4.md) · [часть 5](04-animations-reanimated-skia-part5.md)

## Зачем этот тренинг

Следующий этап в IBIT (вероятный работодатель) — техническое интервью с Senior Frontend-разработчиком ([интервью](../../interviews.ru.md)). Роль — React Native-разработчик: основное трейдинговое приложение и новые геймифицированные «trading mini-apps» — турниры, челленджи, лояльность, ачивки ([исследование IBIT](../../../../../research/companies/ibit.ru.md)). В таком продукте анимации — не украшение. Это тик цены, график, P&L, подтверждение ордера и награды. Интервьюер почти наверняка спросит, почему анимация не тормозит под потоком котировок, и попросит набросать код.

- С Reanimated ты работал около 2 лет назад и многое забыл. За это время вышли Reanimated 4, Gesture Handler 3 и Skia 2.14 / 3. API заметно изменились, поэтому идём от основ до уровня senior.
- Опора на опыт — только факты. Reanimated и Lottie есть в твоём резюме. В Hotline.Finance ты перевёл приложение на New Architecture (Fabric), а Reanimated 4 работает только на ней. Ты писал на Kotlin плагин frame processor для VisionCamera — frame processors тоже worklets. Геймификация HabitHero (лиги, очки, уровни, стрики, награды, челленджи) — прямой мост к турнирам и ачивкам IBIT.
- Про Skia говори честно. Если в продакшене не использовал: «в продакшене не делал — вот как сделал бы, вот демо».
- Результат — песочница `anim-lab` с 9 демо (трейдинг и геймификация). Её можно показать на интервью.
- ★ — по желанию: если закончил раньше или хочешь глубже.

## Как заниматься с AI

Ты учишься с Claude Code / Codex, но думаешь и пишешь сам ([тренинг 3](../03-ai-tools-claude-code-codex/03-ai-tools-claude-code-codex.md)).

1. **Сначала сам, потом сверь с AI.** В каждом упражнении первые 15–30 минут — без AI: схема, код, ответы вслух.
2. **Попроси AI объяснить, а не решить.** Застрял дольше 10 минут — проси одну подсказку, не код.
3. **Не верь версиям в ответах AI.** Модели учились на коде Reanimated 2/3, Gesture Handler 2 и Skia 1.x. Таблица «как было → как сейчас» ниже — твой фильтр. Любой код от AI прогоняй через `npx tsc --noEmit`: `onStart` в `usePanGesture` и `path.moveTo` у `SkPath` ловятся уже на типах.
4. **Закрепи версии в контексте агента.** В корне песочницы — `CLAUDE.md` и `AGENTS.md` с версиями и запретами (блок 0).
5. **Говори вслух, пока пишешь код:** на интервью оценивают ход мысли.

| Зачем | Промпт |
|---|---|
| Объяснение | «Объясни <тема> на примере трейдингового приложения. Версии: Reanimated 4.7, react-native-worklets 0.13, Gesture Handler 3.3, Skia 2.14. Потом задай мне 3 вопроса и не отвечай за меня.» |
| Ревью кода | «Сделай code review как senior. Проверь: что выполняется на UI-потоке, лишние ре-рендеры, устаревшие API для этих версий. Только замечания с приоритетом, без исправленного кода.» |
| Подсказка | «Делаю упражнение <N>, застрял на <месте>. Дай одну подсказку — следующий шаг, без кода.» |
| Проверка фактов | «Сверь этот код с документацией <ссылка>. Что устарело или неверно?» |
| Ещё варианты | «Придумай 2 похожие задачи на <тема> уровня senior-интервью. Решения не показывай, пока я не пришлю свои.» |

## Стек и версии на 2026-10-21

| Пакет | npm latest | В Expo SDK 58 | Что важно |
|---|---|---|---|
| react-native | 0.88.0 | 0.88.0 | только New Architecture; React 19.3 |
| react-native-reanimated | 4.7.1 | 4.7.1 | поддерживает RN 0.86–0.88; в паре с worklets 0.13.x |
| react-native-worklets | 0.13.0 | 0.13.0 | worklets, `scheduleOnRN` / `scheduleOnUI`, Babel-плагин |
| react-native-gesture-handler | 3.4.0 | ~3.3.0 | хуки `usePanGesture` и др.; минимум RN 0.82 |
| @shopify/react-native-skia | 2.14.0 | 2.14.0 | последняя версия под этим именем; есть в Expo Go |
| react-native-skia | 3.7.2 | — | v3: Graphite, Android API 26+, iOS 15.1+, нужен dev build |
| expo-haptics | 58.0.7 | ~58.0.7 | `impactAsync`, `notificationAsync`, `selectionAsync` |
| react-native-keyboard-controller | 1.22.8 | 1.22.7 | замена `useAnimatedKeyboard`; есть в Expo Go |
| @shopify/flash-list | 2.3.3 | 2.3.2 | переиспользует ячейки: shared values в строке сбрасывай |
| react-native-svg · lottie-react-native | 15.16.0 · 7.5.0 | 15.16.0 · ~7.5.0 | иконки и простые формы · анимации из After Effects |
| @gorhom/bottom-sheet | 5.2.14 (2026-05-09) | — | работает, но на deprecated builder API жестов |
| @expo/ui | 58.0.21 | ~58.0.21 | `@expo/ui/community/bottom-sheet` — нативная шторка |

- Для учёбы хватит Expo Go SDK 58: Reanimated, Gesture Handler, Skia 2.14, expo-haptics и keyboard-controller в нём есть. ⚠️ На 2026-10-21 Expo Go для SDK 58 в сторах мог ещё не выйти (Expo, 2026-10-15: релиз «в ближайшие недели»). Если приложение из стора не открывает проект — development build (`npx expo run:ios` / `run:android`) или Android-эмулятор. Итоговый проект в тренинге 6 работает только на development build — см. [подготовку Mac и сборки](../06-websocket-demo-binance/06-websocket-demo-binance-part2.md); Skia там — пакет `react-native-skia` 2.15.1: API тот же, другое имя пакета.
- Dev build нужен для Skia v3, статических флагов Reanimated (например, shared element transitions) и честных замеров FPS в release-сборке.

## Как было → как сейчас

Если AI предлагает что-то из левой колонки — это устаревший код.

| Тема | Как было (Reanimated 2/3, GH 2, Skia 1.x) | Как сейчас (2026-10) |
|---|---|---|
| Архитектура | Reanimated 3 работает на Paper и Fabric | Reanimated 4 — только New Architecture; для старой — только 3.x, она не развивается |
| Пакет worklets | всё внутри `react-native-reanimated` | отдельный `react-native-worklets`; плагин `react-native-worklets/plugin` (в Expo подключается сам) |
| JS из worklet | `runOnJS(fn)(a, b)` | `scheduleOnRN(fn, a, b)`; `runOnJS` — deprecated |
| Worklet на UI | `runOnUI(fn)(a)`, `executeOnUIRuntimeSync` | `scheduleOnUI(fn, a)`, `runOnUISync(fn, a)` |
| Жесты + Reanimated | `useAnimatedGestureHandler` | удалён; жесты — Gesture Handler |
| Жесты GH | `Gesture.Pan().onStart().onEnd()` | `usePanGesture({ onActivate, onUpdate, onDeactivate })`; builder API deprecated |
| Колбэки GH | `onChange`; `onEnd((e, success) => …)` | `onChange` удалён — `changeX` в `onUpdate`; `onDeactivate((e) => e.canceled)` |
| Композиция GH | `Gesture.Simultaneous / Race / Exclusive` | `useSimultaneousGestures` / `useCompetingGestures` / `useExclusiveGestures` |
| Связи GH | `simultaneousWithExternalGesture`, `requireExternalGestureToFail` | `simultaneousWith`, `requireToFail`, `block` |
| Пружина | пороги `restDisplacementThreshold`, `restSpeedThreshold`; `duration` = время | `energyThreshold`; `duration` перцептивная, реальное время ≈ 1,5×; новые дефолты |
| Зависимости хуков | `useAnimatedStyle(fn, [deps])` | на native не нужны; с 4.6 — warning |
| `useWorkletCallback` | для колбэков-worklets | удалён: `'worklet'` + `useCallback` |
| Скролл | `useScrollViewOffset(ref)` | `useScrollOffset(ref)` |
| Layout | `Layout`, `combineTransition` | `LinearTransition`; `EntryExitTransition.entering(…).exiting(…)` |
| Экстраполяция | `Extrapolate.CLAMP` | `Extrapolation.CLAMP` |
| Клавиатура | `useAnimatedKeyboard` | deprecated → `react-native-keyboard-controller` |
| Shared element | `sharedTransitionTag` — экспериментально, но без флага | экспериментально, флаг `ENABLE_SHARED_ELEMENT_TRANSITIONS` (dev build), только native stack |
| Анимация «от состояния» | `useSharedValue` + `useEffect` + `withTiming` | можно CSS-API: `transitionProperty`, `animationName` в стиле |
| React Compiler | `.value` | `.get()` / `.set()` |
| Тесты | `withReanimatedTimer`, `advanceAnimationByTime` | `jest.useFakeTimers()` + `jest.advanceTimersByTime()`; resolver Reanimated |
| Skia: пакет | `@shopify/react-native-skia` 1.x | 2.14 (Expo SDK 58) или `react-native-skia` 3.x |
| Skia: путь | `const p = Skia.Path.Make(); p.moveTo(…)` | `SkPath` неизменяемый: `Skia.PathBuilder.Make().moveTo(…).build()` |
| Skia: анимации | `useValue`, `runTiming`, `useComputedValue` | shared values Reanimated прямо в пропсы; Skia ≥ 2.10 требует Reanimated 4 |
| Skia: размер | `onLayout` на `<Canvas>` | 2.14: `onSize`; v3: `onSize` удалён → `onLayout` |
| Skia: цвет | `interpolateColor` из Reanimated | `interpolateColors` из Skia |

## План на 16 часов

| # | Блок | Что внутри | Часть | Часы |
|---|---|---|---|---|
| 0 | Старт | песочница, CLAUDE.md с версиями, диагностика | 1 | 0,5 |
| 1 | Потоки и worklets | JS vs UI thread, worklet, shared value, хуки, `scheduleOnRN` | 1 | 1,5 |
| 2 | Анимационные функции | timing, spring, decay, модификаторы, easing, interpolate, CSS-анимации | 1 | 1,5 |
| 3 | Упражнения 1–2 | вспышка цены на тик, счётчик P&L | [2](04-animations-reanimated-skia-part2.md) | 1,5 |
| 4 | Жесты, скролл, клавиатура | GH 3, композиция, scroll-driven, keyboard-controller | 2 | 1,5 |
| 5 | Layout animations | entering / exiting / layout; упражнение 5 — лидерборд | 2 | 1 |
| 6 | Skia: основы | Canvas, PathBuilder, градиенты, текст, шейдеры, Picture, Atlas | [3](04-animations-reanimated-skia-part3.md) | 1,5 |
| 7 | Упражнения 3–4: графики | sparkline с перекрестием; свечи с pinch-zoom | 3 | 2 |
| 8 | Упражнения 6–7: геймификация | ачивка с конфетти; кольцо прогресса | [4](04-animations-reanimated-skia-part4.md) | 1,5 |
| 9 | Упражнения 8–9: ордер | swipe-to-confirm с хаптиком; bottom sheet | 4 | 1,5 |
| 10 | Производительность и тесты | FPS, отладка, списки, Reduce Motion, Jest | [5](04-animations-reanimated-skia-part5.md) | 1 |
| 11 | Интервью | 15 вопросов, mock-интервью с AI, источники | 5 | 1 |
| | **Итого** | 9 упражнений, 15 вопросов | | **16** |

Как разложить по дням (пример): день 1 — блоки 0–3 (5 ч); день 2 — блоки 4–6 (4 ч); день 3 — блоки 7–8 (3,5 ч); день 4 — блоки 9–11 (3,5 ч). Между днями пролистай журнал ошибок `mistakes.md`.

## Блок 0. Старт (0,5 ч)

**Цель:** песочница на актуальных версиях, правила для AI и честная точка отсчёта.

**Что повторить:** таблицы «Стек и версии» и «Как было → как сейчас» выше — 5 минут, без заучивания.

**Практика**

0.1. Песочница (10 мин):

```bash
npx create-expo-app@latest anim-lab --template default@sdk-58   # без шаблона @latest всё ещё создаёт SDK 57
cd anim-lab
npx expo install react-native-reanimated react-native-worklets react-native-gesture-handler \
  @shopify/react-native-skia expo-haptics react-native-svg react-native-keyboard-controller \
  @shopify/flash-list
npx expo start
```

- Сверь версии в `package.json` с таблицей выше.
- Оберни корневой `_layout.tsx` в `GestureHandlerRootView style={{ flex: 1 }}`, если шаблон этого ещё не сделал. Для блока 4 там же понадобится `KeyboardProvider`.
- Babel-плагин worklets в Expo подключает `babel-preset-expo`. Если у тебя свой `babel.config.js`, `react-native-worklets/plugin` должен стоять последним.
- Экран на каждое упражнение: `src/app/lab/01-flash.tsx` и т. д. Журнал ошибок — `mistakes.md`.

0.2. Правила для агента (5 мин) — файл `CLAUDE.md` (копия — `AGENTS.md` для Codex):

```markdown
# anim-lab: правила для AI
- Версии: Expo SDK 58, RN 0.88, Reanimated 4.7 + react-native-worklets 0.13,
  Gesture Handler 3.3, @shopify/react-native-skia 2.14.
- JS из worklet — scheduleOnRN из react-native-worklets, не runOnJS.
- Жесты — хуки usePanGesture / useTapGesture …, колбэки onActivate / onUpdate / onDeactivate.
  Не используй Gesture.Pan() и useAnimatedGestureHandler.
- Skia: SkPath неизменяемый, пути — Skia.PathBuilder.Make()…build().
- Не передавай массивы зависимостей в useAnimatedStyle / useDerivedValue / useAnimatedReaction.
- Я учусь: не пиши решения упражнений целиком — объясняй, давай подсказки и делай ревью.
```

**Самопроверка — диагностика** (10 мин, без AI). Ответь письменно, 1–2 фразы на вопрос. Оцени себя: 0 — не знаю, 1 — примерно, 2 — уверенно. В блоке 11 ответишь ещё раз и сравнишь.

1. На каком потоке выполняется колбэк `useAnimatedStyle`?
2. Чем shared value отличается от `useState`?
3. Как в 2026 году вызвать `setState` из worklet?
4. Почему `withSpring(1, { duration: 300 })` в Reanimated 4 длится дольше 300 мс?
5. Как в Gesture Handler 3 называется колбэк, который раньше был `onEnd`?
6. Чем Skia отличается от react-native-svg под капотом?
7. Что может сломаться, если строка FlashList хранит `useSharedValue`?
8. Как ведут себя анимации Reanimated при включённом Reduce Motion?

**Готово, когда…** песочница запущена на телефоне, версии совпадают, `CLAUDE.md` лежит в корне, ответы диагностики записаны.

## Блок 1. Потоки, worklets, shared values (1,5 ч)

**Цель:** за 2 минуты объяснить модель потоков Reanimated и писать хуки без ошибок «не тот поток».

**Что повторить**

- **Потоки.** JS-поток: React, бизнес-логика, обработка тиков из WebSocket. UI-поток (main): нативные view, жесты, отрисовка кадра. Бюджет кадра — 16,7 мс при 60 Гц и 8,3 мс при 120 Гц.
- **Почему анимации на UI.** Если кадры считает JS, любая его работа (ре-рендер списка, `JSON.parse` пачки тиков) съедает кадры. Reanimated считает кадры на UI-потоке, синхронно с отрисовкой. Gesture Handler распознаёт жесты там же. JS только задаёт цель.
- **Worklet** — функция, которую можно выполнить в другом JS-рантайме (UI runtime). Babel-плагин находит директиву `'worklet'` и колбэки хуков (`useAnimatedStyle`, `useDerivedValue`, `usePanGesture` …). Замыкание копируется в момент создания worklet. Внутри worklet можно вызывать только worklets: свой хелпер помечай `'worklet'`. (Под капотом — JSI и отдельный JS-рантайм; тот же принцип у frame processors в VisionCamera.)
- **Shared value** — `useSharedValue(0)`: значение, доступное обоим рантаймам. Изменение не вызывает ре-рендер. Доступ — `.value` или `.get()` / `.set()`; с React Compiler — только `get` / `set`. Не читай и не меняй его во время рендера. Чтение на JS-потоке синхронное и может ждать UI-поток. Объект переприсваивай целиком (или `.modify`), не меняй поля.
- **`useAnimatedStyle(() => style)`** — worklet; пересчитывается, когда меняются прочитанные в нём shared values. Анимированный стиль важнее статического, порядок в массиве стилей на это не влияет. Не меняй shared values внутри.
- **`useDerivedValue(() => …)`** — вычисляемый shared value (только чтение). **`useAnimatedReaction(prepare, react)`** — побочный эффект при изменении: `react(current, previous)`. **`useAnimatedProps`** — не-стилевые пропсы: SVG, `text` у `TextInput`.
- **Вызовы между потоками** (`react-native-worklets`): `scheduleOnRN(fn, ...args)` — JS-функция из worklet; функция объявлена в теле компонента или модуля. `scheduleOnUI(worklet, ...args)` — запуск на UI; `runOnUISync` — синхронно, с результатом.
- **Зависимости.** На native зависимости хуков Reanimated берутся из замыкания. Массив deps нужен только на web без Babel-плагина; с 4.6 на native он даёт warning.
- Ссылки: [глоссарий](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary/) · [useSharedValue](https://docs.swmansion.com/react-native-reanimated/docs/core/useSharedValue/) · [useAnimatedStyle](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedStyle/) · [scheduleOnRN](https://docs.swmansion.com/react-native-worklets/docs/threading/scheduleOnRN/) · [миграция 3 → 4](https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/)

Пример — прогресс челленджа:

```tsx
// file: ChallengeProgress.tsx
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

export function ChallengeProgress({ target }: { target: number }) {
  const progress = useSharedValue(0); // 0..1, доступен JS и UI
  const [completed, setCompleted] = useState(false); // React state — только JS

  useEffect(() => {
    progress.value = withTiming(target, { duration: 600 }); // JS задаёт цель, кадры считает UI
  }, [target, progress]);

  const percent = useDerivedValue(() => Math.round(progress.value * 100));

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }], // transform дешевле, чем width
  }));

  useAnimatedReaction(
    () => percent.value >= 100,
    (done, wasDone) => {
      if (done && !wasDone) scheduleOnRN(setCompleted, true); // UI → JS один раз
    },
  );

  return (
    <View>
      <View style={{ height: 8, backgroundColor: '#e5e7eb', overflow: 'hidden' }}>
        <Animated.View
          style={[{ height: 8, backgroundColor: '#22c55e', transformOrigin: 'left' }, barStyle]}
        />
      </View>
      {completed ? <Text>Челлендж выполнен</Text> : null}
    </View>
  );
}
```

**Практика**

- **1.1. Карта потоков** (15 мин, без AI). Нарисуй путь тика: WebSocket → JS-стор → `price.value = next` → `useAnimatedStyle` на UI → view. Отметь, что выполняется раз на тик, а что — раз на кадр. Готово: покадровая работа на схеме только на UI-потоке. Потом попроси AI найти ошибку в схеме.
- **1.2. Сломай и почини** (25 мин). Сделай 3 ошибки специально: (a) вызови в `useAnimatedStyle` хелпер без `'worklet'`; (b) прочитай `progress.value` прямо в JSX; (c) измени поле объекта: `pos.value.x = 10`. Готово: для каждой ошибки записаны сообщение (или поведение) и объяснение одной фразой.
- **1.3. Занятый JS-поток** (25 мин). Кнопка «Блок JS 2 с»: `const end = Date.now() + 2000; while (Date.now() < end) {}`. Рядом: бесконечная анимация Reanimated (`withRepeat`), такая же на RN `Animated` с `useNativeDriver: false` и квадрат, который тянешь пальцем (возьми `DraggableCard` из блока 4). Готово: во время блокировки Reanimated и перетаскивание плавные, а `Animated` замирает. Объясни почему.
- **1.4. `scheduleOnRN`** (15 мин). Доведи `ChallengeProgress`: на 100% вызови `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)`. Готово: хаптик срабатывает один раз за заполнение, а не каждый кадр (`console.count`).
- **1.5. ★ React Compiler** (10 мин). Включи `"experiments": { "reactCompiler": true }` в `app.json` и перепиши пример на `.get()` / `.set()`.

**Самопроверка**

1. Почему перетаскивание не тормозит, когда JS-поток занят?
2. Что происходит с переменной из замыкания, когда создаётся worklet? А если она потом изменится на JS?
3. Чем `useDerivedValue` отличается от `useAnimatedReaction`?
4. Откуда можно вызывать `scheduleOnRN` и где должна быть объявлена функция?
5. Почему нельзя писать `sv.value = withTiming(1)` внутри `useAnimatedStyle`?
6. Зачем `.get()` / `.set()`, если есть `.value`?

**Готово, когда…** ты вслух объясняешь путь «тик → кадр» и на глаз отличаешь JS-код от worklet-кода.

## Блок 2. Анимационные функции и CSS-анимации (1,5 ч)

**Цель:** быстро выбирать подходящую анимацию и знать, что изменилось в Reanimated 4.

**Что повторить**

- **`withTiming(to, { duration, easing })`** — по времени; по умолчанию 300 мс и `Easing.inOut(Easing.quad)`. Кривые: `Easing.out(Easing.cubic)`, `Easing.bezier(x1, y1, x2, y2)`.
- **`withSpring(to, config)`** — пружина. Два взаимоисключающих режима: физика (`stiffness`, `damping`, `mass`) или время (`duration`, `dampingRatio`). В 4.x: `duration` перцептивная, реальная анимация ≈ 1,5×; пороги заменены на `energyThreshold`; дефолт — `GentleSpringConfig`. Пресеты: `Gentle`, `Snappy` (без перелёта), `Wiggly`; старое поведение — `Reanimated3DefaultSpringConfig`. `velocity` — скорость из жеста.
- **`withDecay({ velocity, clamp, rubberBandEffect })`** — инерция после свайпа.
- **Модификаторы:** `withSequence(a, b, …)`, `withRepeat(anim, n, reverse)` (`-1` — бесконечно), `withDelay(ms, anim)`, `withClamp`. Остановить — `cancelAnimation(sv)`. Колбэк `(finished) => …` выполняется на UI; в JS — через `scheduleOnRN`.
- Новое присваивание прерывает анимацию и стартует с текущего значения. Для тиков это и нужно.
- **`interpolate(v, input, output, Extrapolation.CLAMP)`:** `EXTEND` (по умолчанию) продолжает линию, `CLAMP` обрезает по краям, `IDENTITY` возвращает вход. **`interpolateColor(v, input, colors, 'RGB' | 'HSV' | 'LAB')`.**
- **CSS-анимации и transitions** (новое в 4): `Animated.View` принимает в стиле `transitionProperty` / `transitionDuration` или `animationName` (keyframes) / `animationDuration` / `animationIterationCount`. Подходит для анимаций «от состояния»: показать / скрыть, переключить таб, пульс. Жесты, скролл, переходы экранов и связанные анимации — по-прежнему worklets и shared values.
- **Reduce Motion:** у всех анимаций по умолчанию `ReduceMotion.System`. При включённой настройке `withTiming` и `withSpring` сразу дают конечное значение, `withDelay` не ждёт.
- Ссылки: [withSpring](https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/) · [CSS-анимации](https://docs.swmansion.com/react-native-reanimated/docs/css-animations/animation-name/) · [CSS transitions](https://docs.swmansion.com/react-native-reanimated/docs/css-transitions/transition-property/) · [когда CSS, когда worklets](https://swmansion.com/blog/reanimated-4-stable-release-the-future-of-react-native-animations-ba68210c3713)

```tsx
// file: AnimationExamples.tsx
import { Pressable } from 'react-native';
import Animated, {
  css,
  Easing,
  interpolateColor,
  SnappySpringConfig,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

// «Тряска» поля суммы при ошибке валидации
export function useShake() {
  const offset = useSharedValue(0);
  const shake = () => {
    offset.value = withSequence(
      withTiming(-8, { duration: 50 }),
      withRepeat(withTiming(8, { duration: 100 }), 4, true),
      withTiming(0, { duration: 50 }),
    );
  };
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));
  return { shake, style };
}

export function cheatSheet(sv: SharedValue<number>, velocityX: number) {
  sv.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
  sv.value = withSpring(0, { stiffness: 900, damping: 120 }); // физика
  sv.value = withSpring(1, { duration: 400, dampingRatio: 0.6 }); // по времени (≈ 600 мс)
  sv.value = withSpring(1, SnappySpringConfig); // пресет 4.x
  sv.value = withDecay({ velocity: velocityX, clamp: [0, 300] });
  sv.value = withRepeat(withTiming(1.1, { duration: 500 }), -1, true); // пульс навсегда
}

export function PnlColor({ pnl }: { pnl: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    color: interpolateColor(pnl.value, [-1, 0, 1], ['#dc2626', '#6b7280', '#16a34a'], 'LAB'),
  }));
  return <Animated.Text style={style}>P&L</Animated.Text>;
}

// CSS-анимация: бейдж LIVE пульсирует
const pulse = css.keyframes({ from: { opacity: 1 }, '50%': { opacity: 0.3 }, to: { opacity: 1 } });

export function LiveDot() {
  return (
    <Animated.View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ef4444',
        animationName: pulse,
        animationDuration: '1.2s',
        animationIterationCount: 'infinite',
        animationTimingFunction: 'ease-in-out',
      }}
    />
  );
}

// CSS transition: стиль зависит от React state, Reanimated анимирует разницу
export function SideTab({ active, onPress }: { active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Animated.View
        style={{
          padding: 12,
          backgroundColor: active ? '#16a34a' : '#e5e7eb',
          transform: [{ scale: active ? 1 : 0.96 }],
          transitionProperty: ['backgroundColor', 'transform'],
          transitionDuration: 200,
        }}
      />
    </Pressable>
  );
}
```

**Практика**

- **2.1. Пульт анимаций** (25 мин). Один квадрат и 6 кнопок: timing, spring по физике, spring по времени, decay с clamp, «тряска», бесконечный пульс с кнопкой «стоп». Готово: каждая анимация — 1–3 строки; ты объясняешь, почему spring по времени длится дольше `duration`.
- **2.2. Выбери пружину** (15 мин). Сравни `GentleSpringConfig`, `SnappySpringConfig` и `WigglySpringConfig`. Выбери для: снапа шторки, «попа» бейджа ачивки, возврата ползунка ордера. Запиши почему. Почему wiggly — плохая идея для кнопки ордера?
- **2.3. CSS против worklets** (20 мин). Бейдж LIVE и переключатель Buy / Sell сделай через CSS-анимацию и transition. Потом тот же пульс — через `withRepeat`. Готово: визуально одинаково; ты называешь 3 случая, где CSS-API не подходит.
- **2.4. Цвет P&L** (15 мин). Цвет текста по P&L от −1 до 1 через `interpolateColor` в `'RGB'` и в `'LAB'`. Посмотри на середину шкалы. Готово: ты объясняешь разницу `CLAMP` и `EXTEND` на примере прозрачности.

**Самопроверка**

1. Когда `withSpring`, когда `withTiming`, когда `withDecay`? По примеру из трейдинга на каждое.
2. Что стало с `duration` у пружины в Reanimated 4?
3. Что произойдёт, если присвоить новое значение посреди анимации?
4. Как дождаться конца анимации и обновить React state?
5. Почему CSS-transition не подходит для перетаскивания шторки?
6. Что сделает `withRepeat(withTiming(1), -1, true)` при включённом Reduce Motion? Проверь на телефоне.

**Готово, когда…** упражнения 2.1–2.4 сделаны, а на вопросы отвечаешь без подсказок.

Дальше: [часть 2 — упражнения 1–2, жесты, layout animations](04-animations-reanimated-skia-part2.md).
