# Итоговый проект: живой рынок на Expo — system design, WebSocket, графики на Skia

Обновлено: 2026-10-21 · Тренинг 6 из 6 · ≈ 16 часов (+ ★ 13 часов) · Вакансия: [карточка](../../card.ru.md)

[1](06-websocket-demo-binance.md) · Часть 2 из 11 · [3](06-websocket-demo-binance-part3.md) · [4](06-websocket-demo-binance-part4.md) · [5](06-websocket-demo-binance-part5.md) · [6](06-websocket-demo-binance-part6.md) · [7](06-websocket-demo-binance-part7.md) · [8](06-websocket-demo-binance-part8.md) · [9](06-websocket-demo-binance-part9.md) · [10](06-websocket-demo-binance-part10.md) · [11](06-websocket-demo-binance-part11.md)

Сначала — подготовка этого Mac: она идёт до 16 часов. Потом этап 0: development build вместо Expo Go, Uniwind для стилей, Skia, правила для AI и CI.

## Подготовка Mac: что есть и что поставить (до 16 часов)

Проверено 2026-10-21 командами только для чтения: `xcode-select -p`, `ls /Applications | grep -i xcode`, `xcrun simctl list devices available`, `ls ~/Library/Android/sdk`, `which adb`, `java -version`, `node -v`, `npm -v`, `df -h`, `du -sh`.

| Что | На этом Mac | Нужно для SDK 58 | Итог |
|---|---|---|---|
| macOS, железо | macOS 13.7.6, Intel Core i5-5250U (2 ядра), 8 ГБ RAM | — | локальная сборка будет медленной |
| Диск | свободно ≈ 4 ГБ из 234 ГБ (после очистки временных файлов сессии 2026-10-22 — ≈ 10 ГБ) | для локальной Android-сборки — 25–30 ГБ запаса (оценка) | ⚠️ освободи место |
| Node · npm | 24.10.0 · 11.18.0 | Node 22.13+, 24.3+ или 26+ | ✅ |
| JDK | Zulu 17.0.15, `JAVA_HOME` задан | JDK 17 (рекомендация React Native) | ✅ |
| Android SDK | `ANDROID_HOME` задан; `adb` (platform-tools 35.0.2), emulator 35.5.10, platforms 33 / 35 / 36, Build-Tools до 36.0.0, NDK 27.1.12297006, CMake 3.22.1, образ API 36 x86_64 | compileSdk 37, Build-Tools 37.0.0, NDK 27.1.12297006 | ⚠️ нет Platform 37 и Build-Tools 37.0.0; нет ни одного эмулятора (AVD) |
| Android Studio | 2025.1 | SDK Manager и Device Manager | ✅ |
| Xcode | 15.2 в `/Applications`, но `xcode-select` указывает на Command Line Tools; `simctl` не запускается, рантаймов симулятора нет | Xcode 26.4+, ему нужна macOS Tahoe 26.2+ | ❌ iOS на этом Mac не собрать |
| EAS CLI · Maestro | eas-cli 24.12.0, вход в аккаунт Expo выполнен · Maestro 2.6.0 | eas-cli 24.12+ (свежий — 25.3.0) | ✅ |
| Gradle | `~/.gradle` нет | первая сборка скачает Gradle 9.4.1 и зависимости | ⏱ долгая первая сборка |

Что сделать (время — оценка; это подготовка, она не входит в 16 часов):

