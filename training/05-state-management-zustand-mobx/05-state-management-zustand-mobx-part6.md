# Управление состоянием: одна задача — два решения (Zustand и MobX)

Обновлено: 2026-10-21 · Тренинг 5 из 6 · ≈ 16 часов · Вакансия: [карточка](../../card.ru.md)

[1](05-state-management-zustand-mobx.md) · [2](05-state-management-zustand-mobx-part2.md) · [3](05-state-management-zustand-mobx-part3.md) · [4](05-state-management-zustand-mobx-part4.md) · [5](05-state-management-zustand-mobx-part5.md) · Часть 6 из 7 · [7](05-state-management-zustand-mobx-part7.md)

## Задача 8. Геймификация: челленджи, стрики, ачивки (1,5 ч)

**Цель.** Связать actions, производное состояние и побочные эффекты («ачивка открыта» → тост, аналитика, haptics) и не смешать их.

**Что повторить**

- Правила — чистые функции (`applyTrade`, `newlyUnlocked`): их легко тестировать и перенести на сервер. В продукте стрики и награды считает сервер — он источник истины (часовые пояса, античит), клиент показывает оптимистичный прогресс. Геймификацию ты делал в HabitHero (лиги, очки, уровни, стрики, награды, челленджи — мобильная часть и бэкенд): вспомни, как там было разделено.
- Даты: день — строка `YYYY-MM-DD` в часовом поясе пользователя; разницу дней считай через UTC, иначе переход на летнее время сломает стрик.
- Состояние меняет action; reaction или подписка — только для эффектов. Принцип MobX: «reactions shouldn't update other observables» ([reactions](https://mobx.js.org/reactions.html)).
- Zustand: `subscribeWithSelector` — подписка на кусок стора с `(next, prev)` вне React ([subscribeWithSelector](https://zustand.docs.pmnd.rs/reference/middlewares/subscribe-with-selector)). MobX: `reaction(data, effect)` тоже даёт `(next, prev)`; disposer сохраняй всегда.

**Условие.** `recordTrade(day)`: +1 сделка и обновление стрика (тот же день — без изменений, следующий — +1, пропуск — снова 1, опоздавшее событие стрик не трогает). Ачивки `first-trade`, `five-trades`, `streak-3`; открытая остаётся навсегда, событие «открыта» — ровно один раз. Прогресс челленджей — производное.

**Попробуй сам** (35 мин, без AI)

*Критерии:* 1) 2026-10-30 → 2026-10-31 → 2026-11-01: стрик 3 (через границу месяца); 2) после 2026-10-25 (пропуск) стрик 1, а `streak-3` остаётся; 3) события `['first-trade', 'streak-3']` — без повторов; 4) две сделки в два дня подряд → прогресс `[0.4, 2/3]`.

> ⛔ **Не подсматривай, пока не попробуешь.** Ниже — решения.

### Общие правила

```ts
// src/game/rules.ts — чистые правила: их же можно перенести на сервер (он — источник истины)
export type Stats = { trades: number; streak: number; lastTradeDay: string | null }; // день — 'YYYY-MM-DD' в зоне пользователя
export type AchievementId = 'first-trade' | 'five-trades' | 'streak-3';

export const ACHIEVEMENTS: Record<AchievementId, (s: Stats) => boolean> = {
  'first-trade': (s) => s.trades >= 1,
  'five-trades': (s) => s.trades >= 5,
  'streak-3': (s) => s.streak >= 3,
};

export const CHALLENGES = [
  { id: 'weekly-trades', title: '5 сделок', target: 5, metric: (s: Stats) => s.trades },
  { id: 'streak', title: '3 дня подряд', target: 3, metric: (s: Stats) => s.streak },
] as const;

const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`) / 86_400_000;

