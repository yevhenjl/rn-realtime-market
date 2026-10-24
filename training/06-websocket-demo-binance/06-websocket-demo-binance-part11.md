# Итоговый проект: живой рынок на Expo — system design, WebSocket, графики на Skia

Обновлено: 2026-10-21 · Тренинг 6 из 6 · ≈ 16 часов (+ ★ 13 часов) · Вакансия: [карточка](../../card.ru.md)

[1](06-websocket-demo-binance.md) · [2](06-websocket-demo-binance-part2.md) · [3](06-websocket-demo-binance-part3.md) · [4](06-websocket-demo-binance-part4.md) · [5](06-websocket-demo-binance-part5.md) · [6](06-websocket-demo-binance-part6.md) · [7](06-websocket-demo-binance-part7.md) · [8](06-websocket-demo-binance-part8.md) · [9](06-websocket-demo-binance-part9.md) · [10](06-websocket-demo-binance-part10.md) · Часть 11 из 11

Вехи ★ — после ядра, в любом порядке; каждая — отдельная ветка, PR и строка в `CHANGELOG.md`. Итого ★ — 13 часов; весь трек — 29.

## ★ A. Стакан: snapshot + diff, проверка последовательности, график глубины (3 ч)

**Цель.** Экран стакана BTCUSDT: локальная книга по алгоритму Binance, график глубины на Skia, честное состояние «обновляем» при дыре. Это deep dive, который интервьюер трейдинговой платформы любит больше всего.

**Что нужно знать**

- Алгоритм и sequence-диаграмма — в design doc ([часть 3](06-websocket-demo-binance-part3.md)); `applyDepth` — [тренинг 2, блок 3](../02-trading-app-architecture/02-trading-app-architecture.md). Поток `<symbol>@depth@100ms`, снимок `GET /api/v3/depth?limit=100` (weight 5).
- Книга — в замыкании хука, не в сторе: 10 событий в секунду. На UI — топ 50 уровней не чаще 4 раз в секунду (shared values), график глубины строит путь на UI-потоке.
- Для маленького виджета хватит `@depth20@100ms`: без локальной книги и resync. Полная книга нужна, когда важна вся глубина.

**Шаги** (180 мин): `bookSync.ts` по тестам (60) → хук `useOrderBook` (30) → `DepthChart` (45) → экран `src/app/book/[symbol].tsx` и проверка вживую (30) → ADR 0005 и README (15).

```ts
// src/features/book/bookSync.ts — контракт; тела пишешь сам
export type Level = [price: string, qty: string];
export type DepthEvent = { U: number; u: number; b: Level[]; a: Level[] };
export type DepthSnapshot = { lastUpdateId: number; bids: Level[]; asks: Level[] };
export type Book = { lastUpdateId: number; bids: Map<string, string>; asks: Map<string, string> };
export type SyncState = { phase: 'buffering'; buffer: DepthEvent[] } | { phase: 'live'; book: Book };
export type Step = { state: SyncState; action: 'none' | 'fetchSnapshot' | 'refetchSnapshot' };

export const initialSync = (): SyncState => ({ phase: 'buffering', buffer: [] });
export function applyDepth(book: Book, e: DepthEvent): 'applied' | 'ignored' | 'gap'; // тренинг 2; книгу мутируем осознанно
export function onDepthEvent(state: SyncState, e: DepthEvent): Step; // первое событие в буфере → fetchSnapshot; gap → в буфер и снова
export function onSnapshot(state: SyncState, snap: DepthSnapshot): Step; // снимок старше первого U → refetchSnapshot
export function topLevels(side: Map<string, string>, n: number, order: 'desc' | 'asc'): [number, number][];
export function depthCurve(levels: readonly [number, number][]): [number, number][]; // накопленный объём
```

```ts
// src/features/book/bookSync.test.ts
import { depthCurve, initialSync, onDepthEvent, onSnapshot, topLevels, type DepthEvent } from './bookSync';

const ev = (U: number, u: number, b: DepthEvent['b'] = [], a: DepthEvent['a'] = []): DepthEvent => ({ U, u, b, a });

test('buffering: the first event asks for a snapshot, the next ones just wait', () => {
  let step = onDepthEvent(initialSync(), ev(101, 103));
  expect(step.action).toBe('fetchSnapshot');
  step = onDepthEvent(step.state, ev(104, 106));
  expect(step.action).toBe('none');
  expect(step.state).toMatchObject({ phase: 'buffering', buffer: [{ U: 101 }, { U: 104 }] });
});

test('a snapshot older than the first buffered U is fetched again', () => {
  const { state } = onDepthEvent(initialSync(), ev(101, 103));
  expect(onSnapshot(state, { lastUpdateId: 100, bids: [], asks: [] }).action).toBe('refetchSnapshot');
});

test('sync: events with u <= lastUpdateId are dropped, the rest applied; qty 0 removes a level', () => {
  let step = onDepthEvent(initialSync(), ev(101, 103, [['99.0', '5']]));
  step = onDepthEvent(step.state, ev(104, 106, [['100.0', '0']], [['101.0', '2']]));
  step = onSnapshot(step.state, { lastUpdateId: 104, bids: [['100.0', '1'], ['99.0', '3']], asks: [['101.0', '1']] });
  expect(step.action).toBe('none');
  if (step.state.phase !== 'live') throw new Error('expected live');
  const { book } = step.state;
  expect(book.lastUpdateId).toBe(106);
  expect([...book.bids]).toEqual([['99.0', '3']]); // 100.0 удалён; событие 101–103 уже в снимке
  expect(book.asks.get('101.0')).toBe('2');
});

test('live: a gap in U / u throws the book away and starts over', () => {
  let step = onDepthEvent(initialSync(), ev(101, 103));
  step = onSnapshot(step.state, { lastUpdateId: 103, bids: [], asks: [] });
  step = onDepthEvent(step.state, ev(104, 105)); // норма: U = u + 1
  expect(step.action).toBe('none');
  step = onDepthEvent(step.state, ev(110, 112)); // 106–109 потерялись
  expect(step.action).toBe('fetchSnapshot');
  expect(step.state).toEqual({ phase: 'buffering', buffer: [ev(110, 112)] });
});

test('top levels and the depth curve', () => {
  const side = new Map([['99.5', '1'], ['100', '2'], ['98', '4']]);
  expect(topLevels(side, 2, 'desc')).toEqual([[100, 2], [99.5, 1]]);
  expect(depthCurve([[100, 2], [99.5, 1], [98, 4]])).toEqual([[100, 2], [99.5, 3], [98, 7]]);
});
```