1. **Место на диске** (10–30 мин). Цель — ≥ 25 ГБ свободно (`df -h ~`). Крупное здесь: кэш npm `~/.npm` ≈ 6,4 ГБ (`npm cache clean --force` — безопасно, пакеты скачаются снова), `~/Library/Developer/CoreSimulator` ≈ 5,9 ГБ и Xcode 15.2 ≈ 5,5 ГБ — для SDK 58 он не подходит; удаляй, только если он не нужен другим проектам.
2. **Android SDK 37** (5–10 мин). Android Studio → Settings → Languages & Frameworks → Android SDK. Вкладка SDK Platforms — Android SDK Platform 37. Вкладка SDK Tools → Show Package Details — Android SDK Build-Tools 37.0.0.
3. **Устройство** (5–15 мин). Лучше Android-телефон: Developer options → USB debugging, кабель, `adb devices` показывает телефон. Эмулятор: Device Manager → Create Virtual Device → Pixel → образ API 36 (он уже скачан). Эмулятор и Gradle вместе на 2 ядрах и 8 ГБ — тяжело.
4. **Путь сборки** — выбери один:

   | Путь | Когда | Цена |
   |---|---|---|
   | A. EAS Build в облаке — рекомендую для этого Mac | Mac только держит Metro, нативная сборка — в облаке | бесплатный план: до 15 Android- и 15 iOS-сборок, очередь с низким приоритетом, таймаут 45 мин; ждать 20–60 мин (оценка) |
   | B. Локально: `npm run android` | нужен быстрый цикл «поменял натив → пересобрал» | первая сборка на этом CPU — 30–60+ мин и ≈ 25 ГБ диска (оценка); повторные — минуты |

5. **iOS — не на этом Mac.** Simulator — на Mac с macOS 26.2+ и Xcode 26.4+: `npm run ios` или EAS-сборка `development-simulator` (аккаунт Apple для неё не нужен). Сборка для iPhone через EAS — только с платным Apple Developer Program. Проект — Android-first: на интервью покажешь APK, запись экрана и код.

## Этап 0. Старт: dev build, Uniwind, Skia, правила для AI, CI (1,5 ч)

**Цель.** Пустое, но «взрослое» приложение: development build на телефоне или эмуляторе, стили — только Uniwind `className` на токенах тёмной темы, TypeScript strict, ESLint, Jest, правила для AI, зелёный CI на GitHub.

**Что нужно знать**

- **Development build** — твоё приложение с `expo-dev-client`: свой `appId`, свои нативные модули, меню разработчика, подключение к Metro. Expo Go — песочница только со своими нативными модулями. Dev build — тот же нативный код, что уйдёт в релиз.
- **CNG (Continuous Native Generation).** `ios/` и `android/` не коммитим: их генерирует `npx expo prebuild` из `app.json` и config plugins (в шаблоне они уже в `.gitignore`). Нужна нативная настройка — config plugin (например, `expo-build-properties`), а не правка `android/`.
- **Когда пересобирать.** Новый пакет с нативным кодом, правка `app.json` или плагина, смена SDK — новая сборка (локально перед ней — `npx expo prebuild --clean`). Изменения JS — только `npx expo start`, сборка та же.
- **Uniwind** — Tailwind CSS 4 для React Native, бесплатная версия под MIT. Metro-трансформер при сборке бандла превращает `global.css` в таблицу стилей. `className` работает на `View`, `Text`, `Pressable`, `TextInput`, потому что Metro подменяет импорт `react-native` компонентами Uniwind — и внутри Reanimated тоже: `Animated.View` понимает `className`.
- **Цена `className`.** При рендере — поиск стиля по кэшу. Компонент подписан на то, от чего зависят его классы (тема, размер экрана), и перерисуется только при их смене. Новый `className` — это новый рендер, поэтому на тиках `className` не меняем.
- **Чего бесплатный Uniwind не делает.** `className` не анимируется — анимации только Reanimated через `style`. Сторонние компоненты (`GestureHandlerRootView`, Skia `Canvas`) не знают `className` — обёртка `withUniwind`. Цвета для Skia и worklets — CSS-переменные через `useCSSVariable`.
- **Skia** — `react-native-skia` 2.15.1. Почему не 2.14 и не 3.x — ADR 0003 ([часть 4](06-websocket-demo-binance-part4.md)).

**Шаги**