export function applyTrade(s: Stats, day: string): Stats {
  if (s.lastTradeDay !== null && day < s.lastTradeDay) return { ...s, trades: s.trades + 1 }; // опоздавшее событие
  const streak =
    s.lastTradeDay === day ? s.streak
    : s.lastTradeDay !== null && dayNumber(day) - dayNumber(s.lastTradeDay) === 1 ? s.streak + 1
    : 1;
  return { trades: s.trades + 1, streak, lastTradeDay: day };
}

export const newlyUnlocked = (s: Stats, unlocked: readonly AchievementId[]) =>
  (Object.keys(ACHIEVEMENTS) as AchievementId[]).filter((id) => !unlocked.includes(id) && ACHIEVEMENTS[id](s));

export const progressOf = (s: Stats, metric: (s: Stats) => number, target: number) => Math.min(1, metric(s) / target);
```

### Решение на Zustand

```ts
// src/game/game.zustand.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { type AchievementId, applyTrade, CHALLENGES, newlyUnlocked, progressOf, type Stats } from './rules';

type GameState = {
  stats: Stats;
  unlocked: AchievementId[]; // открытая ачивка остаётся, даже если streak потом сбросился
  recordTrade: (day: string) => void;
};

export const useGame = create<GameState>()(
  subscribeWithSelector((set) => ({
    stats: { trades: 0, streak: 0, lastTradeDay: null },
    unlocked: [],
    recordTrade: (day) =>
      set((s) => {
        const stats = applyTrade(s.stats, day);
        const fresh = newlyUnlocked(stats, s.unlocked);
        return { stats, unlocked: fresh.length > 0 ? [...s.unlocked, ...fresh] : s.unlocked };
      }),
  })),
);

// Производное: прогресс челленджа — примитив, строка перерисуется только при его изменении
export const useChallengeProgress = (index: number) =>
  useGame((s) => {
    const c = CHALLENGES[index];
    return c ? progressOf(s.stats, c.metric, c.target) : 0;
  });

// Побочный эффект вне стора: тост / аналитика / haptics при открытии ачивки
export const onAchievementUnlocked = (cb: (id: AchievementId) => void) =>
  useGame.subscribe(
    (s) => s.unlocked,
    (next, prev) => next.filter((id) => !prev.includes(id)).forEach(cb),
  );
```

### Вариант на Zustand: тот же стор на slices

Так растят большой стор: каждый slice — свой `StateCreator`, а middleware итогового стора указаны в типе каждого slice. Цена: `recordTrade` делает два `set` — подписчики получают два уведомления. Если это важно, объединяй изменения в один `set`, как в версии выше.

```ts
// src/game/game.slices.ts — тот же стор, разбитый на slices: так растят большой Zustand-стор
import { create, type StateCreator } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { type AchievementId, applyTrade, newlyUnlocked, type Stats } from './rules';

type StatsSlice = { stats: Stats; recordTrade: (day: string) => void };
type AchievementsSlice = { unlocked: AchievementId[]; unlock: (stats: Stats) => void };
type GameStore = StatsSlice & AchievementsSlice;
type Mutators = [['zustand/subscribeWithSelector', never]]; // middleware итогового стора — в типе каждого slice

const createStatsSlice: StateCreator<GameStore, Mutators, [], StatsSlice> = (set, get) => ({
  stats: { trades: 0, streak: 0, lastTradeDay: null },
  recordTrade: (day) => {
    set((s) => ({ stats: applyTrade(s.stats, day) }));
    get().unlock(get().stats); // slice вызывает действие другого slice через get()
  },
});

const createAchievementsSlice: StateCreator<GameStore, Mutators, [], AchievementsSlice> = (set) => ({
  unlocked: [],
  unlock: (stats) =>
    set((s) => {
      const fresh = newlyUnlocked(stats, s.unlocked);
      return fresh.length > 0 ? { unlocked: [...s.unlocked, ...fresh] } : s;
    }),
});

// middleware — только на итоговом сторе, не внутри slices
export const useGameSlices = create<GameStore>()(
  subscribeWithSelector((...a) => ({ ...createStatsSlice(...a), ...createAchievementsSlice(...a) })),
);