- **Хук `useOrderBook(symbol)`**: в эффекте — `state = initialSync()`; подписка на `depthStream(symbol)` через `realtime`, Zod-схема события; на `fetchSnapshot` — `fetchDepth` с `AbortController`, ошибка сети — повтор через 1 с; дыра в живой книге → `metrics.gaps++` и `phase: 'syncing'` в React state (UI честно показывает «обновляем»); `setInterval` 250 мс пишет `depthCurve(topLevels(…, 50, …))` в shared values `bids` и `asks`, только если были изменения. Cleanup — `abort()`, отписка, `clearInterval`.
- **`DepthChart`** — как `Sparkline`: два `usePathValue` (bids — область цвета `up`, asks — `down` из `useThemeColors()`), размер — `className` (`h-40 w-full`) и `onLayout`. X — цена от худшего bid до худшего ask, Y — накопленный объём; путь — ступеньки от лучшей цены наружу, замкнутые по нижнему краю.
- **Проверка вживую** — `scripts/live-book.ts`: тот же `bookSync` против настоящего Binance, 40 секунд. Инвариант — книга никогда не «пересекается»: лучший bid всегда ниже лучшего ask.
  ```ts
  // ★ npx tsx scripts/live-book.ts — твой bookSync против настоящего Binance, 40 секунд, без приложения
  import { initialSync, onDepthEvent, onSnapshot, topLevels, type DepthEvent, type DepthSnapshot, type SyncState } from '../src/features/book/bookSync';

  const REST = 'https://data-api.binance.vision';
  let state: SyncState = initialSync();
  let applied = 0;
  let resyncs = 0;
  let crossed = 0; // лучший bid ≥ лучшего ask — значит, книга сломана

  async function loadSnapshot(): Promise<void> {
    const snap = (await (await fetch(`${REST}/api/v3/depth?symbol=BTCUSDT&limit=100`)).json()) as DepthSnapshot;
    const step = onSnapshot(state, snap);
    state = step.state;
    console.log('snapshot', snap.lastUpdateId, '→', state.phase, step.action);
    if (step.action !== 'none') void loadSnapshot();
  }

  const ws = new WebSocket('wss://data-stream.binance.vision/ws/btcusdt@depth@100ms');
  ws.onmessage = (m) => {
    const step = onDepthEvent(state, JSON.parse(String(m.data)) as DepthEvent);
    state = step.state;
    if (step.action === 'fetchSnapshot') {
      if (applied > 0) resyncs++;
      void loadSnapshot();
    }
    if (state.phase !== 'live') return;
    applied++;
    const bid = topLevels(state.book.bids, 1, 'desc')[0];
    const ask = topLevels(state.book.asks, 1, 'asc')[0];
    if (bid && ask && bid[0] >= ask[0]) crossed++;
  };

  setTimeout(() => {
    ws.close(1000);
    console.log({ applied, resyncs, crossed }); // ожидание: resyncs 0, crossed 0
  }, 40_000);
  ```
  Эталон 2026-10-21, два прогона по 40 с: ≈ 346 событий, 0 resync, 0 пересечений. Контроль: без проверки дыр и с потерей 20% событий книга пересеклась 94 раза из 161 — инвариант ловит поломку.

**Готово, когда…** 5 тестов зелёные, `live-book.ts` показывает 0 resync и 0 пересечений, экран показывает «обновляем» при искусственной дыре (выброси одно событие в dev-режиме), а подписка на стакан живёт только на его экране.

## ★ B. Лента сделок с layout animations (1 ч)

