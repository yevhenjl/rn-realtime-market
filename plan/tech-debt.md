# Tech debt

← [index](index.md) · задачи, которые его гасят, — в [tasks.md](tasks.md)

Приоритет: P1 — мешает следующему этапу или вводит в заблуждение · P2 — гасить до релиза (S9) · P3 — можно жить.

| ID | P | Что | Где | Как гасить | Когда / задача | Статус |
|---|---|---|---|---|---|---|
| TD-01 | P1 | `AGENTS.md`: «expo-updates — no updates config in app.json yet», а в `app.json` есть `updates.url` и `runtimeVersion` | `AGENTS.md`, `app.json` | поправить строку в `AGENTS.md` | W0 · S0.3 | ⬜ |
| TD-02 | P2 | Ассеты шаблона не используются: `react-logo*`, `expo-badge*`, `expo-logo`, `logo-glow`, `tutorial-web`, `tabIcons/*` | `assets/images/` | удалить после того, как экран списка заменит заглушку | W5 · S9.1 | ⬜ |
| TD-03 | P1 | Числа в `Binance_Live.md` расходятся с тестами курса: heartbeat probe 5 с vs 10 с; backoff base 1 с vs 500 мс | `Binance_Live.md`, т6.p5 | агент составляет таблицу расхождений; выбор и правку делает ученик в design doc (D-003) | W1 · S1.4 | ⬜ |
| TD-04 | P2 | ADR 0003 не написан: курс — «без Vulkan», репо — Skia Graphite + Vulkan 1.1, minSdk 26 | `docs/adr/` | ADR пишет ученик | W1 · S1.2 | ⬜ |
| TD-05 | P3 | `web.output: "server"` и `asyncRoutes.web` при web вне scope | `app.json` | оставить, если `expo export` в CI не страдает; иначе упростить | W5 · S9.1 | ⬜ |
| TD-06 | P2 | Нет `coverageThreshold`: критерии этапа 8 (≥ 90% `RealtimeClient`, 100% функций `src/chart`) не проверяются автоматически | `package.json` → `jest` | добавить пороги по путям | W5 · S8.1 | ⬜ |
| TD-07 | P2 | Правило «чистые модули не импортируют react-native/Skia/uniwind» держится только на договорённости | `eslint.config.js` | `no-restricted-imports` для `src/chart/**`, `src/store/**`, `src/binance/**`, чистых файлов `src/realtime/` | W2 · S5.2 | ⬜ |
| TD-08 | P3 | Установлены, но не используются: `expo-widgets` (лишний iOS-target), `expo-secure-store`, `expo-linear-gradient`, `react-native-keyboard-controller` | `package.json`, `app.json` | не трогать до S9 (стек закреплён); на S9 решить: оставить с объяснением в README или удалить + пересобрать dev build | W6 · S9.2 | ⬜ |
| TD-09 | P2 | `src/test/home.test.tsx` проверяет текст заглушки — сломается при замене экрана | `src/test/` | заменить эквивалентным тестом списка, не ослабляя (D-006) | W4 · S6.2 | ⬜ |
| TD-10 | P3 | iOS deployment target явно не задан, NFR-14 требует 16.4+ | `app.json` → `expo-build-properties` | проверить дефолт SDK 58 после prebuild; если ниже — задать `ios.deploymentTarget` | W6 · S8.2 | ⬜ |
| TD-12 | P3 | `Binance_Live.md` откладывает смену интервала, план её включает (D-007) | `Binance_Live.md` → «★-пункты» | ученик обновляет строку «Смена интервала» | W7 · до G3 | ⬜ |
| TD-11 | P3 | `README.md` — заглушка этапа 0 | `README*.md` | шаблон т6.p9 | W5–W6 · S9.0, S9.2 | ⬜ |

## Правила

- Нашёл долг по ходу задачи — запиши строку сразу, не чини молча вне scope.
- Погашено — статус ✅ и ссылка на задачу в журнале [progress.md](progress.md).