export const onSlicesUnlocked = (cb: (id: AchievementId) => void) =>
  useGameSlices.subscribe(
    (s) => s.unlocked,
    (next, prev) => next.filter((id) => !prev.includes(id)).forEach(cb),
  );
```

### Решение на MobX

```ts
// src/game/game.mobx.ts
import { makeAutoObservable, reaction } from 'mobx';
import { type AchievementId, applyTrade, CHALLENGES, newlyUnlocked, progressOf, type Stats } from './rules';

export class GameStore {
  stats: Stats = { trades: 0, streak: 0, lastTradeDay: null };
  unlocked: AchievementId[] = [];

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  // computed: пересчитывается только когда меняется stats
  get challenges() {
    return CHALLENGES.map((c) => ({ id: c.id, title: c.title, progress: progressOf(this.stats, c.metric, c.target) }));
  }

  recordTrade(day: string) {
    this.stats = applyTrade(this.stats, day);
    this.unlocked.push(...newlyUnlocked(this.stats, this.unlocked)); // состояние меняет action, не reaction
  }
}

// reaction — только для побочного эффекта, observable она не меняет
export const onAchievementUnlocked = (store: GameStore, cb: (id: AchievementId) => void) =>
  reaction(
    () => store.unlocked.slice(),
    (next, prev) => next.filter((id) => !prev.includes(id)).forEach(cb),
  );
```

### Тест

```ts
// src/game/game.test.ts
import { GameStore, onAchievementUnlocked as onMobx } from './game.mobx';
import { onSlicesUnlocked, useGameSlices } from './game.slices';
import { onAchievementUnlocked as onZustand, useGame } from './game.zustand';
import { applyTrade } from './rules';

test('streak rules', () => {
  const s0 = { trades: 0, streak: 0, lastTradeDay: null };
  const s1 = applyTrade(s0, '2026-10-30');
  const s2 = applyTrade(s1, '2026-10-31');
  expect(applyTrade(s2, '2026-10-31').streak).toBe(2); // тот же день
  expect(applyTrade(s2, '2026-11-01').streak).toBe(3); // через границу месяца
  expect(applyTrade(s2, '2026-11-03').streak).toBe(1); // пропуск → сначала
  expect(applyTrade(s2, '2026-10-29')).toMatchObject({ trades: 3, streak: 2, lastTradeDay: '2026-10-31' });
});

const impls = [
  ['zustand', () => {
    useGame.setState(useGame.getInitialState(), true);
    return { trade: (d: string) => useGame.getState().recordTrade(d), unlocked: () => useGame.getState().unlocked, on: onZustand };
  }],
  ['zustand slices', () => {
    useGameSlices.setState(useGameSlices.getInitialState(), true);
    return { trade: (d: string) => useGameSlices.getState().recordTrade(d), unlocked: () => useGameSlices.getState().unlocked, on: onSlicesUnlocked };
  }],
  ['mobx', () => {
    const store = new GameStore();
    return { trade: store.recordTrade, unlocked: () => store.unlocked.slice(), on: (cb: (id: string) => void) => onMobx(store, cb) };
  }],
] as const;

describe.each(impls)('achievements: %s', (_name, make) => {
  it('emits each unlock once and keeps it after the streak breaks', () => {
    const g = make();
    const events: string[] = [];
    const stop = g.on((id) => events.push(id));
    g.trade('2026-10-19');
    g.trade('2026-10-20');
    g.trade('2026-10-21');
    g.trade('2026-10-25'); // streak сброшен
    expect(events).toEqual(['first-trade', 'streak-3']);
    expect(g.unlocked()).toEqual(['first-trade', 'streak-3']);
    stop();
  });
});