Поток `<symbol>@aggTrade` (у BTCUSDT ≈ 10 в секунду) → буфер → раз в 250 мс `setTrades((list) => pushTrades(list, batch))` → новые строки въезжают сверху: `entering={FadeInUp.duration(150)}`, `layout={LinearTransition.duration(150)}`, ключ — id сделки ([тренинг 4, блок 5](../04-animations-reanimated-skia/04-animations-reanimated-skia-part2.md)). Цвет — сторона агрессора: `m: true` (покупатель — maker) → продажа; класс `text-up` или `text-down` выбирается один раз, когда строка монтируется, — это не смена `className` на тике. Чистая функция и тест:

```ts
// src/features/tape/tape.ts: новые сверху, не больше max; повтор после reconnect — отбросить
export function pushTrades(list: readonly TapeTrade[], incoming: readonly TapeTrade[], max = 20): TapeTrade[];

test('newest first, capped, duplicates after a reconnect are dropped', () => {
  let list = pushTrades([], [t(1), t(3), t(2)], 3);
  expect(list.map((x) => x.id)).toEqual([3, 2, 1]);
  list = pushTrades(list, [t(3), t(4)], 3); // 3 уже есть
  expect(list.map((x) => x.id)).toEqual([4, 3, 2]);
  expect(pushTrades(list, [])).toBe(list);
});
```

**Готово, когда…** лента плавная при 10 сделках в секунду, а Reduce Motion отключает въезд строк.

## ★ C. Мини-игра «прогноз цены» (3 ч)

Мост к trading mini-apps IBIT и к HabitHero: пользователь жмёт ↑ или ↓ для BTC, через 60 секунд раунд закрывается по живой цене. Верно — +10 очков, серия из 3 — бонус +5. Лидерборд с 5 локальными ботами — упражнение 5, конфетти на серию — упражнение 6 [тренинга 4](../04-animations-reanimated-skia/04-animations-reanimated-skia-part4.md); стрики и ачивки в сторе — [тренинг 5, задача 8](../05-state-management-zustand-mobx/05-state-management-zustand-mobx-part6.md).

- Честность: цена старта и конца — из потока, время — `E` биржи, не часы телефона. Соединение пропало или данные устарели во время раунда → раунд аннулирован; новых раундов при `offline` и «данные устарели» нет.
- Ответственный дизайн ([тренинг 2, блок 9](../02-trading-app-architecture/02-trading-app-architecture-part3.md)): без денег и ставок, без праздничных эффектов на сделки — празднуем серию прогнозов, а не торговлю.

```ts
// src/features/predict/round.ts — контракт
export type Round =
  | { status: 'idle' }
  | { status: 'running'; prediction: 'up' | 'down'; startPrice: number; endsAt: number }
  | { status: 'settled'; prediction: 'up' | 'down'; startPrice: number; endPrice: number; points: number }
  | { status: 'void'; reason: 'offline' | 'stale' };
export function startRound(prediction: 'up' | 'down', price: number, eventTime: number, durationMs = 60_000): Round;
export function onPrice(round: Round, price: number, eventTime: number): Round; // закрыть, когда eventTime ≥ endsAt
export function voidRound(round: Round, reason: 'offline' | 'stale'): Round;
export function scoreRound(prediction: 'up' | 'down', start: number, end: number): number; // 10 или 0; ничья — 0
export function nextStreak(streak: number, points: number, tie: boolean): { streak: number; bonus: number };

// src/features/predict/round.test.ts
test('settles by exchange time: before endsAt nothing happens', () => {
  const r = startRound('up', 100, 1_000);
  expect(onPrice(r, 105, 60_999)).toBe(r);
  expect(onPrice(r, 105, 61_000)).toMatchObject({ status: 'settled', endPrice: 105, points: 10 });
  expect(onPrice(startRound('down', 100, 0), 105, 60_000)).toMatchObject({ points: 0 });
  expect(onPrice(startRound('up', 100, 0), 100, 60_000)).toMatchObject({ points: 0 }); // ничья
});

test('offline or stale data voids a running round; a settled round stays settled', () => {
  const r = startRound('up', 100, 0);
  expect(voidRound(r, 'offline')).toEqual({ status: 'void', reason: 'offline' });
  const settled = onPrice(r, 101, 60_000);
  expect(voidRound(settled, 'stale')).toBe(settled);
});

test('streak: three wins in a row give a bonus; a tie keeps the streak', () => {
  let s = { streak: 0, bonus: 0 };
  s = nextStreak(s.streak, 10, false);
  s = nextStreak(s.streak, 0, true); // ничья
  s = nextStreak(s.streak, 10, false);
  expect(s).toEqual({ streak: 2, bonus: 0 });
  expect(nextStreak(s.streak, 10, false)).toEqual({ streak: 3, bonus: 5 });
  expect(nextStreak(3, 0, false)).toEqual({ streak: 0, bonus: 0 });
});
```

**Готово, когда…** раунд нельзя «выиграть» обрывом сети или переводом часов, тесты покрывают ничью, аннулирование и серию, а Reduce Motion убирает конфетти.

## ★ D. Ветка со Skia 3 (Graphite) и EAS Update (1,5 ч)

