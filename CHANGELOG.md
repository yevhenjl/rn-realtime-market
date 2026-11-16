# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-11-16

First release. Market data comes from the public Binance API; there are no accounts, orders or API keys.

### Added

- Expo SDK 58 development-build app: Expo Router, Uniwind (Tailwind CSS 4) with a dark/light theme toggle, Reanimated 4, Gesture Handler 3; Android `minSdkVersion` 26, iOS deployment target 16.4.
- EAS profiles (`development`, `development-simulator`, `preview`, `production`), EAS Update (`expo-updates`, `bun run eas:update`) and CI: versions, doctor, types, lint, tests with coverage, Android prebuild and export.
- Binance layer: Zod schemas, stream-name builders, REST client with timeout, retries and a region error (HTTP 451).
- `RealtimeClient`: one WebSocket outside React, reference-counted subscriptions reconciled with the server, batched subscribe within 5 control messages per second, full-jitter backoff, own heartbeat, `serverShutdown` handling; lifecycle hook for AppState and NetInfo.
- Quotes store with a 200 ms conflator; live connection banner.
- Live watchlist of 20 pairs with 24 h sparklines and price flashes; rows update shared values and do not re-render on ticks.
- Symbol screen with a Skia candlestick chart: 500 one-minute candles plus a live candle, volume bars, price axis with round ticks, last-price line, pan with inertia, pinch-zoom around the fingers, long-press crosshair with OHLC. Candles are built in data space once per data change and moved with one matrix per frame; the Android canvas is an opaque `SurfaceView`. The kline stream is unsubscribed on leave and history is refetched after a reconnect.
- Pure chart math (scales, viewport, ticks, candle upsert, candle geometry, transforms) in `src/chart`.
- Dev overlay (development builds, and `preview` builds through `EXPO_PUBLIC_DEV_OVERLAY=1`): messages per second, store flushes per second, tick cost p50/p95, invalid messages, reconnects, gaps, latency p50/p95 with clock sync, FPS.
- Development-only tools: stress mode (trade streams), batching switch, row render counter, chart frame benchmark (`?bench=1`, `scripts/bench-chart.mjs`).
- Disclaimer on the symbol screen: "Market data: Binance public API. Not affiliated with Binance. Not financial advice."
- Coverage thresholds: `RealtimeClient.ts` at least 90% lines, 100% functions per file in `src/chart`.
- README (English and Russian), contributing guide, security policy, issue form, pull request template, release categories, MIT license.

[Unreleased]: https://github.com/yevhenjl/rn-realtime-market/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yevhenjl/rn-realtime-market/releases/tag/v0.1.0
