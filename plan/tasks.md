# Задачи

← [index](index.md) · статусы — в [progress.md](progress.md) · легенда владельцев и режимов — в [index](index.md#легенда).

Волны идут последовательно. Внутри волны задачи с **∥** выполняются параллельно; **→** — только после указанных зависимостей. Ссылки «т6.pN» — `training/06-websocket-demo-binance/06-websocket-demo-binance-partN.md`.

---

## W0 · Закрыть этап 0 (т6.p2)

| ID | Задача | Владелец | Режим | Зависит | Готово, когда |
|---|---|---|---|---|---|
| S0.1 | Dev build на Android: EAS `development` (облако, запущен агентом по команде 2026-11-12) → установка APK на Galaxy M23 | 🤖 сборка · 🧑 установка | ∥ | — | экран тёмный, стили `className`, не Expo Go |
| S0.2 | Проверить зелёный CI на GitHub для `main` | 🧑 | ∥ | — | последний run `CI` зелёный |
| S0.3 | Привести `AGENTS.md` к факту: Skia 3.7.4 вместо курса 2.15.1 — уже так; `expo-updates` — в `app.json` есть `updates.url` и `runtimeVersion` (TD-01) | 🤖 | ∥ | — | `AGENTS.md` не противоречит `app.json` |
| S0.4 | Локально `bun run check`, `bunx expo install --check`, `bun run doctor` — зафиксировать базовую линию | 🤖 | ∥ | — | все зелёные, результат в журнале progress |

## W1 · S1 System design ∥ S2 Binance на практике (т6.p3–p4)

| ID | Задача | Владелец | Режим | Зависит | Готово, когда |
|---|---|---|---|---|---|
| S1.1 | `docs/design.md` по шаблону (14 разделов), опора — `Binance_Live.md` | 🧑 | ∥ | — | 2–4 страницы; walkthrough 5–7 мин |
| S1.2 | ADR 0001–0004 (`docs/adr/`) по шаблону курса; ADR 0003 закрывает Vulkan/Graphite (TD-04) | 🧑 | ∥ | — | 4 ADR: Context/Decision/Consequences/Alternatives |
| S1.3 | Design review: промпт «5 слабых мест, вопросы, без решений» | 🤖 | → | S1.1 | список вопросов в чате, doc не правится агентом |
| S1.4 | Свести расхождения `Binance_Live.md` ↔ тесты курса (heartbeat 5/10 с, backoff base 1 с/500 мс) — подсветить ученику (TD-03) | 🤖 | ∥ | — | таблица расхождений в TD-03 |
| S2.1 | `scripts/peek.mjs`: combined `/stream`, 10 сообщений, ≤ 5 управляющих/с | 🤖 | ∥ | — | `node scripts/peek.mjs btcusdt@miniTicker btcusdt@kline_1m` печатает данные |
| S2.2 | `src/binance/schemas.ts`: MiniTicker, Trade, Kline, Ticker24h, KlineRow | 🧑 | → | S2.3 | тесты S2.4 зелёные |
| S2.3 | `src/binance/fixtures.ts` — реальные сообщения из `peek.mjs`; `src/binance/streams.ts` — хелперы имён (lowercase + camelCase) | 🤖 | → | S2.1 | фикстуры — настоящие, без выдумки |
| S2.4 | `src/binance/schemas.test.ts` — готовые 3 теста из курса, дословно; кладутся в одной ветке со схемами (D-004) | 🤖 | → | S2.3 | файл совпадает с курсом |
| S2.5 | `src/binance/rest.ts`: `BinanceHttpError`, `fetchTickers24h`, `fetchKlines` → `ChartCandle[]`, `fetchServerTime`, `shouldRetry` (4xx кроме 429 — нет; ≤ 3 попытки); 451 — отдельная ошибка без повторов | 🤖 | → | S2.2 | — |
| S2.6 | `src/binance/rest.test.ts` без сети (подмена `fetch`): `type=MINI` + JSON-массив, сопоставление по `symbol`, 400 → `BinanceHttpError`, `shouldRetry`, неверная форма → Zod | 🤖 | → | S2.5 | каждый тест падает при поломке кода |
| S2.7 | `src/config.ts` (`WATCHLIST` 20 пар из `Binance_Live.md`, хосты `*.binance.vision`) + `src/queryClient.ts` (`onlineManager` ← NetInfo, `focusManager` ← AppState) | 🤖 | ∥ | — | только `wss://`/`https://` |

## W2 · S3 RealtimeClient ∥ S5 математика графика (т6.p5–p7)

Два независимых трека ученика; агент параллельно готовит UI-обвязку.

| ID | Задача | Владелец | Режим | Зависит | Готово, когда |
|---|---|---|---|---|---|
| S3.1 | State diagram статусов (mermaid) — в раздел 8 design doc | 🧑 | → | S1.1 | сверено с курсом |
| S3.2 | `src/realtime/backoff.ts` + готовые 3 теста (full jitter) | 🧑 | → | — | 3 теста зелёные |
| S3.3 | `src/test/FakeSocket.ts` + 16 тестов-спецификаций клиента — скопировать из курса | 🧑 | → | S3.2 | все 16 красные до реализации |
| S3.4 | `src/realtime/RealtimeClient.ts`, TODO 1→8 | 🧑 | → | S3.3, S2.2 | 16 тестов зелёные, нет `any`/`@ts-ignore` |
| S3.5 | `scripts/live-check.ts` (готовый из курса), запуск `bunx tsx` — не в CI | 🤖 | → | S3.4 | ожидаемый вывод против Binance |
| S3.6 | Ревью клиента: чек-лист ученика → `rn-reviewer` (при разрешении) → таблица находок | 🤝 | → | S3.4 | 3+ находки с решением |
| S5.1 | `src/chart/` по готовым 16 тестам: `types` → `scale` → `viewport` → `ticks` → `series` → `layout` | 🧑 | ∥ | — | 16 тестов зелёные; `'worklet'` где нужно; нет импортов react/RN/Skia/uniwind |
| S5.2 | ESLint-правило `no-restricted-imports` для `src/chart/**` и чистых модулей (TD-07) | 🤖 | ∥ | — | импорт `react-native` в `src/chart` — ошибка lint |
| S5.3 | `src/ui/getBannerState.ts` + тесты, `src/ui/ConnectionBanner.tsx` (готовое из курса, токены темы) | 🤖 | ∥ | — | 4 состояния, без hex |
| S5.4 | `src/dev/renderStats.tsx` — `<Profiler>`-счётчик (готовый) | 🤖 | ∥ | — | lint без `react-hooks/refs` |

## W3 · S4 жизненный цикл, стор, conflation (т6.p6)

| ID | Задача | Владелец | Режим | Зависит | Готово, когда |
|---|---|---|---|---|---|
| S4.1 | `src/realtime/decideConnection.ts` + тесты | 🧑 | → | S3.4 | таблица решений покрыта |
| S4.2 | `src/realtime/lifecycle.ts` (AppState + NetInfo, cleanup обеих подписок) | 🧑 | → | S4.1 | в фоне сокета нет |
| S4.3 | `src/realtime/client.ts` — синглтон + статус (готовое из курса, но путь ядра) | 🧑 | → | S3.4 | — |
| S4.4 | `src/store/quotesStore.ts`: `bySymbol`, `applySnapshot`, `applyBatch` + тесты | 🧑 | ∥ | S2.2 | тесты зелёные |
| S4.5 | `src/store/conflator.ts` (200 мс, последнее значение по символу) + тесты на fake timers | 🧑 | ∥ | — | ≤ 5 flush/с |
| S4.6 | `src/store/connectionStore.ts` | 🧑 | → | S4.3 | — |
| S4.7 | `src/features/watchlist/useWatchlistStream.ts`: клиент → Zod → conflator → стор | 🧑* | → | S4.4, S4.5 | — |
| S2.8 | `useTickerSnapshot(symbols)` → `applySnapshot` в стор (перенесено из S2: ждёт стор) | 🤝 | → | S2.5, S4.4 | холодный старт: 20 цен за 1–3 с, порядок `WATCHLIST` |
| S4.8 | Подключить баннер и lifecycle в `src/app/_layout.tsx`, `QueryClientProvider` | 🤖 | → | S4.2, S5.3, S2.7 | ручная проверка: авиарежим 20 с, фон 30 с |

## W4 · S6 Watchlist ∥ подготовка S7 (т6.p7)

| ID | Задача | Владелец | Режим | Зависит | Готово, когда |
|---|---|---|---|---|---|
| S6.1 | `src/features/watchlist/format.ts` (`priceDigits` из `src/chart/ticks.ts`, без `-0.00%`) + тесты | 🤖 (делегировано, D-002) | → | S5.1 | — |
| S6.2 | `src/app/index.tsx`: FlashList по `WATCHLIST`, снапшот + стрим; заменить `src/test/home.test.tsx` эквивалентным тестом списка (D-006) | 🤖 | → | S4.7, S2.8 | тест не слабее прежнего |
| S6.3 | Строка: вспышка, цвет изменения, сброс при переиспользовании — только shared values | 🤖 (делегировано, D-002) | → | S6.2 | 0 рендеров строк на тиках |
| S6.4 | `useSparkline` (klines 1h × 24, `staleTime` 5 мин) + Skia-sparkline | 🤝 | ∥ | S2.5 | последняя точка двигается раз в секунду |
| S6.5 | Переключатель темы (dark по умолчанию, light — кнопкой; NFR-16) | 🤖 | ∥ | — | смена темы перекрашивает список и Skia |
| S6.6 | Тест NFR-2 в CI: 0 рендеров строк на серии тиков (`renderStats`) | 🤝 | → | S6.3, S5.4 | тест падает, если строка подписана на стор |
| S6.7 | Замер Profiler → таблица в `NOTES.md` | 🧑 | → | S6.3 | числа записаны |
| S7.0 | Подготовка S7: маршрут `src/app/symbol/[symbol].tsx`, хуки данных (klines 1m × 500, живая свеча, ресинк после разрыва), каркас `CandleChart` — готовые из курса | 🤖 | ∥ | S2.5, S5.1 | экран открывается из строки |

## W5 · S7 Свечной график ∥ подготовка S8–S9 (т6.p8–p9)

| ID | Задача | Владелец | Режим | Зависит | Готово, когда |
|---|---|---|---|---|---|
| S7.1 | Свечи и объём (`PathBuilder`/`usePathValue`, без Paint/шрифтов на кадр) — компонент в `src/features/symbol/`; если нужна чистая функция в `src/chart/` — её пишет ученик | 🤖 (делегировано, D-002) | → | S7.0 | — |
| S7.2 | Сетка, шкала цен, линия последней цены | 🧑 | → | S7.1 | круглые деления, без `…0000001` |
| S7.3 | `src/features/symbol/useChartGestures.ts`: pan + `withDecay`, pinch вокруг пальцев, long-press 250 мс → перекрестие (GH3 hook API); математика `zoomAt`/`viewport` — из `src/chart` ученика | 🤖 (делегировано, D-002) | → | S7.1 | критерии т6.p8 |
| S7.4 | `UNSUBSCRIBE @kline_1m` при уходе; ресинк истории после авиарежима (NFR-5) | 🧑 | → | S7.0 | в логе исходящих есть UNSUBSCRIBE |
| S7.5 | `<Counted id="chart">`: 0 рендеров при жестах | 🤝 | → | S7.3 | Profiler подтверждает |
| S8.0 | `src/dev/metrics.ts` + `metrics.test.ts` + `DevOverlay.tsx` под `EXPO_PUBLIC_DEV_OVERLAY` (готовое) | 🤖 | ∥ | S3.4 | — |
| S8.1 | `coverageThreshold` в jest: `RealtimeClient.ts` ≥ 90% строк, `src/chart` 100% функций (TD-06) | 🤖 | ∥ | S3.4, S5.1 | `bun run test -- --coverage` проходит |
| S9.0 | Черновики: `.github/ISSUE_TEMPLATE/*`, `.github/release.yml`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`, README по шаблону т6.p9 (без чисел) | 🤖 | ∥ | — | факты сверены с репо |
| S9.1 | Убрать мусор шаблона: неиспользуемые картинки, `web.output: server` (TD-02, TD-05) | 🤖 | ∥ | S6.2 | `bun run check` и `expo export` зелёные |

## W6 · S8 Качество → S9 Open source (т6.p9–p10)

| ID | Задача | Владелец | Режим | Зависит | Готово, когда |
|---|---|---|---|---|---|
| S8.2 | `preview`-сборка (EAS — только по команде; иначе локально `--variant release`) | 🧑 | → | S7.* | APK установлен |
| S8.3 | Замеры NFR-1/2/3/10/11 на устройстве → таблица | 🧑 | → | S8.0, S8.2 | таблица заполнена |
| S8.4 | 6 мутаций в ядре → какие тесты упали → `NOTES.md` | 🧑 | ∥ | S7.* | все 6 пойманы |
| S9.2 | README: числа, запись экрана (`docs/media/demo.gif`), дисклеймер в README и в приложении | 🤝 | → | S8.3 | чек-лист «право и этика» пройден |
| S9.3 | Публичный репо, релиз `v0.1.0`, закрепить в профиле | 🧑 | → | S9.2 | только командой пользователя |
| S9.4 | Репетиция: walkthrough 5–7 мин, рассказ 2 мин (т6.p10) | 🧑 | → | S9.2 | без бумажки |

## W7 · ★ треки (т6.p11) — параллельно между собой

Объём ★ выбран агентом, таймфреймы включены по решению пользователя (D-007). Внутри трека — последовательно.

| ID | Трек | Владелец | Режим | Зависит | Готово, когда |
|---|---|---|---|---|---|
| E | Тесты глубже: `jest-websocket-mock` интеграция, компонентный тест строки, покрытие | 🤝 | ∥ | S9.3 | интеграционный тест в CI |
| A | Стакан: snapshot + diff, `lastUpdateId`, ресинк, график глубины; `scripts/live-book.ts` | 🧑 (логика) · 🤖 (экран) | ∥ | S9.3 | подписка только пока открыт экран |
| B | Лента сделок `@aggTrade`, пачка 250 мс, layout animations | 🧑* | → | A (экран символа с вкладками) | — |
| C | «Прогноз цены»: state machine раунда, лидерборд, конфетти; без денег | 🧑* | ∥ | S9.3 | — |
| G1 | Настройки и тема на MMKV (`createMMKV`) с миграцией | 🤖 | ∥ | S6.5 | тема переживает перезапуск |
| G2 | Таймфреймы 1m / 5m / 1h: чистая агрегация свечей в `src/chart/` + тесты | 🧑 | ∥ | S5.1 | агрегация 1m → 5m совпадает с REST `klines 5m` |
| G3 | Переключатель таймфрейма на экране символа: `UNSUBSCRIBE` старого `@kline_<i>` → `SUBSCRIBE` нового, новая загрузка истории, сообщения старой подписки отбрасываются; выбор хранится в MMKV | 🤖 | → | G1, G2, S7.4 | смена 1m → 1h без дыр и «чужих» свечей; в логе один UNSUBSCRIBE + один SUBSCRIBE |
| F | OSS: Dependabot, защита веток, бейджи, social preview | 🤖 | ∥ | S9.3 | действия на GitHub — по команде |
| H | Mock-интервью, в том числе на английском | 🧑 | ∥ | S9.4 | — |
| D | Skia 3 + EAS Update — Skia 3.7.4 уже стоит; остаётся только канал `preview` для EAS Update | 🤖 | ∥ | S8.2 | ➖ частично выполнено (D-001) |