- **Skia 3 в ветке `spike/skia-v3`** (60 мин). Пакет тот же — импорты не меняются:
  ```bash
  npx expo install react-native-skia@3.7.2 expo-build-properties
  eas build -p android --profile development   # натив изменился — нужна новая сборка
  ```
  `npx expo install` допишет в `plugins` строку `"expo-build-properties"` — замени её на `["expo-build-properties", { "android": { "minSdkVersion": 26 } }]`: Skia 3 требует API 26+. Проверь: Canvas не пустой на телефоне и на эмуляторе (Graphite нужен Vulkan 1.1; без него `Skia.gpu.isAvailable` — `false`); FPS графика в `preview` против 2.15; скорость конфетти на `Atlas` из ★ C (Graphite рисует спрайты по одному). `onSize` мы не используем, `tsc` с типами 3.7.2 уже зелёный. Вывод — ADR 0006 «Supersedes 0003» или запись в 0003: «остаёмся на 2.15, пока …».
- **EAS Update для preview-сборки** (30 мин). APK у интервьюера получает исправление JS без переустановки:
  ```bash
  npx expo install expo-updates
  eas update:configure                          # runtimeVersion и updates.url в app.json, channel у preview и production
  eas build -p android --profile preview        # expo-updates — нативный модуль: новая сборка
  eas update --channel preview --environment preview --message "fix: chart labels"
  ```
  Обновление скачивается при запуске и применяется при следующем: закрой и открой приложение, иногда дважды. Нативные правки так не доставишь — только новой сборкой.

## ★ E. Тесты глубже: mock-сервер, компонентный тест, Maestro, покрытие (1,5 ч)

- Интеграция с mock-сервером: `npm i -D jest-websocket-mock` (2.5.0, на `mock-socket`; пакеты 2023 года, с Jest 30 работают). Таймеры настоящие, backoff — короткий:
  ```ts
  // src/realtime/RealtimeClient.server.test.ts
  import { WS } from 'jest-websocket-mock';

  import { RealtimeClient } from './RealtimeClient';

  const URL = 'ws://localhost:1234/stream';
  const BTC = 'btcusdt@miniTicker';
  afterEach(() => WS.clean());

  test('subscribe → data → server drops → reconnect → the same subscriptions again', async () => {
    let server = new WS(URL, { jsonProtocol: true });
    const onData = jest.fn();
    const statuses: string[] = [];
    const client = new RealtimeClient({ url: URL, backoff: { baseMs: 20, maxMs: 50 }, onStatus: (s) => statuses.push(s.status) });
    client.subscribe(BTC, onData);
    client.start();
    await server.connected;
    await expect(server).toReceiveMessage({ method: 'SUBSCRIBE', params: [BTC], id: 1 });
    server.send({ stream: BTC, data: { s: 'BTCUSDT', c: '84710.6' } });
    expect(onData).toHaveBeenCalledWith({ s: 'BTCUSDT', c: '84710.6' });
    server.close({ code: 1006, reason: 'gone', wasClean: false }); // сервер упал
    server = new WS(URL, { jsonProtocol: true }); // и поднялся снова
    await server.connected;
    await expect(server).toReceiveMessage({ method: 'SUBSCRIBE', params: [BTC], id: 2 });
    expect(statuses).toEqual(expect.arrayContaining(['connecting', 'open', 'reconnecting']));
    client.stop();
  });
  ```
  Второй тест допиши сам: ушёл последний подписчик → сервер получил `UNSUBSCRIBE`.
- **Компонентный тест строки.** В `package.json` → `jest`: `"resolver": "react-native-reanimated/jest/resolver"`, в `setupFiles` добавь `<rootDir>/node_modules/react-native-gesture-handler/jestSetup.js`, в `setupFilesAfterEnv` — файл с `setUpTests()` из `react-native-reanimated` ([тренинг 4, блок 10](../04-animations-reanimated-skia/04-animations-reanimated-skia-part5.md)). `uniwind` уже заглушен в `jest.setup.js` (этап 0): `className` в Jest — просто проп. Skia здесь не нужна — замокай `Sparkline`; полный рендер Skia в Jest — `react-native-skia/jestEnv.js` и `react-native-skia/jestSetup.js`. Тест готовый:
  ```tsx
  // src/features/watchlist/TickerRow.test.tsx
  import { act, render, screen } from '@testing-library/react-native';
  import { Profiler } from 'react';

  import { useQuotes } from '../../store/quotesStore';
  import { TickerRow } from './TickerRow';

  jest.mock('./Sparkline', () => ({ Sparkline: () => null })); // Skia здесь не проверяем
  jest.mock('./useSparkline', () => ({ useSparkline: () => ({ data: undefined }) })); // без сети и Query

  const t = (eventTime: number, last: string) => ({ symbol: 'BTCUSDT', eventTime, last, open: '100', high: '110', low: '90', quoteVolume: '1' });

  test('a tick reaches the row without a React render', async () => {
    useQuotes.setState(useQuotes.getInitialState(), true);
    useQuotes.getState().applySnapshot([t(1, '100')]);
    const onRender = jest.fn();
    await render(
      <Profiler id="row" onRender={onRender}>
        <TickerRow symbol="BTCUSDT" onPress={() => {}} />
      </Profiler>,
    );
    const renders = onRender.mock.calls.length;
    await act(async () => {
      useQuotes.getState().applyBatch(new Map([['BTCUSDT', { symbol: 'BTCUSDT', eventTime: 2, last: '101' }]]));
    });
    expect(onRender).toHaveBeenCalledTimes(renders); // цена обновилась через shared values, рендера не было
    expect(screen.getByTestId('row-BTCUSDT')).toBeTruthy();
  });
  ```
  Мутация для проверки: подпиши строку на стор хуком (`useQuotes((s) => s.bySymbol[symbol])`) — тест упадёт.
