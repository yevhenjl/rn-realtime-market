# rn-realtime-market — learning project

Expo SDK 58 development-build app: public Binance market data, Skia charts, no API keys.
Scope currently completed: stage 0 (scaffold, AI tooling in .claude/: lint and verify hooks, rn-reviewer subagent, /pr-ready skill; CI green; Android dev build via EAS installed on device). The market feed and chart are not implemented.
Plan, progress, tech debt and decision log: plan/index.md. Decisions are made autonomously and logged in plan/decisions.md.

## Stack — pinned, do not upgrade
- Expo 58, React Native 0.88, React 19.3, TypeScript ~6.0.3; never install TypeScript 7.
- react-native-skia 3.7.4 (Graphite): Android API 26+ (minSdkVersion via expo-build-properties), Vulkan 1.1, iOS 15.1+; no @shopify/react-native-skia.
- Reanimated 4.7.1, worklets 0.13, Gesture Handler 3.3.
- Uniwind 1.13, Tailwind CSS 4, Zustand 5, TanStack Query 5, Zod 4, FlashList 2, NetInfo 12.
- Jest 30, jest-expo 58, React Native Testing Library 14 (async render/act).
- Storage: react-native-mmkv 4.3.2 (`createMMKV`) on react-native-nitro-modules 0.37.1. Both native: changes need a new development build.
- Expo modules in use: expo-build-properties, expo-image, expo-linear-gradient, expo-secure-store, expo-widgets (generates an iOS widget target), expo-updates (app.json: `updates.url` + `runtimeVersion` policy `appVersion`; channel per EAS profile in eas.json), react-native-keyboard-controller. All native: changes need a new development build.
- Testing extras: jest-websocket-mock 2.5.0 (integration tests); tsx 4.23 (`bunx tsx` scripts, live Binance, never in CI).
- Install native packages via `bunx expo install`. Packages Expo doesn't know (react-native-skia, react-native-mmkv, react-native-nitro-modules) need an exact version, e.g. `bunx expo install react-native-skia@3.7.4`. Ask before adding further dependencies.
- Training docs show npm/npx. Use bun/bunx here (`npm i -D x` → `bun add -d x`, `npx` → `bunx`). Never create package-lock.json.

## Development builds and CNG
- Use `bun start` with a development build. Never suggest Expo Go or exp:// URLs.
- ios/ and android/ are generated and ignored. Configure app.json and plugins; do not edit native output.
- Native/config changes require a new development build: `bunx expo prebuild --clean` plus `bun run android` / `bun run ios` (EAS cloud build only on explicit request).
- JS-only changes use Metro. Performance measurements require a preview/release build.

## Styling
- Static styles: Uniwind className and tokens in src/global.css. No hardcoded component colors.
- No NativeWind, StyleSheet.create or inline static style objects.
- Third-party components: withUniwind in src/ui/styled.ts (not FlashList: it loses the item type).
- Libraries requiring style objects: useResolveClassNames. Colors: useThemeColors (src/ui/theme.ts)/useCSSVariable.
- Animations: Reanimated styles/shared values. Never change className on ticks.

## Architecture for subsequent stages
- One WebSocket outside React in src/realtime/RealtimeClient.ts. Validate incoming messages with Zod.
- Stream names use lowercase symbols and camelCase types (btcusdt@miniTicker).
- Quotes: Zustand with transient subscriptions/shared values. Snapshots and klines: TanStack Query.
- src/chart contains pure worklet math; no React, React Native, Skia or Uniwind imports.
- Immutable SkPath: Skia.PathBuilder/usePathValue. No per-frame font/Paint creation.
- React Compiler is on: Reanimated shared values via .get()/.set(), never .value; scheduleOnRN, not runOnJS.
- Gesture Handler 3 hook API (usePanGesture, usePinchGesture, useSimultaneousGestures, useCompetingGestures), not Gesture.Pan().

## Learning rules
- The learner writes src/realtime/**, src/store/**, src/chart/** and src/binance/schemas.ts.
- For those paths: review, explain, ask questions, suggest tests; do not implement solutions.
- Design doc and ADRs are learner exercises. Do not fill them with finished decisions.
- Never weaken/delete tests. No secrets, credentials or Binance logos.
- Run `bun run check` (typecheck + lint + test) before reporting completion. After dependency or app.json changes also run `bunx expo install --check` and `bun run doctor`.
- No commits, remotes, pushes or cloud builds unless the user explicitly requests them.

## Documentation
- Training: training/06-websocket-demo-binance/06-websocket-demo-binance.md
- Stage 0: training/06-websocket-demo-binance/06-websocket-demo-binance-part2.md
- Context7: resolve library ID first, then query current docs for library-specific work.