1. **Проект** (15 мин). `create-expo-app` сам делает `git init` и первый коммит. Ошибки читай сам, потом спроси AI.
   ```bash
   npx create-expo-app@latest rn-realtime-market --template default@sdk-58
   cd rn-realtime-market
   npm run reset-project        # ответ n: пример удалится
   npx expo lint                # ставит ESLint и создаёт eslint.config.js
   npx expo install expo-dev-client react-native-skia@2.15.1 uniwind tailwindcss zustand @tanstack/react-query zod @shopify/flash-list @react-native-community/netinfo
   npx expo install jest-expo jest @types/jest @testing-library/react-native --dev
   npm pkg set jest.preset=jest-expo "jest.setupFiles[0]=<rootDir>/jest.setup.js" scripts.test=jest \
     scripts.android="expo run:android" scripts.ios="expo run:ios" \
     "scripts.uniwind:types=uniwind generate-artifacts --css ./src/global.css --dts ./src/uniwind-types.d.ts" \
     scripts.typecheck="npm run -s uniwind:types && tsc --noEmit"
   echo 24 > .nvmrc
   npx expo install --check     # «Dependencies are up to date»
   ```
   `create-expo-app` 5.0.0 кладёт в проект `AGENTS.md` (правила Expo для агентов) и `.claude/settings.json` (плагин Expo для Claude Code); флаг `--no-agents-md` — без них. Skia ставь только с версией: без неё встанет 3.x.
2. **Конфиги** (10 мин).
   - `tsconfig.json` → `compilerOptions`: `"types": ["jest", "expo/types"]` и `"noUncheckedIndexedAccess": true`. `expo/types` объявляет `*.css`: без него TS 6 падает на `import '../global.css'` (TS2882).
   - `eslint.config.js` → `ignores: ['dist/*', '.expo/*', 'android/*', 'ios/*']`. В `.gitignore` — строка `src/uniwind-types.d.ts`: этот файл генерируют Metro и `npm run uniwind:types`.
   - `app.json` — свои ключи, остальное из шаблона не трогай; у `expo-splash-screen` — `"backgroundColor": "#09090b"`:
     ```json
     {
       "expo": {
         "name": "rn-realtime-market",
         "slug": "rn-realtime-market",
         "scheme": "rnrealtimemarket",
         "userInterfaceStyle": "dark",
         "ios": { "bundleIdentifier": "io.github.yevhenjl.rnrealtimemarket" },
         "android": { "package": "io.github.yevhenjl.rnrealtimemarket" }
       }
     }
     ```
     `userInterfaceStyle: "dark"` — тёмная тема с первого кадра: нативные экраны тёмные, Uniwind берёт тему из цветовой схемы приложения. Понадобится логика в конфиге (свой `appId` для dev и preview, переменные окружения) — `app.config.ts`: он получает `app.json` как `config` и меняет его.
   - `jest.setup.js`:
     ```js
     /* global jest */
     // NetInfo — нативный модуль: в Jest подставляем мок из самого пакета
     jest.mock('@react-native-community/netinfo', () => require('@react-native-community/netinfo/jest/netinfo-mock.js'));
     // Uniwind живёт в Metro: в Jest CSS не компилируется, className — просто проп.
     // Хуки и HOC — заглушки: пакет отдаёт Jest исходник ESM, а стили в тестах не проверяем
     jest.mock('uniwind', () => ({
       useCSSVariable: (name) => (Array.isArray(name) ? name.map(() => '#808080') : '#808080'),
       useResolveClassNames: () => ({}),
       useUniwind: () => ({ theme: 'dark', hasAdaptiveThemes: false }),
       withUniwind: (Component) => Component,
       Uniwind: { setTheme: jest.fn(), getCSSVariable: () => '#808080' },
     }));
     ```