- **Maestro на dev build** — тот же `appId`, что и в релизе. Metro запущен (`npx expo start`), dev build стоит на эмуляторе; `openLink` открывает приложение сразу с Metro и без онбординга меню разработчика:
  ```yaml
  # .maestro/watchlist.yaml — 10.0.2.2: адрес Mac из Android-эмулятора; для телефона — IP Mac в Wi-Fi
  appId: io.github.yevhenjl.rnrealtimemarket
  ---
  - launchApp
  - openLink: exp+rn-realtime-market://?__expo_url=http%3A%2F%2F10.0.2.2%3A8081&__expo_disable_onboarding=1&__expo_disable_fab=1
  - extendedWaitUntil:
      visible:
        id: row-BTCUSDT
      timeout: 20000
  - tapOn:
      id: row-BTCUSDT
  - assertVisible:
      id: symbol-screen
  ```
  Запуск — `maestro test .maestro/watchlist.yaml`. С `preview`-сборкой строка `openLink` не нужна: JS уже внутри APK. Это E2E на живом Binance: для демо годится, для CI нужен записанный фид.
- Порог покрытия в `jest` (`package.json`): `coverageThreshold` для `src/realtime` и `src/chart`.

## ★ F. OSS-полировка (1 ч)

- `.github/dependabot.yml`: обновления `github-actions` и npm раз в месяц, но `expo*`, `react-native*` (в том числе `react-native-skia`: версия закреплена в ADR 0003), `@shopify/*`, `react`, `typescript` — в `ignore`: SDK-версии ведёт `npx expo install --fix`. Обновления Uniwind читай в changelog: в 1.13.0 поменялся порядок конфликтующих классов на native.
- Ruleset для `main`: только PR, обязательный зелёный CI, запрет force push.
- Бейджи CI и лицензии в README; GitHub Discussions — «вопросы по архитектуре».
- Topics (до 20, строчные, через дефис): `react-native`, `expo`, `typescript`, `websocket`, `realtime`, `skia`, `react-native-skia`, `reanimated`, `gesture-handler`, `zustand`, `tanstack-query`, `uniwind`, `tailwindcss`, `candlestick-chart`, `trading`, `fintech`.
- Social preview: PNG 1280 × 640 до 1 МБ — скриншот графика и название, без логотипа Binance.
- ★★ Workflow с `anthropics/claude-code-action@v1` для ревью PR — [тренинг 3, блок 4](../03-ai-tools-claude-code-codex/03-ai-tools-claude-code-codex-part2.md).

## ★ G. Таймфреймы, настройки и тема (1 ч)

Переключатель 1m / 5m / 1h на экране символа: `useKlines(symbol, interval)` и `useKlineStream(symbol, interval)` уже принимают интервал; ключ Query — `['klines', symbol, interval]`. При сильном зуме-out без смены потока — `aggregate(candles, 60_000, 5)`. Выбранный интервал, список символов и тема (`dark` / `light` / `system`: при старте — `Uniwind.setTheme(сохранённая)`) — в MMKV (`createMMKV`) с версией и миграцией, как в [тренинге 5, задача 6](../05-state-management-zustand-mobx/05-state-management-zustand-mobx-part5.md). MMKV 4 — нативный модуль на Nitro: `npx expo install react-native-mmkv react-native-nitro-modules`, потом новая сборка dev build.

## ★ H. Mock-интервью (1 ч)

Промпт — в [части 10](06-websocket-demo-binance-part10.md): один прогон на русском, один на английском. Три слабых места — в `NOTES.md`, к ним — этап, который повторить.

## Как проверен этот тренинг

