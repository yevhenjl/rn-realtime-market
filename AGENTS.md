# rn-realtime-market — learning project

Expo SDK 58 development-build app: public Binance market data, Skia charts, no API keys.
Scope currently completed: stage 0 scaffold. The market feed and chart are not implemented.

## Stack — pinned, do not upgrade
- Expo 58, React Native 0.88, React 19.3, TypeScript ~6.0.3; never install TypeScript 7.
- react-native-skia 2.15.1; no @shopify/react-native-skia and no Skia 3.
- Reanimated 4.7.1, worklets 0.13, Gesture Handler 3.3.
- Uniwind 1.13, Tailwind CSS 4, Zustand 5, TanStack Query 5, Zod 4, FlashList 2, NetInfo 12.
- Jest 30, jest-expo 58, React Native Testing Library 14 (async render/act).
- Install native packages via `npx expo install`. Ask before adding further dependencies.

## Development builds and CNG
- Use `npm start` with a development build. Never suggest Expo Go or exp:// URLs.
- ios/ and android/ are generated and ignored. Configure app.json and plugins; do not edit native output.
- Native/config changes require a new development build: EAS or prebuild plus `npm run android` / `npm run ios`.
- JS-only changes use Metro. Performance measurements require a preview/release build.

## Styling
- Static styles: Uniwind className and tokens in src/global.css. No hardcoded component colors.
- No NativeWind, StyleSheet.create or inline static style objects.
- Third-party components: withUniwind in src/ui/styled.ts (not FlashList: it loses the item type).
- Libraries requiring style objects: useResolveClassNames. Colors: useThemeColors/useCSSVariable.
- Animations: Reanimated styles/shared values. Never change className on ticks.

## Architecture for subsequent stages
- One WebSocket outside React in src/realtime/RealtimeClient.ts. Validate incoming messages with Zod.
- Stream names use lowercase symbols and camelCase types (btcusdt@miniTicker).
- Quotes: Zustand with transient subscriptions/shared values. Snapshots and klines: TanStack Query.
- src/chart contains pure worklet math; no React, React Native, Skia or Uniwind imports.
- Immutable SkPath: Skia.PathBuilder/usePathValue. No per-frame font/Paint creation.
- Reanimated .get()/.set() and scheduleOnRN. Gesture Handler hook API, not Gesture.Pan().

## Learning rules
- The learner writes src/realtime/**, src/store/**, src/chart/** and src/binance/schemas.ts.
- For those paths: review, explain, ask questions, suggest tests; do not implement solutions.
- Design doc and ADRs are learner exercises. Do not fill them with finished decisions.
- Never weaken/delete tests. No secrets, credentials or Binance logos.
- Run npm run typecheck, npm run lint and npm test before reporting completion.
- No commits, remotes, pushes or cloud builds unless the user explicitly requests them.

## Documentation
- Training: ../training/06-websocket-demo-binance/06-websocket-demo-binance.md
- Stage 0: ../training/06-websocket-demo-binance/06-websocket-demo-binance-part2.md
- Context7: resolve library ID first, then query current docs for library-specific work.