3. **Uniwind** (20 мин). Metro, CSS с токенами, хук цветов для Skia, обёртки сторонних компонентов:
   ```js
   // metro.config.js — https://docs.uniwind.dev/quickstart
   const { getDefaultConfig } = require('expo/metro-config');
   const { withUniwindConfig } = require('uniwind/metro');

   const config = getDefaultConfig(__dirname);

   // withUniwindConfig — всегда самая внешняя обёртка
   module.exports = withUniwindConfig(config, {
     cssEntryFile: './src/global.css', // путь относительный: от этой папки Tailwind ищет className
     dtsFile: './src/uniwind-types.d.ts', // типы генерирует Metro или `npm run uniwind:types`
   });
   ```
   ```css
   /* src/global.css */
   @import 'tailwindcss';
   @import 'uniwind';

   /* Токены темы: в className — bg-bg, text-fg, text-up…; в JS и Skia — useCSSVariable('--color-up') */
   @layer theme {
     :root {
       @variant dark {
         --color-bg: #09090b;
         --color-surface: #18181b;
         --color-fg: #fafafa;
         --color-muted: #a1a1aa;
         --color-border: #27272a;
         --color-up: #22c55e;
         --color-down: #ef4444;
         --color-accent: #60a5fa;
       }
       @variant light {
         --color-bg: #ffffff;
         --color-surface: #f4f4f5;
         --color-fg: #18181b;
         --color-muted: #71717a;
         --color-border: #e4e4e7;
         --color-up: #16a34a;
         --color-down: #dc2626;
         --color-accent: #2563eb;
       }
     }
   }
   ```
   ```ts
   // src/ui/theme.ts
   import { useCSSVariable } from 'uniwind';

   const TOKENS = ['--color-bg', '--color-fg', '--color-muted', '--color-border', '--color-up', '--color-down', '--color-accent'];

   export type ThemeColors = { bg: string; fg: string; muted: string; border: string; up: string; down: string; accent: string };

   // Цвета темы для Skia, worklets и навигации: туда className не дотянется.
   // Одна подписка на все токены; компонент перерисуется только при смене темы, не на тиках.
   export function useThemeColors(): ThemeColors {
     const [bg, fg, muted, border, up, down, accent] = useCSSVariable(TOKENS).map((v) => String(v ?? '#808080'));
     return { bg: bg!, fg: fg!, muted: muted!, border: border!, up: up!, down: down!, accent: accent! };
   }
   ```
   ```ts
   // src/ui/styled.ts
   import { GestureHandlerRootView } from 'react-native-gesture-handler';
   import { Canvas } from 'react-native-skia';
   import { withUniwind } from 'uniwind';

   // Сторонние компоненты не знают className: оборачиваем один раз, на уровне модуля
   export const StyledRootView = withUniwind(GestureHandlerRootView);
   export const StyledCanvas = withUniwind(Canvas);
   ```
   ```tsx
   // src/app/_layout.tsx — этап 0; полная версия — этап 4
   import '../global.css'; // Uniwind: Tailwind-классы и токены темы — до первого экрана

   import { Stack } from 'expo-router';
   import { useResolveClassNames } from 'uniwind';

   import { StyledRootView } from '@/ui/styled';
   import { useThemeColors } from '@/ui/theme';

   export default function RootLayout() {
     // Навигация принимает только style-объекты и цвета: берём их из тех же токенов
     const screenBg = useResolveClassNames('bg-bg');
     const { fg } = useThemeColors();
     return (
       <StyledRootView className="flex-1 bg-bg">
         <Stack screenOptions={{ headerStyle: screenBg, headerTintColor: fg, contentStyle: screenBg }} />
       </StyledRootView>
     );
   }
   ```
   Экран-заглушка `src/app/index.tsx`: `<View className="flex-1 items-center justify-center bg-bg">` и `<Text className="text-2xl font-semibold text-fg">`. Правила стилей в проекте:
   - статика — только `className` и токены (`bg-surface`, `text-up`), без hex в компонентах; цвета — не бренда Binance;
   - библиотека требует style-объект (заголовок `Stack`) — `useResolveClassNames`; цвет (Skia, `headerTintColor`) — `useCSSVariable`. `StyleSheet.create` в проекте нет;
   - inline `style` — только анимированный, из `useAnimatedStyle`; `className` на тиках не переключаем;
   - `withUniwind(FlashList)` теряет тип `item` (`unknown`): FlashList не оборачиваем, фон — у родительского `View`, отступ снизу — `ListFooterComponent`;
   - разница платформ в стилях — варианты `ios:`, `android:`, `native:` прямо в `className` (например, `pb-8 ios:pb-10`), а не `Platform.select` (он остаётся для не-стилей, например шрифта Skia);
   - тема — `Uniwind.setTheme('light' | 'dark' | 'system')`; после правки токенов — `npx expo start --clear`.
