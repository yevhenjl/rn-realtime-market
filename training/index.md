# Тренинги к техническому интервью: React Native в трейдинговой платформе

Обновлено: 2026-10-22 · 6 тренингов · ≈ 96 часов (+ 13 ч ★ в итоговом проекте) · Вакансия: [карточка](../card.ru.md)

Следующий этап в IBIT (если пригласят) — интервью с Senior Frontend-разработчиком на роль React Native-разработчика в трейдинговой платформе. Шесть тренингов по ≈ 16 часов, каждый — для того, кто работал с технологией года два назад и многое забыл. Тренинг 6 — итоговый проект: он собирает тренинги 1–5 в один open-source репозиторий на обычном Expo (development build, без Expo Go) со стилями на Uniwind, который можно показать и защитить на интервью. Заниматься — вместе с AI (Claude Code / Codex), но по правилу «сначала сам, потом сверь с AI». В начале каждого тренинга — план по часам, в конце — промпт для mock-интервью.

## Тренинги

| # | Тема | Что внутри | Частей | Начать |
|---|---|---|---|---|
| 1 | JavaScript и TypeScript | 80 вопросов, 20 задач «что выведет», 35 задач с кодом; ответы и решения проверены запуском (Node 24, `tsc`, Jest) | 6 + 9 с ответами | [вопросы](01-javascript-typescript/01-javascript-typescript.md) · [ответы](01-javascript-typescript-answers/01-javascript-typescript-answers.md) |
| 2 | Архитектура и system design трейдингового приложения | рыночные данные, ордера и идемпотентность, P&L, безопасность, релизы, геймификация, 3 задачи system design | 3 | [часть 1](02-trading-app-architecture/02-trading-app-architecture.md) |
| 3 | AI-инструменты: Claude Code и Codex | спрашивали на скрининге 2026-10-21; CLAUDE.md / AGENTS.md, hooks, subagents, MCP, workflow, ревью AI-кода, ответ на 2 минуты | 4 | [часть 1](03-ai-tools-claude-code-codex/03-ai-tools-claude-code-codex.md) |
| 4 | Анимации: Reanimated и Skia | worklets, жесты, layout animations, Skia; 9 упражнений: вспышка цены, P&L, графики, лидерборд, ачивка, swipe-to-confirm | 5 | [часть 1](04-animations-reanimated-skia/04-animations-reanimated-skia.md) |
| 5 | State management: Zustand и MobX | 10 задач, у каждой решение на Zustand и на MobX рядом, общий тест и сравнение | 7 | [часть 1](05-state-management-zustand-mobx/05-state-management-zustand-mobx.md) |
| 6 | Итоговый проект `rn-realtime-market`: system design, WebSocket, графики на Skia | development build (без Expo Go), стили на Uniwind; design doc и 4 ADR до кода; свой `RealtimeClient` по тестам-спецификации; watchlist без ре-рендеров со sparkline; свечной график на Skia (live, pan, pinch, перекрестие); open source на GitHub; рассказ о дизайне на 5–7 минут; 10 этапов + 8 вех ★ | 11 | [часть 1](06-websocket-demo-binance/06-websocket-demo-binance.md) |

## Перед итоговым проектом: подготовка Mac

Подробно — в [тренинге 6, часть 2](06-websocket-demo-binance/06-websocket-demo-binance-part2.md). Это подготовка вне 16 часов: ≈ 1–2 часа плюс ожидание сборок (оценка).

- iOS на этом Mac не собрать: SDK 58 нужен Xcode 26.4+, а ему — macOS 26.2+ (здесь macOS 13.7.6). Для iPhone-симулятора есть EAS-сборка `development-simulator` (без аккаунта Apple, но запускать её всё равно нужно на свежем Mac); сборка для iPhone — только с платным Apple Developer Program.
- Android: доставить SDK Platform 37 и Build-Tools 37, подключить телефон или эмулятор. Для локальной сборки нужно ≈ 25–30 ГБ свободного места; сейчас свободно ≈ 10 ГБ (временные файлы этой сессии удалены 2026-10-22), ещё ≈ 5 ГБ освободит `npm cache clean --force`.
- Рекомендация для этого Mac — сборки в EAS (eas-cli уже установлен, вход выполнен): Mac держит только Metro.

## План на две недели

Нумерация — как ты просил. Порядок — под интервью. Итоговый проект разбит на две половины: этапы 0–4 (dev build, Uniwind, design doc, realtime и стор) идут сразу после архитектуры. Так пробел по WebSocket закроется раньше, а фраза «сейчас делаю демо» в черновике follow-up станет правдой. Этапы 5–9 (графики на Skia и публикация) — после тренинга 4.

| Неделя | Дни | Тренинг | Часы |
|---|---|---|---|
| 1 | 2026-10-22 – 2026-10-23 | 1. JavaScript и TypeScript | 16 |
| 1 | 2026-10-24 – 2026-10-25 | 2. Архитектура трейдингового приложения | 16 |
| 1 | 2026-10-26 | 6. Итоговый проект, этапы 0–4: dev build и Uniwind, design doc, `RealtimeClient`, жизненный цикл, стор | 9 |
| 1 | 2026-10-27 – 2026-10-28 | 5. Zustand и MobX | 16 |
| 2 | 2026-10-29 – 2026-10-30 | 4. Reanimated и Skia | 16 |
| 2 | 2026-10-31 – 2026-11-01 | 3. Claude Code и Codex | 16 |
| 2 | 2026-11-02 | 6. Итоговый проект, этапы 5–9: математика и графики на Skia, качество, публикация на GitHub | 7 |
| 2 | 2026-11-03 – 2026-11-04 | 6. Вехи ★ по желанию: стакан и график глубины, игра «прогноз цены», Skia 3 и EAS Update и другие | до 13 |

