# Contributing

Issues and pull requests are welcome. For a larger change, open an issue first.

## Core modules

The realtime client, the stores and the chart math (`src/realtime`, `src/store`, `src/chart`, `src/binance/schemas.ts`) are plain TypeScript with no React Native imports (ESLint enforces it) and are covered by unit tests. Changes there need tests; pull requests that replace them with a third-party library will likely be declined.

## Run the app

The app runs in a development build (expo-dev-client). Expo Go is not supported.

```sh
bun install --frozen-lockfile
bun run android      # build and install the development build locally (Android SDK and a device or emulator)
bun start            # then, every day: Metro for the installed development build
```

Use Node 24 (see `.nvmrc`) and Bun (version in `package.json`). Use `bun`/`bunx`, never `npm`/`npx`, and do not commit `package-lock.json`.

A new native dependency, a config plugin or an `app.json` change needs a new development build. JS-only changes need only Metro. `ios/` and `android/` are generated and ignored: change `app.json` and plugins, not the native output. Performance measurements need a preview or release build.

## Before you open a PR

```sh
bun run check            # typecheck + lint + tests
bunx expo install --check
bun run doctor
```

Tests use no network. Do not weaken or delete existing tests. Dependency versions are pinned in `package.json`; ask in an issue before adding a dependency.

## Commits and PRs

- One topic per branch and PR; fill in the PR template.
- Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/): `feat: pinch-zoom around the fingers`, `fix: ignore a late close of an old socket`, `test: spec for upsertCandle gap`, `docs: update design doc`.
- Say what an AI tool did and what you checked yourself.
- Update `CHANGELOG.md` under `## [Unreleased]` for user-visible changes.

## Rules for contributions

- No API keys, secrets or credentials. The project uses public Binance market data only.
- No Binance logos or brand assets, no ads, referral links or trading buttons.