4. **Dev build** (20 мин работы; облачная сборка идёт фоном — тем временем делай шаги 5–6). Профили EAS — `eas.json`:
   ```json
   {
     "cli": { "version": ">= 24.12.0", "appVersionSource": "remote" },
     "build": {
       "development": { "developmentClient": true, "distribution": "internal", "android": { "buildType": "apk" } },
       "development-simulator": { "extends": "development", "ios": { "simulator": true } },
       "preview": { "distribution": "internal", "android": { "buildType": "apk" }, "env": { "EXPO_PUBLIC_DEV_OVERLAY": "1" } },
       "production": { "autoIncrement": true }
     }
   }
   ```

   | Профиль | Что это | Зачем |
   |---|---|---|
   | `development` | APK с `expo-dev-client`, ставится напрямую | каждый день: телефон или эмулятор + Metro |
   | `development-simulator` | `.app` для iOS Simulator | Mac с Xcode 26.4+; аккаунт Apple не нужен |
   | `preview` | release-APK без меню разработчика | честный FPS (этап 8) и демо для интервьюера; dev-оверлей включён флагом |
   | `production` | сборка для стора | сейчас не нужна |

   ```bash
   npx expo prebuild --clean --no-install       # проверка: config plugins отрабатывают; ios/ и android/ — в .gitignore
   # Путь A — облако:
   eas build -p android --profile development   # в первый раз CLI предложит создать проект на expo.dev — решаешь сам
   #   готово → APK на телефон по ссылке или QR, на эмулятор — ответ Y в CLI
   # Путь B — локально (телефон по USB или запущенный эмулятор):
   npm run android                              # expo run:android: prebuild → Gradle → установка → Metro
   # Каждый день — только JS:
   npx expo start                               # в dev build выбери найденный Metro (та же Wi-Fi-сеть) или отсканируй QR
   ```
   В debug Expo CLI собирает натив только под ABI подключённого устройства — первая сборка быстрее. Эмулятор видит Mac по адресу `10.0.2.2`.
