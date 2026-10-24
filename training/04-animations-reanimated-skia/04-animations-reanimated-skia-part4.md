# Анимации в React Native: Reanimated 4, Gesture Handler 3 и Skia

Обновлено: 2026-10-21 · Тренинг 4 из 6 · ≈ 16 часов · Вакансия: [карточка](../../card.ru.md)

[Часть 1](04-animations-reanimated-skia.md) · [часть 2](04-animations-reanimated-skia-part2.md) · [часть 3](04-animations-reanimated-skia-part3.md) · Часть 4 из 5 · [часть 5](04-animations-reanimated-skia-part5.md)

Блоки 8–9: геймификация (ачивка, конфетти, кольцо прогресса) и UX ордера (swipe-to-confirm, bottom sheet). План и таблица «как было → как сейчас» — в [части 1](04-animations-reanimated-skia.md).

## Блок 8. Упражнения 6–7: геймификация (1,5 ч)

**Цель:** сделать награды для турниров и челленджей, которые радуют, не тормозят и уважают Reduce Motion. Это ровно то, что IBIT строит в «trading mini-apps», и то, что ты делал в HabitHero (уровни, стрики, награды) — только теперь с анимацией.

**Что повторить**

- **Atlas** рисует много копий спрайтов из одной текстуры за один вызов. `sprites` — какой кусок текстуры брать, `transforms` — RSXform на каждый спрайт: `(scos, ssin, tx, ty)`, где `scos = scale·cos(θ)`, `ssin = scale·sin(θ)`. `useRSXformBuffer(n, (val, i) => { 'worklet'; … })` обновляет буфер на UI-потоке без копий. `useTexture(<элемент />, size)` рисует текстуру вне JS-потока.
- В Skia v3 (Graphite) каждый спрайт атласа рисуется отдельно: сотни частиц — нормально, десятки тысяч — медленнее, чем в v2. `colors` передавай, только когда без них никак.
- **`<Path start end>`** — обрезка пути (0..1): кольцо прогресса без пересчёта дуги на каждый кадр.
- **SVG-вариант:** `Animated.createAnimatedComponent(Circle)` + `useAnimatedProps(() => ({ strokeDashoffset }))`.
- **Хаптики (expo-haptics)** — вызов нативного модуля на JS-потоке, из worklet — через `scheduleOnRN`. `impactAsync(ImpactFeedbackStyle.Light | Medium | Heavy | Soft | Rigid)`, `notificationAsync(NotificationFeedbackType.Success | Warning | Error)`, `selectionAsync()`; на Android есть `performAndroidHapticsAsync`. На iOS Taptic Engine молчит в Low Power Mode, при активной камере и диктовке — хаптик не может быть единственным сигналом.
- **Reduce Motion:** пресеты `entering` по умолчанию уважают системную настройку. Собственные покадровые эффекты (частицы, `useClock`, шейдеры) выключай сам: `useReducedMotion()` возвращает значение на момент запуска приложения; живые изменения — `AccessibilityInfo.addEventListener('reduceMotionChanged', …)`.
- Ссылки: [Atlas](https://wcandillon.github.io/react-native-skia/docs/shapes/atlas/) · [хуки Skia](https://wcandillon.github.io/react-native-skia/docs/animations/hooks/) · [expo-haptics](https://docs.expo.dev/versions/v58.0.0/sdk/haptics/) · [доступность в Reanimated](https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/)

### Упражнение 6. «Achievement unlocked» + конфетти (50 мин)

Задача: при разблокировке ачивки по центру «выпрыгивает» бейдж, из-под него взлетает и осыпается конфетти, телефон даёт success-хаптик. Через 2,5 с всё исчезает.

```tsx
// file: Confetti.tsx
import { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Atlas, Canvas, Group, Rect, rect, useRSXformBuffer, useTexture } from '@shopify/react-native-skia';
import { Easing, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const N = 300; // частиц
const W = 8; // размер спрайта
const H = 14;
const COLORS = ['#facc15', '#22c55e', '#3b82f6', '#ec4899', '#f97316'];

type Particle = { vx: number; vy: number; spin: number };

export function Confetti(props: { width: number; height: number; onDone: () => void }) {
  const { width, height, onDone } = props;
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0); // 0 → 1 за 2,5 с

  // Текстура-атлас: 5 цветных прямоугольников в ряд
  const texture = useTexture(
    <Group>
      {COLORS.map((c, i) => (
        <Rect key={c} x={i * W} y={0} width={W} height={H} color={c} />
      ))}
    </Group>,
    { width: W * COLORS.length, height: H },
  );
  // Каждой частице — свой кусок атласа, то есть свой цвет
  const sprites = useMemo(() => new Array(N).fill(0).map((_, i) => rect((i % COLORS.length) * W, 0, W, H)), []);
  // Случайности — один раз на JS; worklet получит их через замыкание
  const particles = useMemo<Particle[]>(
    () =>
      new Array(N).fill(0).map(() => ({
        vx: (Math.random() - 0.5) * 900,
        vy: -600 - Math.random() * 700,
        spin: (Math.random() - 0.5) * 20,
      })),
    [],
  );

  const transforms = useRSXformBuffer(N, (val, i) => {
    'worklet';
    const p = particles[i];
    const time = t.value * 2.5; // секунды
    // TODO: x = x0 + vx·time; y = y0 + vy·time + g·time²/2; угол = spin·time
    val.set(1, 0, width / 2 + p.vx * 0 * time, height / 3);
  });

  useEffect(() => {
    if (reduceMotion) {
      onDone(); // без анимации — сразу дальше
      return;
    }
    t.value = withTiming(1, { duration: 2500, easing: Easing.linear }, (finished) => {
      if (finished) scheduleOnRN(onDone);
    });
  }, [reduceMotion, onDone, t]);

  if (reduceMotion) return null;
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Atlas image={texture} sprites={sprites} transforms={transforms} />
    </Canvas>
  );
}
```

Шаги: (1) 10 мин — бейдж: `entering={ZoomIn.springify()}`, три пульса свечения (`withRepeat(…, 6, true)`), текст «Achievement unlocked: 7-day streak». (2) 25 мин — физика частиц в `useRSXformBuffer`; ★ затухание к концу. (3) 15 мин — те же 300 частиц как 300 `<Rect>` с derived values: замерь FPS через `<PerformanceMonitor />` и запиши разницу.

Критерии приёмки:

- [ ] 300 частиц — 60 FPS в release-сборке, JS-поток в покое.
- [ ] `onDone` вызывается один раз, после конца анимации.
- [ ] Success-хаптик — один раз, в момент показа бейджа.
- [ ] Reduce Motion: конфетти нет, бейдж появляется без прыжка.
- [ ] Оверлей не перехватывает касания (`pointerEvents="none"`).
- [ ] ★ Если `onDone` — новая функция на каждый рендер, анимация не перезапускается (проверь и почини: `useCallback` у родителя или ref).

Подсказки: `g` ≈ 1500–2500 px/с²; стартовая точка — как в каркасе (центр по X, треть высоты); в worklet — только математика, никаких `Math.random()` на каждый кадр (частицы «дрожат»).

### Упражнение 7. Кольцо прогресса челленджа (40 мин)

Задача: кольцо «7 из 10 сделок» с процентом в центре. Новый прогресс — дуга плавно дорастает; 100% — «поп» и хаптик.

```tsx
// file: ChallengeRing.tsx
import { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import { Canvas, Group, matchFont, Path, Skia, SweepGradient, Text, vec } from '@shopify/react-native-skia';
import Animated, { useAnimatedProps, useDerivedValue, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const SIZE = 160;
const STROKE = 14;
const R = (SIZE - STROKE) / 2;
const font = matchFont({
  fontFamily: Platform.select({ ios: 'Helvetica', default: 'sans-serif' }),
  fontSize: 28,
  fontWeight: 'bold',
});

// Вариант A: Skia — окружность и обрезка через end (0..1)
export function ChallengeRingSkia({ value }: { value: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withSpring(Math.min(Math.max(value, 0), 1), { duration: 900, dampingRatio: 0.9 });
  }, [value, progress]);

  const circle = useMemo(() => Skia.PathBuilder.Make().addCircle(SIZE / 2, SIZE / 2, R).build(), []);
  const label = useDerivedValue(() => `${Math.round(progress.value * 100)}%`);
  const labelX = useDerivedValue(() => {
    // TODO: SIZE / 2 − ширина текста / 2 (font.measureText)
    return SIZE / 2;
  });

  return (
    <Canvas style={{ width: SIZE, height: SIZE }}>
      <Path path={circle} style="stroke" strokeWidth={STROKE} color="#e5e7eb" />
      {/* окружность начинается «на 3 часах»: поворот на −90°, чтобы начать сверху */}
      <Group transform={[{ rotate: -Math.PI / 2 }]} origin={vec(SIZE / 2, SIZE / 2)}>
        <Path path={circle} style="stroke" strokeWidth={STROKE} strokeCap="round" start={0} end={progress}>
          <SweepGradient c={vec(SIZE / 2, SIZE / 2)} colors={['#22c55e', '#a3e635', '#22c55e']} />
        </Path>
      </Group>
      <Text x={labelX} y={SIZE / 2 + 10} text={label} font={font} color="#111827" />
    </Canvas>
  );
}

// Вариант B: react-native-svg — strokeDashoffset через useAnimatedProps
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const LEN = 2 * Math.PI * R;

export function ChallengeRingSvg({ value }: { value: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withSpring(value, { duration: 900, dampingRatio: 0.9 });
  }, [value, progress]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: LEN * (1 - progress.value) }));

  return (
    <Svg width={SIZE} height={SIZE}>
      <AnimatedCircle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={R}
        stroke="#22c55e"
        strokeWidth={STROKE}
        strokeDasharray={`${LEN} ${LEN}`}
        strokeLinecap="round"
        fill="none"
        animatedProps={animatedProps}
        transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
      />
    </Svg>
  );
}
```

Критерии приёмки:

- [ ] Дуга начинается сверху и растёт по часовой стрелке; концы скруглены.
- [ ] Процент ровно по центру для 0%, 7% и 100%.
- [ ] На 100%: один «поп» кольца (`withSequence` по `scale`) и `notificationAsync(Success)` через `scheduleOnRN`.
- [ ] Варианты Skia и SVG выглядят одинаково; ты называешь плюсы и минусы каждого.
- [ ] ★ Градиент вдоль дуги без видимого шва в точке старта.

**Самопроверка**

1. Как работает `end` у `<Path>` и чем он лучше пересчёта дуги на каждый кадр?
2. Где выполняется анимация `strokeDashoffset` в SVG-варианте?
3. Как сделать 20 таких колец в списке челленджей и не убить FPS?
4. Почему хаптик нельзя делать единственным сигналом успеха?

**Готово, когда…** оба демо работают, а на вопросы отвечаешь без подсказок.

## Блок 9. Упражнения 8–9: UX ордера (1,5 ч)

**Цель:** сделать два паттерна, которые трейдинговое приложение использует каждый день: подтверждение ордера свайпом и шторку тикета.

**Что повторить:** блок 4 (pan, `activeOffsetX` / `failOffsetY`), блок 2 (`withSpring` с `velocity`, `overshootClamping`), `clamp` из Reanimated. В fintech защита от двойной отправки ордера важнее красоты анимации ([тренинг 2](../02-trading-app-architecture/02-trading-app-architecture-part2.md), идемпотентность).

### Упражнение 8. Swipe-to-confirm (45 мин)

Задача: кнопка «Свайпни, чтобы купить 0,05 BTC». Ползунок тянется вправо; отпустил дальше 85% пути — ордер отправлен; раньше — пружина назад.

```tsx
// file: SwipeToConfirm.tsx
import { Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { clamp, Extrapolation, interpolate, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

const TRACK_W = 320;
const KNOB = 56;
const MAX_X = TRACK_W - KNOB - 8;
export const THRESHOLD = 0.85; // доля пути, после которой отпускание = подтверждение

type Props = { label: string; disabled?: boolean; onConfirm: () => void };

export function SwipeToConfirm({ label, disabled = false, onConfirm }: Props) {
  const x = useSharedValue(0);
  const armed = useSharedValue(false); // палец за порогом
  const busy = useSharedValue(false); // защита от двойной отправки

  // Функции для JS-потока — в теле компонента
  const hapticArmed = () => Haptics.selectionAsync();
  const confirm = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm();
  };

  const pan = usePanGesture({
    testID: 'swipe-confirm',
    enabled: !disabled,
    activeOffsetX: [-8, 8],
    failOffsetY: [-12, 12],
    onUpdate: (e) => {
      x.value = clamp(e.translationX, 0, MAX_X);
      // TODO 1: пересёк порог → armed = true и один раз scheduleOnRN(hapticArmed);
      //         вернулся назад → armed = false
    },
    onDeactivate: () => {
      // TODO 2: armed и не busy → busy = true, x → MAX_X, scheduleOnRN(confirm)
      //         иначе → x = withSpring(0, { overshootClamping: true })
    },
  });

  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [0, MAX_X * 0.6], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <View
      style={{ width: TRACK_W, height: KNOB + 8, borderRadius: 32, backgroundColor: '#14532d', justifyContent: 'center' }}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityActions={[{ name: 'activate', label }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'activate' && !disabled) confirm(); // скринридер: без свайпа
      }}
    >
      <Animated.View style={[{ alignItems: 'center' }, labelStyle]}>
        <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>{label}</Text>
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View
          testID="knob"
          style={[{ position: 'absolute', left: 4, width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: 'white' }, knobStyle]}
        />
      </GestureDetector>
    </View>
  );
}
```

Критерии приёмки:

- [ ] Ползунок идёт за пальцем без задержки и не выходит за трек.
- [ ] Порог 85%: при пересечении — `selectionAsync` один раз; вернулся и снова пересёк — ещё раз.
- [ ] Отпустил за порогом — ползунок доезжает до конца, success-хаптик, `onConfirm` ровно один раз; повторный свайп во время отправки игнорируется.
- [ ] Отпустил раньше — пружина в 0 без «перелёта» влево.
- [ ] Вертикальный скролл экрана не ломается.
- [ ] VoiceOver / TalkBack: действие `activate` подтверждает без свайпа.
- [ ] ★ Тесты из блока 10 зелёные.
- [ ] ★ Ответ сервера: успех — галочка (`entering={ZoomIn}`), ошибка — «тряска» из блока 2 и сброс в 0.

### Упражнение 9. Bottom sheet со снапами (45 мин)

Задача: шторка тикета ордера с тремя положениями: свёрнута (120 px), половина экрана, почти весь экран. Тянется за «ручку»; отпускание — к ближайшей точке с учётом скорости.

```ts
// file: sheet-math.ts
// translateY снап-пойнтов: больше — ниже. Проекция по скорости: y + velocityY * 0.2
export function pickSnap(y: number, velocityY: number, points: number[]): number {
  'worklet';
  // TODO: ближайшая к проекции точка из points
  return points[0];
}
```

```ts
// file: sheet-math.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { pickSnap } from './sheet-math.ts';

test('pickSnap учитывает скорость', () => {
  const pts = [700, 400, 80]; // translateY при экране 800 px: видно 100, 400 и 720 px
  assert.equal(pickSnap(650, 0, pts), 700);
  assert.equal(pickSnap(500, 0, pts), 400);
  assert.equal(pickSnap(500, 1500, pts), 700); // быстрый свайп вниз
  assert.equal(pickSnap(650, -1500, pts), 400); // быстрый свайп вверх
  assert.equal(pickSnap(300, -2000, pts), 80);
});
```

```tsx
// file: OrderSheet.tsx
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { pickSnap } from './sheet-math';

// snapPoints — видимая высота шторки, px, по возрастанию: [120, 400, 720]
type Props = { snapPoints: number[]; children: ReactNode; onClose: () => void };

export function OrderSheet({ snapPoints, children, onClose }: Props) {
  const { height } = useWindowDimensions();
  const points = snapPoints.map((visible) => height - visible); // в translateY
  const y = useSharedValue(points[0]);
  const startY = useSharedValue(0);

  const pan = usePanGesture({
    onActivate: () => {
      startY.value = y.value; // схватил на лету — без прыжка
    },
    onUpdate: (e) => {
      // TODO: y = startY + translationY; выше верхней точки — «резинка» (ход / 3)
    },
    onDeactivate: (e) => {
      // TODO: y = withSpring(pickSnap(y.value, e.velocityY, points), { velocity: e.velocityY })
      // ★ быстро вниз из нижней точки → scheduleOnRN(onClose)
      void pickSnap;
    },
  });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [points[points.length - 1], points[0]], [0.5, 0], Extrapolation.CLAMP),
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'black' }, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[{ position: 'absolute', left: 0, right: 0, top: 0, height, backgroundColor: 'white', borderRadius: 16 }, sheetStyle]}
      >
        <GestureDetector gesture={pan}>
          <View style={{ height: 28, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#d1d5db' }} />
          </View>
        </GestureDetector>
        {children}
      </Animated.View>
    </View>
  );
}
```

Шаги: (1) 10 мин без AI — `pickSnap`, тест зелёный; (2) 20 мин — жест, пружина, фон; (3) 15 мин — сравнение с готовыми решениями (таблица ниже).

Критерии приёмки:

- [ ] Шторка идёт за пальцем; отпускание — к ближайшей точке с учётом скорости.
- [ ] Схватил шторку посреди анимации — она не прыгает.
- [ ] Выше верхней точки — сопротивление («резинка»), а не свободный ход.
- [ ] Фон темнеет пропорционально высоте; тап по фону закрывает шторку.
- [ ] ★ Скролл списка внутри развёрнутой шторки (`useNativeGesture` и связи `simultaneousWith` / `requireToFail`). Оцени, сколько это стоит, — это главная причина брать библиотеку.
- [ ] ★ Кнопка Back на Android закрывает шторку (`BackHandler`).

Заполни сравнение по фактам на 2026-10-21 и выбери вариант для тикета ордера:

| | Своя | @gorhom/bottom-sheet 5.2.14 | `@expo/ui/community/bottom-sheet` |
|---|---|---|---|
| Как устроена | Reanimated + GH 3 | Reanimated + GH на builder API `Gesture.Pan()` (в GH 3 — deprecated) | нативная шторка: SwiftUI (iOS), Jetpack Compose (Android), `<dialog>` (web) |
| Статус | твой код | патч-релизы до 2026-05-09; с Reanimated ≥ 4.6 — поток warning о deps (issue #2785, открыт 2026-10-19) | в Expo SDK 58 и Expo Go; API совместим с частью gorhom |
| Гибкость | любая | высокая: backdrop, handle, footer, списки внутри | `snapPoints`, `index`, `onChange`, `enablePanDownToClose`; свой backdrop, handle, footer — нет; анимационные пропсы игнорируются |
| Когда брать | учебно; простая шторка | сложная шторка со списками и кастомным UI | модальная шторка «как в системе» |

**Самопроверка**

1. Как защитить ордер от двойной отправки на уровне жеста и на уровне API?
2. Зачем `velocity` в `withSpring` после жеста?
3. Почему `@gorhom/bottom-sheet` работает с GH 3, но связать его жесты с твоими хуками нельзя?
4. Что выберешь для тикета ордера IBIT и почему?

**Готово, когда…** оба демо работают, таблица заполнена, и ты защищаешь выбор шторки за 1 минуту.

Дальше: [часть 5 — производительность, тесты, вопросы интервью и mock-интервью](04-animations-reanimated-skia-part5.md).