test('mobx: challenges computed', () => {
  const store = new GameStore();
  store.recordTrade('2026-10-20');
  store.recordTrade('2026-10-21');
  expect(store.challenges.map((c) => c.progress)).toEqual([0.4, 2 / 3]);
});
```

### Сравнение

| | Zustand | MobX |
|---|---|---|
| Производное | селектор-примитив `useChallengeProgress(i)` | `get challenges()` |
| Структура | один стор или slices: каждый slice — `StateCreator<GameStore, Mutators, [], Slice>` | классы-сторы, общий `RootStore` (задача 9) |
| Эффект | `subscribe(selector, (next, prev) => …)` из `subscribeWithSelector` | `reaction(() => store.unlocked.slice(), (next, prev) => …)` |
| Где открывается ачивка | в updater внутри `set` | в action |
| Тестируемость | без React: `getState` и подписка | `new GameStore()` и reaction |
| Ловушки | обычный `subscribe(listener)` срабатывает на любое изменение — сравнивать придётся самому; если `unlocked` сохраняется через `persist` с асинхронным хранилищем, гидратация выглядит как «новые ачивки» — подписывайся после `onFinishHydration` | `reaction(() => store.unlocked, …)` без `slice()` не видит `push`: прочитана только ссылка (проверено); reaction, которая сама меняет `unlocked`, — путаница и порядок реакций не гарантирован |

**Ещё практика** (20 мин)

1. **Лидерборд турнира** (10 мин). Топ-10 приходит с сервера, а «моё место» обновляется по WebSocket. Нарисуй, что где хранится. *Критерий:* лидерборд — в Query, живое «моё место» — в маленьком сторе или в кэше Query через `setQueryData`, и ты объясняешь выбор.
2. **Граничные случаи стрика** (10 мин). Попроси AI 5 случаев: часовые пояса, переход на летнее время, смена зоны в поездке, сделка в 23:59 и в 00:01. Добавь тесты. *Критерий:* правило «какой день считать» записано одной фразой.

**Самопроверка**

- Почему ачивку открывает action, а тост показывает reaction или подписка?
- Почему `reaction(() => store.unlocked, …)` не сработает на `push`?
- Кто должен считать стрик в продакшене и почему?

**Готово, когда…** 5 тестов зелёные, и ты объясняешь разделение «правила / состояние / эффекты».

## Задача 9. Тесты: сторы без React и экраны с React (1 ч)

**Цель.** Быстро и надёжно тестировать сторы и экраны, которые от них зависят.

**Что повторить**

- Без React. Zustand: `getState()`, `setState()`, `subscribe()`; синглтон сбрасывай в `beforeEach` через `setState(getInitialState(), true)` или замокай `zustand` целиком, как в документации ([testing](https://zustand.docs.pmnd.rs/learn/guides/testing)). Фабрика на `createStore` с DI — лучший вариант для сторов с зависимостями. MobX: новый экземпляр на тест, зависимости через конструктор, ожидание состояния — `await when(() => …)`. Для unit-тестов полезен `configure({ disableErrorBoundaries: true })`, но тогда после каждого теста — `_resetGlobalState()` ([configuration](https://mobx.js.org/configuration.html)).
- С React. RNTL 14: `render`, `fireEvent`, `act`, `renderHook` асинхронные — всегда `await` ([render](https://oss.callstack.com/react-native-testing-library/docs/api/render)). Ищи элементы по роли и тексту — как видит пользователь.
- MobX 7: `Provider` и `inject` удалены — стор передаём через обычный React context; в тесте — свой `renderWithStores` с новым стором.
- Время и асинхронность: `jest.useFakeTimers()` (задача 4), `Promise.withResolvers()` (задачи 3 и 7).
- Раздели «глупый» компонент (только props) и тонкую обёртку, которая берёт данные из стора: вью тестируется без стора, обёртка — одним интеграционным тестом.
- Первый прогон тестов RN медленный (Babel трансформирует модули) — отсюда `testTimeout` в `jest.config.js`.

**Условие.** Экран watchlist: поле ввода, кнопка Add, список с кнопками Remove. Одна «глупая» вью и две обёртки — Zustand и MobX. Тест — один на обе.

**Попробуй сам** (25 мин, без AI)

*Критерии:* 1) ввод `aapl`, `AAPL`, `tsla` → на экране `AAPL` и `TSLA`; 2) Remove убирает строку; 3) для MobX — тест, который ловит ловушку «FlatList не observer»; 4) unit-тест MobX-стора через `when` и Zustand-стора через `subscribe`.

> ⛔ **Не подсматривай, пока не попробуешь.** Ниже — решения.

### Провайдер для MobX

```tsx
// src/screens/RootStore.tsx — MobX 7: Provider/inject удалены, используем обычный React context
import { createContext, type ReactNode, useContext } from 'react';
import { WatchlistStore } from '../watchlist/watchlist.mobx';