- **Проект.** Собран заново: `npx create-expo-app@latest --template default@sdk-58` (шаблон 58.0.26: `expo` 58.0.17, RN 0.88.0, React 19.3.0, Reanimated 4.7.1, worklets 0.13.0, Gesture Handler 3.3.0) → `reset-project` → `expo lint` → `npx expo install` из этапа 0: expo-dev-client 58.0.14, react-native-skia 2.15.1, uniwind 1.13.0, tailwindcss 4.3.3, FlashList 2.3.2, NetInfo 12.0.1, Zustand 5.0.15, TanStack Query 5.104.5, Zod 4.6.7; Jest 30.5.2, jest-expo 58.0.12, RNTL 14.1.0, TypeScript 6.0.3.
- **Проверки.** `npm run typecheck` (типы Uniwind, потом `tsc`) — 0 ошибок; ESLint (`eslint-config-expo` 58.0.4, React Compiler) — 0 предупреждений; Jest на эталоне (ядро и ★) — 69 тестов в 19 файлах; с конфигом ★ E и компонентным тестом строки — 70 в 20 (мутация «подписка через хук» роняет этот тест); тесты, извлечённые из текста тренинга, на эталоне — 69 в 20 файлах, все зелёные; покрытие: `RealtimeClient.ts` — 97,9% строк, `src/chart` — 100% функций. `npx expo install --check` и `expo-doctor` 1.21.5 (20 из 20) — без замечаний. Каркасы из тренинга (`src/chart`, строка, sparkline, жесты, пути) компилируются; 16 тестов `src/chart` на каркасах красные, на эталоне — зелёные.
- **Сборка без нативного тулчейна.** `npx expo export` для Android и iOS — успешно; после последних правок Android-бандл собран ещё раз, `EXPO_PUBLIC_DEV_OVERLAY` подставился при сборке. В dev-бандле: Uniwind скомпилировал классы (`bg-up` → `backgroundColor` из `--color-up`, `tabular-nums` → `fontVariant`, токены для dark и light), функции `src/chart` стали worklets, в бандле `react-native-skia`, а не `@shopify/react-native-skia`. `npx expo prebuild --no-install`: Android — compileSdk 37, minSdk 24, targetSdk 36, NDK 27.1.12297006, Gradle 9.4.1; iOS — deployment target 16.4, `UIUserInterfaceStyle` Dark. `expo-build-properties` с `minSdkVersion: 26` (★ D) даёт `android.minSdkVersion=26`. Autolinking (`expo-modules-autolinking react-native-config`) находит `react-native-skia` 2.15.1 для Android и iOS; нативная компиляция не запускалась.
- **Skia 3 без установки.** Код проекта прошёл `tsc` с типами `react-native-skia` 3.7.2 (пакет скачан отдельно, без нативных бинарников) — 0 ошибок.
- **EAS, CI, шаблоны.** `eas.json` разобран парсером `@expo/eas-json` из eas-cli 24.12.0 — 4 профиля валидны; сборки EAS не запускались. Шаги `ci.yml` прогнаны локально, кроме `npm ci`; workflow проверен actionlint 1.7.12; YAML шаблонов — парсером; флоу Maestro — `maestro check-syntax` (Maestro 2.6.0).
- **Мутации.** Новые тесты проверены поломками: дыра в `upsertCandle`, `zoomAt` без `focalX`, `followLiveEdge` без сдвига — каждая роняет свой тест. Тесты клиента — 12 поломками (предыдущая версия тренинга).
- **Живой Binance, 2026-10-21.** `live-check.ts` повторён на новом проекте: `connecting` → `open` → 3 тика → `idle`. Из прошлой проверки: `@kline_1m` — раз в ≈ 2 с (медиана 2002 мс), rollover: событие с `x: true` и через 2 с новая `t`; REST `klines` — 12 полей; частоты и размеры потоков — таблица в части 3; локальная книга — 70 с без дыр, `lastUpdateId` совпал с REST; `live-book.ts` — 4 прогона по 40 с без единого resync, в двух с проверкой инварианта — 0 пересечений; контрольную поломку инвариант ловит.
- **Диаграммы** mermaid отрендерены mermaid-cli 12 (в этой версии не менялись).
- **Не проверено запуском:** dev build на устройстве. Android-сборку здесь не запускали: на диске ≈ 4 ГБ, нет Platform 37 и устройства, а Gradle ставит пакеты вне проекта; iOS на этом Mac невозможен. Поэтому не проверены: жесты, FPS, анимации, вид `className` на экране, смена темы, `Intl` в Hermes, Maestro на устройстве, GitHub Actions на GitHub, EAS Build и EAS Update, Skia 3 на устройстве.

## Источники

Все — проверено 2026-10-21.