## Если интервью назначат раньше: экспресс-маршрут (≈ 18 часов)

1. Тренинг 6, этапы 0–4: dev build и Uniwind, design doc, свой `RealtimeClient`, жизненный цикл, стор — 9 ч.
2. Тренинг 1, блоки 3 и 6: асинхронность и основа TypeScript — 3,5 ч.
3. Тренинг 2, блоки 3–4: рыночные данные и ордера — 3,5 ч.
4. Тренинг 3, блок 10: ответ про AI на 2 минуты — 1 ч.
5. Тренинг 6, часть 10: рассказ о дизайне проекта и ответы на вопросы — 1 ч.

## Прогресс

- [ ] 1. JavaScript и TypeScript
- [ ] 2. Архитектура трейдингового приложения
- [ ] 3. Claude Code и Codex
- [ ] 4. Reanimated и Skia
- [ ] 5. Zustand и MobX
- [ ] 6. Подготовка Mac: место на диске, Android SDK 37, устройство, EAS
- [ ] 6. Итоговый проект, этапы 0–4
- [ ] 6. Итоговый проект, этапы 5–9 — репозиторий опубликован на GitHub

## Что изменилось к 2026-10: AI может советовать устаревшее

Подробности и источники — в тренингах; здесь — короткий список, чтобы ловить устаревшие подсказки.

| Тема | Сейчас | Где подробно |
|---|---|---|
| Expo и React Native | Expo SDK 58, React Native 0.88; только New Architecture | 2, 6 |
| Создание проекта | `create-expo-app@latest` без `--template default@sdk-58` всё ещё создаёт SDK 57; в шаблоне нет ESLint и Jest | 3, 4, 6 |
| Сборка | итоговый проект — только development build: `expo-dev-client`, CNG (`ios/` и `android/` не коммитим), `npx expo run:*` или EAS Build; Expo Go для SDK 58 в сторах мог ещё не выйти — это важно только для песочниц тренингов 3–5 | 4, 6 |
| Стили | Uniwind 1.13 + Tailwind 4: `className`, тема на CSS-переменных, `withUniwind` для сторонних компонентов, цвета для Skia — через `useCSSVariable`; анимации — только Reanimated, `className` на каждом тике не меняем; AI часто предлагает NativeWind или `StyleSheet` | 6 |
| TypeScript | шаблон фиксирует `~6.0.3`, а `npm i typescript` ставит 7.x — не давай агенту обновлять TypeScript; в TS 6 `types` по умолчанию пустой — для тестов нужен `"types": ["jest"]` | 3, 6 |
| React Compiler | в шаблоне SDK 58 включён; ESLint `react-hooks` 7 ругается на `ref.current` и `Date.now()` во время рендера | 5, 6 |
| Reanimated | 4.x + `react-native-worklets`; `runOnJS` устарел → `scheduleOnRN` | 4, 6 |
| Gesture Handler | версия 3: жесты на хуках (`usePanGesture`); builder `Gesture.Pan()` устарел | 4, 6 |
| Skia | `@shopify/react-native-skia` заморожен на 2.14 (его ставит SDK 58); в итоговом проекте — `react-native-skia` 2.15.1, API тот же; 3.x — Graphite, Android API 26+, Vulkan 1.1 (★ D); пути — через `Skia.PathBuilder` | 4, 6 |
| victory-native | 43.0 (2026-10-20) требует `react-native-skia` ≥ 2.15.1 и < 3 — совместим с выбором тренинга 6; 42.x — на `@shopify/react-native-skia` | 6 |
| MobX | 7.1 (2026-07-30): переименованные API, нет `trace`, `Provider` / `inject` | 5 |
| Zustand | 5.x: селектор, который возвращает новый объект, даёт бесконечный цикл — `useShallow` | 5 |
| Тесты | RNTL 14: `render`, `renderHook`, `act` асинхронные; Jest-пресет RN — в `@react-native/jest-preset` | 1, 5, 6 |
| GitHub Actions | `actions/checkout@v7` (AI часто пишет `@v4`) | 3, 6 |
| Binance | `!ticker@arr` удалён 2026-03-26; есть событие `serverShutdown`; больше 5 сообщений в секунду от клиента — закрытие с кодом 1008 | 6 |
| Claude Code и Codex | режимы и флаги меняются: сверяйся с документацией, а не с памятью модели | 3 |

## Связанные материалы

- Скрининг: [вопросы и ответы](../screening-qa.ru.md) · [разбор](../interviews.ru.md) · [черновик follow-up](../correspondence.ru.md)
- Короткие шпаргалки: [WebSocket](../../../../interview-prep/technical/websockets.ru.md) · [API](../../../../interview-prep/technical/api-layer.ru.md) · [JS / TS](../../../../interview-prep/technical/javascript-typescript.ru.md) · [архитектурное решение (STAR)](../../../../interview-prep/behavioral/architecture-decision.ru.md)
- Компания: [IBIT](../../../../research/companies/ibit.ru.md)