export class RootStore {
  readonly watchlist = new WatchlistStore();
}

const RootStoreContext = createContext<RootStore | null>(null);

export const RootStoreProvider = ({ store, children }: { store: RootStore; children: ReactNode }) => (
  <RootStoreContext value={store}>{children}</RootStoreContext> // React 19: контекст сам работает как провайдер
);

export function useStores() {
  const store = useContext(RootStoreContext);
  if (!store) throw new Error('RootStoreProvider is missing');
  return store;
}
```

### Экран: одна вью, две обёртки

```tsx
// src/screens/WatchlistScreen.tsx — один и тот же экран на двух сторах
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { useWatchlist } from '../watchlist/watchlist.zustand';
import { useStores } from './RootStore';

type Props = { symbols: string[]; onAdd: (s: string) => void; onRemove: (s: string) => void };

// «Глупый» компонент без стора: его легко тестировать и переиспользовать
function WatchlistView({ symbols, onAdd, onRemove }: Props) {
  const [text, setText] = useState('');
  return (
    <View>
      <TextInput placeholder="Symbol" value={text} onChangeText={setText} />
      <Pressable role="button" onPress={() => { onAdd(text); setText(''); }}><Text>Add</Text></Pressable>
      <FlatList
        data={symbols}
        keyExtractor={(s) => s}
        renderItem={({ item }) => (
          <Pressable role="button" aria-label={`Remove ${item}`} onPress={() => onRemove(item)}><Text>{item}</Text></Pressable>
        )}
      />
    </View>
  );
}

export function ZWatchlistScreen() {
  const symbols = useWatchlist((s) => s.symbols);
  const add = useWatchlist((s) => s.add); // функции в сторе стабильны
  const remove = useWatchlist((s) => s.remove);
  return <WatchlistView symbols={symbols} onAdd={add} onRemove={remove} />;
}

export const MWatchlistScreen = observer(function MWatchlistScreen() {
  const { watchlist } = useStores();
  // slice(): читаем элементы внутри observer + отдаём FlatList (не observer) обычный массив
  return <WatchlistView symbols={watchlist.symbols.slice()} onAdd={watchlist.add} onRemove={watchlist.remove} />;
});

// ❌ FlatList сам не observer: observer прочитал только ссылку на массив → push не перерисует список
export const BrokenMWatchlistScreen = observer(function BrokenMWatchlistScreen() {
  const { watchlist } = useStores();
  return <WatchlistView symbols={watchlist.symbols} onAdd={watchlist.add} onRemove={watchlist.remove} />;
});
```

### Тест экрана

```tsx
// src/screens/WatchlistScreen.test.tsx — RNTL 14: render, act и события асинхронные
import type { ReactElement } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useWatchlist } from '../watchlist/watchlist.zustand';
import { RootStore, RootStoreProvider } from './RootStore';
import { BrokenMWatchlistScreen, MWatchlistScreen, ZWatchlistScreen } from './WatchlistScreen';

// Свой render с провайдером: каждый тест получает новый RootStore
const renderWithStores = (ui: ReactElement, store = new RootStore()) =>
  render(<RootStoreProvider store={store}>{ui}</RootStoreProvider>);

async function addSymbol(text: string) {
  await fireEvent.changeText(screen.getByPlaceholderText('Symbol'), text);
  await fireEvent.press(screen.getByRole('button', { name: 'Add' }));
}