5. **Правила для AI** (10 мин). Шаблон уже положил `AGENTS.md` с правилами Expo — оставь их внизу. Сверху — правила проекта: сначала напиши сам, потом сравни с образцом:
   ```markdown
   # rn-realtime-market — learning project (public repo)
   Expo SDK 58 app in a development build: realtime market data from the Binance public WebSocket (no API key), Skia charts.

   ## Stack (pinned — do not upgrade)
   - Expo SDK 58, React Native 0.88, React 19.3, TypeScript ~6.0.3 (never install typescript@latest = 7.x)
   - react-native-skia 2.15.1 (NOT @shopify/react-native-skia, NOT 3.x), Reanimated 4.7 + worklets 0.13, Gesture Handler 3.3
   - Uniwind 1.13 + Tailwind CSS 4, Zustand 5, TanStack Query 5, Zod 4, FlashList 2, NetInfo 12, Jest 30 + jest-expo 58
   - Native packages only via `npx expo install`. Checks: `npm run typecheck`, `npx expo lint --max-warnings 0`, `npm test`

   ## Builds: development builds only
   - Never suggest Expo Go, `exp://` links or "scan the QR code in Expo Go". The app runs in a development build.
   - ios/ and android/ are generated (CNG, in .gitignore): never edit them. Change app.json or a config plugin.
   - New native package, app.json or plugin change → tell me to rebuild: `npx expo prebuild --clean` + `npm run android`,
     or `eas build -p android --profile development`. JS-only change → `npx expo start`.
   - FPS numbers only from a release build: `eas build -p android --profile preview`.

   ## Styling: Uniwind
   - Styles only via Uniwind `className` with tokens from src/global.css (bg-bg, text-fg, text-up…). No hex colors in components.
   - Do not suggest NativeWind, StyleSheet.create or inline style objects (the only `style` is an animated one from Reanimated).
   - Third-party components: withUniwind (src/ui/styled.ts).
   - A library needs a style object → useResolveClassNames; a color (Skia, navigation) → useThemeColors (useCSSVariable).
   - Animated styles only via Reanimated (useAnimatedStyle / useAnimatedProps). Never switch className on every tick.

   ## Architecture
   - One WebSocket: src/realtime/RealtimeClient.ts, outside React. Screens only subscribe to streams.
   - Stream name = lowercase symbol + camelCase type (btcusdt@miniTicker). Validate every message with Zod.
   - Quotes in Zustand; rows do not re-render on ticks (store.subscribe → shared values). Snapshots, klines: TanStack Query.
   - src/chart: pure math, no React / RN / Skia / uniwind imports, functions marked 'worklet'. Drawing lives in src/features.
   - Skia: SkPath is immutable — Skia.PathBuilder or usePathValue. No Paint or font creation in render or per frame.
   - Reanimated: .get() / .set(), scheduleOnRN. Gestures: usePanGesture and friends, never Gesture.Pan().

   ## Learning rules
   - I write src/realtime/**, src/store/**, src/chart/** and src/binance/schemas.ts myself. Do not write them:
     review, explain, ask questions, suggest test cases.
   - Never weaken or delete tests. Ask before adding a dependency. Public repo: no secrets, no Binance logos.
   ```
   В `CLAUDE.md` — строка `@AGENTS.md` и раздел `## Claude Code`: «Plan mode for changes in more than 2 files. For src/realtime/**, src/chart/** — review only. After a native change — remind me to rebuild the development build. Before a PR: the rn-reviewer subagent».
6. **GitHub и CI** (15 мин). Репозиторий создаёшь сам — пока приватный, публичным он станет на этапе 9: `gh repo create rn-realtime-market --private --source . --push`. `LICENSE` — шаблон MIT в веб-интерфейсе GitHub (Add file → `LICENSE` → Choose a license template). CI — `.github/workflows/ci.yml`; нативной сборки в нём нет, Android SDK и Xcode на раннере не нужны:
   ```yaml
   name: CI
   on:
     push:
       branches: [main]
     pull_request:
   permissions:
     contents: read # токену CI не нужно писать в репозиторий
   concurrency:
     group: ci-${{ github.ref }}
     cancel-in-progress: true # новый push отменяет старый прогон
   jobs:
     checks:
       runs-on: ubuntu-latest
       timeout-minutes: 20
       steps:
         - uses: actions/checkout@v7
         - uses: actions/setup-node@v7
           with:
             node-version-file: .nvmrc
             cache: npm
         - run: npm ci
         - run: npx expo install --check # версии совпадают с Expo SDK 58
         - run: npx expo-doctor # конфиг Expo и зависимости
         - run: npm run typecheck # сначала типы Uniwind (без Metro), потом tsc
         - run: npx expo lint --max-warnings 0
         - run: npm test -- --ci --coverage # без сети: раннеры в США, Binance там отвечает 451
         - run: npx expo prebuild --no-install --platform android # config plugins отрабатывают; android/ в .gitignore
         - run: npx expo export --platform android --output-dir dist # JS-бандл собирается: Metro, Uniwind, worklets
   ```
   Smoke-тест `src/smoke.test.ts` (`test('jest works', () => expect(1 + 1).toBe(2))`), ветка `chore/setup`, PR, зелёный CI, merge.

**Критерии приёмки**

- [ ] Dev build (не Expo Go) открывается на Android-телефоне или эмуляторе и подключается к `npx expo start`; экран тёмный, стили — `className`.
- [ ] `npm run typecheck`, `npx expo lint --max-warnings 0`, `npm test`, `npx expo install --check`, `npx expo-doctor` — зелёные.
- [ ] В `package.json` — `react-native-skia` 2.15.1 и нет `@shopify/react-native-skia`; `ios/` и `android/` не попали в git.
- [ ] `AGENTS.md`: стек, dev build, Uniwind, архитектура, «ядро пишу сам»; `CLAUDE.md` импортирует `AGENTS.md`.
- [ ] Первый PR смёржен на зелёном CI; в корне `LICENSE` (MIT).

**Самопроверка**

- Чем development build отличается от Expo Go? Когда нужна новая сборка, а когда хватит `npx expo start`?
- Почему `ios/` и `android/` не в git и что делать, если нужна нативная настройка?
- Как цвет из `global.css` попадает в `className`, в Skia и в worklet?
- Почему нативные пакеты — через `npx expo install`, а Skia — с явной версией?

**Готово, когда…** dev build на телефоне показывает тёмный экран, а CI на GitHub зелёный.

[Дальше: часть 3 — system design до кода →](06-websocket-demo-binance-part3.md)