- Binance: WebSocket Streams (лимиты, `serverShutdown`, kline, depth, локальная книга) — https://github.com/binance/binance-spot-api-docs/blob/master/web-socket-streams.md
- Binance: REST API (`/klines`, `/depth`, лимиты weight, 429 / 418) — https://github.com/binance/binance-spot-api-docs/blob/master/rest-api.md
- Binance: CHANGELOG (`!ticker@arr` удалён 2026-03-26; `serverShutdown` 2026-05-08 и 2026-06-09) — https://github.com/binance/binance-spot-api-docs/blob/master/CHANGELOG.md
- Binance: market data only URLs — https://github.com/binance/binance-spot-api-docs/blob/master/faqs/market_data_only.md
- Binance: Terms of Use (PDF со страницы https://www.binance.com/en/terms, юрлица ADGM, с 2026-07-21; п. 27, 31.1(d)) — https://bin.bnbstatic.com/static/cms/cg08ou2ak0tn7mcplvfg/file/bf4879710c904b991848972ec4818ba2cf9e4ce314c09adae84fa2750d3477f7.pdf
- Binance: редакция 2021 года, пункт о коммерческом использовании данных (цитата) — https://github.com/Superalgos/Superalgos/issues/1019
- Binance.US: Terms of Use (2026-06-05) — https://www.binance.us/terms-of-use
- Binance: живые проверки — `wss://data-stream.binance.vision`, `https://data-api.binance.vision` (`/klines`, `/depth`, `/ticker/24hr`, `/time`)
- Expo SDK 58: changelog (RN 0.88, Node 22.13+ / 24.3+ / 26+; Expo Go для SDK 58 — «в ближайшие недели»; `create-expo-app --template default@sdk-58` и development build; launch URL `?__expo_url=`; `EXPO_NO_DEV_MENU`) — https://expo.dev/changelog/sdk-58
- Expo: поддерживаемые версии (SDK 58: Android 7+, compileSdk 37, targetSdk 36, iOS 16.4+, Xcode 26.4+) — https://docs.expo.dev/versions/latest/
- Expo: development builds — https://docs.expo.dev/develop/development-builds/create-a-build/ · https://docs.expo.dev/develop/development-builds/use-development-builds/
- Expo: CNG и `prebuild --clean` — https://docs.expo.dev/workflow/continuous-native-generation/ · `app.json` и `app.config.ts` — https://docs.expo.dev/workflow/configuration/ · локальная сборка, `--variant release`, `--configuration Release` — https://docs.expo.dev/guides/local-app-development/
- Expo: `expo-build-properties` (`minSdkVersion`) — https://docs.expo.dev/versions/v58.0.0/sdk/build-properties/ · Skia в SDK 58 (`@shopify/react-native-skia` 2.14.0) — https://docs.expo.dev/versions/v58.0.0/sdk/skia/
- EAS: `eas.json` и профили — https://docs.expo.dev/build/eas-json/ · сборка для симулятора без аккаунта Apple — https://docs.expo.dev/build-reference/simulators/ · бесплатный план (15 + 15 сборок, низкий приоритет, 45 мин) — https://expo.dev/pricing
- EAS Update: `update:configure`, каналы, `--environment` — https://docs.expo.dev/eas-update/getting-started/ · E2E с Maestro в EAS Workflows — https://docs.expo.dev/eas/workflows/examples/e2e-tests/
- Пакеты Expo 58, прочитаны исходники: `create-expo-app` 5.0.0 (`--help`: `--no-agents-md`), `@expo/cli` (debug-сборка под ABI устройства; формат launch URL), `expo-dev-menu` (тест `ExpoLauncherUrlTest.kt`: `__expo_url`, `__expo_disable_onboarding`), `expo-modules-autolinking` (версии Android по умолчанию, `android.minSdkVersion`) — https://registry.npmjs.org
- Expo: ESLint и Jest — https://docs.expo.dev/guides/using-eslint/ · https://docs.expo.dev/develop/unit-testing/ · `expo/fetch` и стриминг — https://docs.expo.dev/versions/v58.0.0/sdk/expo/
- Apple: требования Xcode (26.4+ — macOS Tahoe 26.2+; Xcode 15.2 — macOS 13.5–14.x) — https://developer.apple.com/xcode/system-requirements/
- React Native: окружение (JDK 17) — https://reactnative.dev/docs/set-up-your-environment · AppState — https://reactnative.dev/docs/appstate
- Android: Profile HWUI rendering — https://developer.android.com/studio/profile/dev-options-rendering · сеть эмулятора (`10.0.2.2`) — https://developer.android.com/studio/run/emulator-networking · Doze — https://developer.android.com/training/monitoring-device-state/doze-standby
- Uniwind: установка и Metro — https://docs.uniwind.dev/quickstart · https://docs.uniwind.dev/api/metro-config · темы и CSS-переменные — https://docs.uniwind.dev/theming/basics · https://docs.uniwind.dev/theming/global-css
- Uniwind: API — https://docs.uniwind.dev/api/use-css-variable · https://docs.uniwind.dev/api/use-resolve-class-names · https://docs.uniwind.dev/api/with-uniwind · https://docs.uniwind.dev/api/generate-artifacts · платформенные варианты — https://docs.uniwind.dev/api/platform-select
- Uniwind: классы, порядок классов и inline-стили, Free и Pro, FAQ, миграция с NativeWind — https://docs.uniwind.dev/class-names · https://docs.uniwind.dev/style-specificity · https://docs.uniwind.dev/pro-version · https://docs.uniwind.dev/faq · https://docs.uniwind.dev/migration-from-nativewind · исходники и релизы — https://github.com/uni-stack/uniwind
- NativeWind 4.2.7 (Tailwind CSS 3, Babel-пресет) — https://www.nativewind.dev/docs/getting-started/installation · Unistyles 3 — https://github.com/jpudysz/react-native-unistyles · https://www.unistyl.es/v3/start/getting-started
- Версии пакетов и даты релизов (`react-native-skia` 2.15.x и 3.x, `@shopify/react-native-skia`, `uniwind`, `nativewind`, `react-native-unistyles`, `victory-native` 43.0.1 и его peer-зависимости, `react-native-mmkv`, `expo-template-default`, `eas-cli`) и `bundledNativeModules.json` в `expo@58.0.17` — https://registry.npmjs.org
- React Native Skia: миграция на v3 (API 26, Vulkan 1.1, iOS 15.1, удалённые пропсы `<Canvas>`, `Atlas`) — https://wcandillon.github.io/react-native-skia/docs/getting-started/migration/ · релизы — https://github.com/wcandillon/react-native-skia/releases
- React Native Skia: хуки (`usePathValue`), Picture, Path, текст — https://wcandillon.github.io/react-native-skia/docs/animations/hooks/ · https://wcandillon.github.io/react-native-skia/docs/shapes/pictures/ · https://wcandillon.github.io/react-native-skia/docs/shapes/path/ · https://wcandillon.github.io/react-native-skia/docs/text/text/
- Reanimated: `useDerivedValue`, `useAnimatedProps`, `withDecay`, `useFrameCallback`, производительность, тесты (resolver, `setUpTests`) — https://docs.swmansion.com/react-native-reanimated/docs/core/useDerivedValue/ · https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedProps/ · https://docs.swmansion.com/react-native-reanimated/docs/animations/withDecay/ · https://docs.swmansion.com/react-native-reanimated/docs/advanced/useFrameCallback/ · https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/ · https://docs.swmansion.com/react-native-reanimated/docs/guides/testing/ (`PerformanceMonitor` — по типам пакета 4.7.1)
- Gesture Handler 3: pan, pinch, композиция — https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/use-pan-gesture · https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/use-pinch-gesture · https://docs.swmansion.com/react-native-gesture-handler/docs/composition/use-simultaneous-gestures · https://docs.swmansion.com/react-native-gesture-handler/docs/composition/use-competing-gestures
- Zustand: transient updates — https://github.com/pmndrs/zustand
- TanStack Query и React Native — https://tanstack.com/query/latest/docs/framework/react/react-native · TkDodo, WebSockets и React Query — https://tkdodo.eu/blog/using-web-sockets-with-react-query
- FlashList v2 — https://shopify.github.io/flash-list/docs/v2-changes
- victory-native XL (`Candlestick`, pan / zoom) — https://github.com/FormidableLabs/victory-native-xl
- TradingView Lightweight Charts (Apache-2.0, атрибуция) — https://github.com/tradingview/lightweight-charts
- Apple TN2277 — https://developer.apple.com/library/archive/technotes/tn2277/_index.html
- Автоматический pong в нативном слое: SocketRocket — https://github.com/facebookincubator/SocketRocket/blob/main/SocketRocket/SRWebSocket.m · OkHttp — https://github.com/square/okhttp/blob/master/okhttp/src/commonJvmAndroid/kotlin/okhttp3/internal/ws/RealWebSocket.kt
- NetInfo 12 (iOS 14+) — https://github.com/react-native-netinfo/react-native-netinfo · Hermes и `Intl` — https://github.com/facebook/hermes/blob/static_h/doc/IntlAPIs.md
- TypeScript 6.0 (`types` по умолчанию `[]`) — https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/ · create-expo-app и шаблоны — https://docs.expo.dev/more/create-expo/
- HTTP 451 «restricted location» у Binance (вторичный источник) — https://community.vercel.com/t/binance-api-calls-on-vercel/29895
- Лицензии MIT у react-native, expo, react-native-reanimated, react-native-gesture-handler, react-native-skia, uniwind, zustand, @tanstack/react-query — поле `license` в https://registry.npmjs.org
- RFC 6455 — https://www.rfc-editor.org/rfc/rfc6455 · AWS, Exponential Backoff and Jitter — https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/ · MDN, Server-sent events — https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- ADR: Michael Nygard — https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions · https://adr.github.io/
- GitHub: лицензия, social preview, topics, закрепление — https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository · https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview · https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics · https://docs.github.com/en/account-and-profile/how-tos/profile-customization/pinning-items-to-your-profile
- GitHub: issue forms, шаблон PR, release notes, private vulnerability reporting, push protection, rulesets, Dependabot — https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms · https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository · https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes · https://docs.github.com/en/code-security/security-advisories/working-with-repository-security-advisories/configuring-private-vulnerability-reporting-for-a-repository · https://docs.github.com/en/code-security/secret-scanning/introduction/about-push-protection · https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets · https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file
- GitHub Actions: права токена, concurrency; checkout v7.0.1, setup-node v7.1.0 — https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/controlling-permissions-for-github_token · https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/control-the-concurrency-of-workflows-and-jobs · https://github.com/actions/checkout/releases · https://github.com/actions/setup-node/releases · actionlint — https://github.com/rhysd/actionlint
- Node.js: график релизов (24 — maintenance с 2026-10-20, 26 — LTS с 2026-10-28) — https://raw.githubusercontent.com/nodejs/Release/main/schedule.json
- Лицензии и версии: https://choosealicense.com/ · https://www.conventionalcommits.org/en/v1.0.0/ · https://keepachangelog.com/en/1.1.0/ · https://semver.org/spec/v2.0.0.html
- jest-websocket-mock — https://github.com/romgain/jest-websocket-mock · Maestro и React Native — https://docs.maestro.dev/get-started/supported-platform/react-native
- Связанные материалы: [подготовка по WebSocket](../../../../../interview-prep/technical/websockets.ru.md) · [тренинг 1](../01-javascript-typescript/01-javascript-typescript.md) · [тренинг 2](../02-trading-app-architecture/02-trading-app-architecture.md) · [тренинг 3](../03-ai-tools-claude-code-codex/03-ai-tools-claude-code-codex.md) · [тренинг 4](../04-animations-reanimated-skia/04-animations-reanimated-skia.md) · [тренинг 5](../05-state-management-zustand-mobx/05-state-management-zustand-mobx.md) · [интервью](../../interviews.ru.md)