beforeEach(() => useWatchlist.setState(useWatchlist.getInitialState(), true));

describe.each([
  ['zustand', () => render(<ZWatchlistScreen />)],
  ['mobx', () => renderWithStores(<MWatchlistScreen />)],
])('WatchlistScreen: %s', (_name, renderScreen) => {
  it('adds, dedupes and removes symbols', async () => {
    await renderScreen();
    await addSymbol('aapl');
    await addSymbol('AAPL');
    await addSymbol('tsla');
    expect(screen.getAllByText(/^(AAPL|TSLA)$/).map((n) => n.props.children)).toEqual(['AAPL', 'TSLA']);
    await fireEvent.press(screen.getByRole('button', { name: 'Remove AAPL' }));
    expect(screen.queryByText('AAPL')).toBeNull();
  });
});

test('mobx pitfall: a non-observer FlatList misses push() made elsewhere', async () => {
  const store = new RootStore();
  await renderWithStores(<BrokenMWatchlistScreen />, store);
  await act(() => store.watchlist.add('NVDA')); // например, пришло с сервера или с другого экрана
  expect(screen.queryByText('NVDA')).toBeNull(); // стор изменился, а экран — нет
  await renderWithStores(<MWatchlistScreen />, store);
  expect(screen.getByText('NVDA')).toBeTruthy(); // вариант со slice() показывает
});
```

### Unit-тесты без React

```ts
// src/screens/unit-patterns.test.ts — приёмы unit-тестов сторов без React
import { when } from 'mobx';
import { SearchStore } from '../search/search.mobx';
import { createSearchStore } from '../search/search.zustand';
import type { SearchFn } from '../search/types';

const ok: SearchFn = (query) => Promise.resolve([{ symbol: query, name: query }]);

test('mobx: wait for a state with when()', async () => {
  const store = new SearchStore(ok);
  void store.search('AAPL');
  await when(() => store.status === 'success'); // when без эффекта возвращает промис
  expect(store.results.map((r) => r.symbol)).toEqual(['AAPL']);
});

test('zustand: record state transitions with subscribe()', async () => {
  const store = createSearchStore(ok); // фабрика: новый стор на тест, сбрасывать нечего
  const statuses: string[] = [];
  const stop = store.subscribe((s) => statuses.push(s.status));
  await store.getState().search('TSLA');
  expect(statuses).toEqual(['loading', 'success']);
  stop();
});
```

### Сравнение

| | Zustand | MobX |
|---|---|---|
| Изоляция | глобальный хук — сброс перед тестом; фабрика — новый стор | новый `RootStore` на тест |
| Провайдер | не нужен | свой React context |
| Ожидание async | `await` экшена; `subscribe` для переходов | `when()` |
| Ловушки | забыл сброс → тесты зависят от порядка | FlatList и колбэки без `observer`; ловушку видно, только если изменение пришло не из этой же вью — локальный `setState` её маскирует |

**Ещё практика** (15 мин)

1. **Что тест не проверяет** (10 мин). Возьми любой тест из задач 1–8 и попроси AI: «Что этот тест НЕ проверяет?» *Критерий:* добавил 1 тест, который падал бы на реальном баге.
2. **renderHook** (5 мин). Протестируй `useTotalValue` из задачи 2 через `await renderHook(...)`. *Критерий:* хук возвращает новое значение после `applyPrices` внутри `await act(...)`.

**Самопроверка**

- Чем фабрика `createStore` удобнее глобального хука в тестах?
- Почему в RNTL 14 нужен `await render(...)`?
- Как дождаться асинхронного состояния MobX без `setTimeout`?
- Почему тест «FlatList не observer» меняет стор снаружи, а не через кнопку?

**Готово, когда…** 5 тестов зелёные, и ты объясняешь, что проверяет каждый.

Дальше: [часть 7 — задача 10, вопросы интервью и мок-интервью](05-state-management-zustand-mobx-part7.md).
