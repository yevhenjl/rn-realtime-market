# rn-realtime-market

**EN** · [RU](README.ru.md)

Learning project from [training 6](../training/06-websocket-demo-binance/06-websocket-demo-binance.md): Expo, public Binance market data and Skia charts. The current scope is the stage 0 scaffold; live quotes and charts are not implemented yet.

## Stack

Expo SDK 58, React Native 0.88, React 19.3, TypeScript 6; development builds and CNG. Styling uses Uniwind 1.13 + Tailwind CSS 4; graphics use react-native-skia 2.15.1, Reanimated 4.7 and Gesture Handler 3.3. Zustand, TanStack Query, Zod, FlashList and NetInfo are installed. Exact versions live in package.json and package-lock.json.

## Install and check

Use Node 24, as specified in .nvmrc.

```sh
nvm use
npm ci
npm run check
npx expo install --check
npm run doctor
```

`npm run check` generates Uniwind types, checks TypeScript and ESLint, then runs Jest. The starter screen test does not call Binance. For coverage: `npm test -- --ci --coverage --runInBand`.

## Development build

The app requires its own development build. EAS profiles are configured; no cloud project has been created and no cloud builds have been started.

```sh
# Locally, with the Android SDK and a device already configured:
npm run android

# Once the development build is installed, run Metro only:
npm start
```

For a cloud build after linking your Expo project yourself: `eas build -p android --profile development`. The `development-simulator` profile targets iOS Simulator, `preview` produces a release APK for measurements, and `production` targets stores.

A new native dependency, plugin or app.json change requires rebuilding the development build. JS changes only need Metro. ios/ and android/ are generated from app.json and excluded from Git. Application ID: io.github.yevhenjl.rnrealtimemarket.

The Mac described in the training cannot build iOS SDK 58 locally; use a compatible Mac or EAS. Running on a device requires a separately installed development build.

## Structure and learning

- src/app — Expo Router and the starter screen.
- src/global.css, src/ui — theme tokens and Uniwind wrappers.
- src/binance, src/realtime, src/store, src/chart — locations for your implementation in later stages.
- src/features — future watchlist and symbol screen; src/dev — future metrics.
- docs/adr and docs/media — future ADRs and demo media.
- AGENTS.md and CLAUDE.md — project rules: you write the core, AI explains and reviews.

Next: [stage 1, system design](../training/06-websocket-demo-binance/06-websocket-demo-binance-part3.md) and four ADRs before implementing the core. Core test specifications remain in the training and are added in their respective stages.

## Git and CI

No separate Git repository or commits have been created. `.github/workflows/ci.yml` is a template for a standalone repository with this project at its root; GitHub does not automatically run a nested workflow inside the current diary. It checks Expo versions, doctor, types, lint, tests, Android prebuild and bundle export. GitHub CI has not been run yet.

The app contains no API keys or connection to the live market. Do not add secrets; environment files, builds, node_modules and generated files are ignored.

## Local validation

Validated TypeScript, ESLint, the starter screen test, Expo dependency compatibility, Expo Doctor (20/20), Android prebuild and Android JS bundle export. Jest uses filesystem crawling without the system Watchman service.

No APK has been built; running on a phone or emulator has not been verified yet.

License: MIT.
