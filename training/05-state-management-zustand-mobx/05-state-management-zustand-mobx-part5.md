# Управление состоянием: одна задача — два решения (Zustand и MobX)

Обновлено: 2026-10-21 · Тренинг 5 из 6 · ≈ 16 часов · Вакансия: [карточка](../../card.ru.md)

[1](05-state-management-zustand-mobx.md) · [2](05-state-management-zustand-mobx-part2.md) · [3](05-state-management-zustand-mobx-part3.md) · [4](05-state-management-zustand-mobx-part4.md) · Часть 5 из 7 · [6](05-state-management-zustand-mobx-part6.md) · [7](05-state-management-zustand-mobx-part7.md)

## Задача 6. Persistence в React Native: MMKV, версии, миграции (1,5 ч)

**Цель.** Сохранять настройки и watchlist между запусками, переживать смену формата данных и не сохранять лишнего.

**Что повторить**

- Что сохранять: настройки, watchlist, флаги онбординга. Что не сохранять: котировки, серверный кэш (у TanStack Query свой persister), токены (только SecureStore).
- MMKV 4: `createMMKV({ id })`, `set`, `getString`, `remove` (не `delete`); нужен `react-native-nitro-modules` ([V4 upgrade guide](https://github.com/margelo/react-native-mmkv/blob/main/docs/V4_UPGRADE_GUIDE.md)). MMKV синхронный, поэтому Zustand `persist` гидратирует стор прямо при создании — нет «мигания» значений по умолчанию. С AsyncStorage гидратация асинхронная: нужен `hasHydrated()` или `onFinishHydration` ([persisting store data](https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data)).
- Zustand `persist`: `name`, `storage: createJSONStorage(() => …)`, `partialize`, `version` + `migrate`, `merge`. Поднял `version`, а `migrate` нет — данные с диска не применятся (будет только ошибка в консоли). `merge` вызывается и тогда, когда на диске пусто.
- MobX: готового `persist` нет. Варианты: свой `reaction` + MMKV (≈20 строк, ниже) или `mobx-persist-store` — его пример есть в документации MMKV, но последний релиз 1.1.8 вышел 2025-03-21, открыто 15 issues и PR, поддержка MobX 7 не заявлена (проверено 2026-10-21). Для нового кода на MobX 7 надёжнее свой `reaction`. В MST то же делают `onSnapshot` + `applySnapshot`.
- Данные с диска — внешний ввод: проверяй схемой (Zod), битое поле заменяй значением по умолчанию.

**Условие.** Настройки `{ watchlist, chartInterval, hideBalances }`, версия 2. Формат v0 был `{ symbols, intervalMinutes }`; v1 переименовал `symbols` в `watchlist`; v2 заменил `intervalMinutes` на `chartInterval` и добавил `hideBalances`.

**Попробуй сам** (35 мин, без AI)

*Критерии:* 1) данные v0 после старта превращаются в v2: `['TSLA']`, `'1h'`, `false`; 2) изменение настройки сразу пишется на диск в формате `{ state, version: 2 }`; 3) битые данные → значения по умолчанию, без падения; 4) миграции и схема общие для двух сторов.

> ⛔ **Не подсматривай, пока не попробуешь.** Ниже — решения.

### Общие схема и миграции

```ts
// src/persist/settings.model.ts — схема, версии и миграции общие для обоих сторов
import { z } from 'zod';

export const SETTINGS_VERSION = 2;

const Interval = z.enum(['1m', '5m', '1h', '1d']);
export type ChartInterval = z.infer<typeof Interval>;

export const defaultSettings = { watchlist: ['AAPL', 'BTCUSDT'], chartInterval: '5m', hideBalances: false } as const;

// Диск — внешний ввод: битое поле заменяем значением по умолчанию, лишние поля отбрасываем
const Settings = z
  .object({
    watchlist: z.array(z.string()).catch([...defaultSettings.watchlist]),
    chartInterval: Interval.catch(defaultSettings.chartInterval),
    hideBalances: z.boolean().catch(defaultSettings.hideBalances),
  })
  .catch({ ...defaultSettings, watchlist: [...defaultSettings.watchlist] });
export type PersistedSettings = z.infer<typeof Settings>;
export const parseSettings = (raw: unknown): PersistedSettings => Settings.parse(raw);

type Raw = Record<string, unknown>;
const toInterval = (minutes: unknown): ChartInterval =>
  minutes === 1 ? '1m' : minutes === 60 ? '1h' : minutes === 1440 ? '1d' : '5m';

// Шаг N поднимает данные с версии N-1 до N; применяем по очереди: 0 → 1 → 2
const steps: Record<number, (s: Raw) => Raw> = {
  1: ({ symbols, ...rest }) => ({ ...rest, watchlist: symbols }), // v1: symbols → watchlist
  2: ({ intervalMinutes, ...rest }) => ({ ...rest, chartInterval: toInterval(intervalMinutes), hideBalances: false }),
};

export function migrateSettings(persisted: unknown, fromVersion: number): PersistedSettings {
  let state: Raw = typeof persisted === 'object' && persisted !== null ? (persisted as Raw) : {};
  for (let v = fromVersion + 1; v <= SETTINGS_VERSION; v++) state = steps[v]?.(state) ?? state;
  return parseSettings(state);
}
```

### Адаптер MMKV

```ts
// src/persist/mmkv.ts
import { createMMKV, type MMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

export const storage = createMMKV({ id: 'app-state' }); // не для секретов: токены — в SecureStore

// MMKV → StateStorage для persist. MMKV синхронный → гидратация прямо при создании стора
export const toStateStorage = (mmkv: MMKV): StateStorage => ({
  getItem: (name) => mmkv.getString(name) ?? null,
  setItem: (name, value) => mmkv.set(name, value),
  removeItem: (name) => {
    mmkv.remove(name); // в v4 — remove(), не delete()
  },
});
```

### Решение на Zustand

```ts
// src/persist/settings.zustand.ts
import { useStore } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';
import { storage, toStateStorage } from './mmkv';
import {
  type ChartInterval, defaultSettings, migrateSettings, parseSettings, type PersistedSettings, SETTINGS_VERSION,
} from './settings.model';

type SettingsState = PersistedSettings & {
  setChartInterval: (chartInterval: ChartInterval) => void;
  toggleHideBalances: () => void;
};

export const createSettingsStore = (kv: StateStorage) =>
  createStore<SettingsState>()(
    persist(
      (set) => ({
        ...defaultSettings,
        watchlist: [...defaultSettings.watchlist],
        setChartInterval: (chartInterval) => set({ chartInterval }),
        toggleHideBalances: () => set((s) => ({ hideBalances: !s.hideBalances })),
      }),
      {
        name: 'settings',
        version: SETTINGS_VERSION,
        storage: createJSONStorage(() => kv),
        // сохраняем только данные, не функции и не временное состояние
        partialize: (s): PersistedSettings => ({ watchlist: s.watchlist, chartInterval: s.chartInterval, hideBalances: s.hideBalances }),
        migrate: migrateSettings, // вызывается, только если версия на диске другая
        // merge зовётся и без данных на диске (persisted === undefined)
        merge: (persisted, current) => (persisted === undefined ? current : { ...current, ...parseSettings(persisted) }),
      },
    ),
  );

export const settingsStore = createSettingsStore(toStateStorage(storage));
export const useSettings = <T>(selector: (s: SettingsState) => T) => useStore(settingsStore, selector);
```

### Решение на MobX

```ts
// src/persist/settings.mobx.ts
import { makeAutoObservable, reaction } from 'mobx';
import type { MMKV } from 'react-native-mmkv';
import {
  type ChartInterval, defaultSettings, migrateSettings, type PersistedSettings, SETTINGS_VERSION,
} from './settings.model';

export class SettingsStore {
  watchlist: string[] = [...defaultSettings.watchlist];
  chartInterval: ChartInterval = defaultSettings.chartInterval;
  hideBalances: boolean = defaultSettings.hideBalances;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setChartInterval(chartInterval: ChartInterval) {
    this.chartInterval = chartInterval;
  }

  toggleHideBalances() {
    this.hideBalances = !this.hideBalances;
  }

  apply(data: PersistedSettings) {
    Object.assign(this, data); // одно action → одна запись на диск
  }

  get snapshot(): PersistedSettings {
    return { watchlist: this.watchlist.slice(), chartInterval: this.chartInterval, hideBalances: this.hideBalances };
  }
}

// Формат как у Zustand persist — { state, version }: переезд между библиотеками без потери данных
export function persistSettings(store: SettingsStore, kv: Pick<MMKV, 'getString' | 'set'>, key = 'settings') {
  const raw = kv.getString(key);
  if (raw !== undefined) {
    try {
      const { state, version } = JSON.parse(raw) as { state?: unknown; version?: number };
      store.apply(migrateSettings(state, version ?? 0)); // та же версия → шагов нет, только проверка схемой
    } catch (e) {
      if (__DEV__) console.warn('settings: corrupted storage, using defaults', e);
    }
  }
  // reaction: при каждом изменении snapshot пишем на диск; вернули disposer
  return reaction(() => store.snapshot, (state) => kv.set(key, JSON.stringify({ state, version: SETTINGS_VERSION })));
}
```

### Тест

```ts
// src/persist/persist.test.ts — в Jest createMMKV() сам возвращает in-memory мок
import { createMMKV } from 'react-native-mmkv';
import { toStateStorage } from './mmkv';
import { persistSettings, SettingsStore } from './settings.mobx';
import { createSettingsStore } from './settings.zustand';

const V0 = JSON.stringify({ state: { symbols: ['TSLA'], intervalMinutes: 60 }, version: 0 });

const impls = [
  ['zustand', (kv: ReturnType<typeof createMMKV>) => {
    const store = createSettingsStore(toStateStorage(kv));
    return { read: () => store.getState(), toggle: () => store.getState().toggleHideBalances() };
  }],
  ['mobx', (kv: ReturnType<typeof createMMKV>) => {
    const store = new SettingsStore();
    persistSettings(store, kv);
    return { read: () => store.snapshot, toggle: store.toggleHideBalances };
  }],
] as const;

describe.each(impls)('settings persistence: %s', (_name, make) => {
  it('migrates v0 → v2 on start and saves changes', () => {
    const kv = createMMKV({ id: `t-${Math.random()}` });
    kv.set('settings', V0);
    const s = make(kv); // MMKV синхронный: данные уже на месте, ждать гидратацию не нужно
    expect(s.read()).toMatchObject({ watchlist: ['TSLA'], chartInterval: '1h', hideBalances: false });
    s.toggle();
    expect(JSON.parse(kv.getString('settings')!)).toEqual({
      state: { watchlist: ['TSLA'], chartInterval: '1h', hideBalances: true },
      version: 2,
    });
  });

  it('falls back to defaults for corrupted data', () => {
    const kv = createMMKV({ id: `t-${Math.random()}` });
    kv.set('settings', JSON.stringify({ state: { watchlist: 'oops', chartInterval: '7m' }, version: 2 }));
    expect(make(kv).read()).toMatchObject({ watchlist: ['AAPL', 'BTCUSDT'], chartInterval: '5m', hideBalances: false });
  });
});

test('zustand: hydration with MMKV is synchronous', () => {
  const kv = createMMKV({ id: 'sync' });
  const store = createSettingsStore(toStateStorage(kv));
  expect(store.persist.hasHydrated()).toBe(true);
});
```

### Сравнение

| | Zustand | MobX |
|---|---|---|
| Механизм | `persist` из коробки | свой `reaction` (или библиотека) |
| Что сохраняем | `partialize` | `computed` `snapshot` |
| Версии | `version` + `migrate` встроены | конверт `{ state, version }` вручную — взяли формат Zustand |
| Гидратация | синхронная с MMKV; `hasHydrated`, `onFinishHydration`, `skipHydration` | явный вызов `persistSettings` на старте |
| Тестируемость | фабрика + MMKV-мок | `new SettingsStore()` + MMKV-мок |
| Ловушки | без `partialize` в диск уходят временные поля; поднять `version` без `migrate`; несериализуемые значения (Map, Date, Decimal) | забыть disposer; писать на диск на каждый тик (есть опция `delay`); сохранять весь стор вместо снимка |

Одинаковый конверт `{ state, version }` — бонус при переезде между библиотеками: пользователь не теряет настройки, если ключ и формат на диске те же.

**Ещё практика** (20 мин)

1. **Версия 3** (12 мин). `hideBalances` превращается в `privacy: { hideBalances, hidePnl }`. Шаг миграции и тест «v0 → v3». *Критерий:* новый тест зелёный, а старые ты поправил только там, где изменился формат.
2. **Атака на миграции** (8 мин). Попроси AI: «Какие данные на диске сломают мой migrate?» Добавь тесты на 3 случая. *Критерий:* ни один не роняет приложение.

**Самопроверка**

- Почему с MMKV не нужен экран-заглушка «ждём гидратацию», а с AsyncStorage нужен?
- Что будет, если поднять `version` и забыть `migrate`?
- Почему токен нельзя хранить в MMKV? Где ему место?
- От каких багов защищает `partialize`?

**Готово, когда…** 5 тестов зелёные, и ты объясняешь путь данных: диск → migrate → схема → стор → `persist` или `reaction` → диск.

## Задача 7. Оптимистичный ордер с откатом (1 ч)

**Цель.** Показать ордер сразу, а при ошибке откатить только его — не задев другие изменения.

**Что повторить**

- Оптимистичный UI: сначала меняем стор, потом ждём сервер; при ошибке — откат и понятное сообщение.
- Откат **обратной операцией**, а не снимком всего стора: пока ждали ответ, мог подтвердиться другой ордер, и снимок его «сотрёт».
- `clientId` генерирует клиент; он же ключ идемпотентности — повтор запроса не создаст второй ордер. Жизненный цикл ордера и идемпотентность — в [тренинге 2, блок 4](../02-trading-app-architecture/02-trading-app-architecture-part2.md).
- Если ордера — server state из `useQuery`, используй `useMutation`: `onMutate` (отменить запросы, сохранить старое, записать ожидаемое), `onError` (откат), `onSettled` (инвалидация) — см. [api-layer](../../../../../interview-prep/technical/api-layer.ru.md) и [optimistic updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates). Ручной стор — для локального состояния (резерв, черновик) или когда Query нет.

**Условие.** `place(draft)` добавляет ордер со статусом `pending` и резервирует деньги (`qty × limitPrice` для покупки). Успех → `open` и `serverId`. Ошибка → ордер удалён, резерв возвращён, текст ошибки — в сторе.

**Попробуй сам** (25 мин, без AI)

*Критерии:* 1) два ордера параллельно: второй подтверждён раньше, первый отклонён позже → остаётся только второй, резерв `250`; 2) резерв считается в decimal: 300.20 + 250 = `550.2`; 3) идентификаторы подставляет тест — никакого `Math.random`.

> ⛔ **Не подсматривай, пока не попробуешь.** Ниже — решения.

### Общая модель

```ts
// src/orders/orders.model.ts
import Decimal from 'decimal.js';

export type OrderDraft = { symbol: string; side: 'buy' | 'sell'; qty: string; limitPrice: string };
export type Order = OrderDraft & { clientId: string; serverId: string | null; status: 'pending' | 'open' };
export type OrdersApi = { placeOrder: (order: OrderDraft & { clientId: string }) => Promise<{ id: string }> };

// Покупка резервирует деньги (резерв бумаг под продажу опущен для краткости)
export const reserveFor = (d: OrderDraft) => (d.side === 'buy' ? new Decimal(d.qty).times(d.limitPrice) : new Decimal(0));
```

### Решение на Zustand

```ts
// src/orders/orders.zustand.ts
import Decimal from 'decimal.js';
import { createStore } from 'zustand/vanilla';
import { toMessage } from '../search/types';
import { type Order, type OrderDraft, type OrdersApi, reserveFor } from './orders.model';

type OrdersState = {
  orders: Record<string, Order>; // ключ — clientId
  reserved: string;
  error: string | null;
  place: (draft: OrderDraft) => Promise<void>;
};

export const createOrdersStore = (api: OrdersApi, newId: () => string) =>
  createStore<OrdersState>()((set) => ({
    orders: {},
    reserved: '0',
    error: null,
    place: async (draft) => {
      const clientId = newId(); // он же ключ идемпотентности при повторе запроса
      const amount = reserveFor(draft);
      // 1. оптимистично: ордер уже в списке, деньги зарезервированы
      set((s) => ({
        orders: { ...s.orders, [clientId]: { ...draft, clientId, serverId: null, status: 'pending' } },
        reserved: amount.plus(s.reserved).toString(),
        error: null,
      }));
      try {
        const { id } = await api.placeOrder({ ...draft, clientId });
        // 2. подтверждение: меняем только свой ордер
        set((s) => {
          const order = s.orders[clientId];
          return order ? { orders: { ...s.orders, [clientId]: { ...order, serverId: id, status: 'open' } } } : s;
        });
      } catch (e) {
        // 3. откат обратной операцией, а не снимком: другие ордера за это время могли измениться
        set((s) => {
          const orders = { ...s.orders };
          delete orders[clientId];
          return { orders, reserved: new Decimal(s.reserved).minus(amount).toString(), error: toMessage(e) };
        });
      }
    },
  }));
```

### Решение на MobX

```ts
// src/orders/orders.mobx.ts
import Decimal from 'decimal.js';
import { makeAutoObservable, runInAction } from 'mobx';
import { toMessage } from '../search/types';
import { type Order, type OrderDraft, type OrdersApi, reserveFor } from './orders.model';

export class OrdersStore {
  orders = new Map<string, Order>(); // makeAutoObservable превратит в observable map
  reserved = '0';
  error: string | null = null;

  constructor(private readonly api: OrdersApi, private readonly newId: () => string) {
    makeAutoObservable<OrdersStore, 'api' | 'newId'>(this, { api: false, newId: false }, { autoBind: true });
  }

  async place(draft: OrderDraft) {
    const clientId = this.newId();
    const amount = reserveFor(draft);
    this.orders.set(clientId, { ...draft, clientId, serverId: null, status: 'pending' });
    this.reserved = amount.plus(this.reserved).toString();
    this.error = null;
    try {
      const { id } = await this.api.placeOrder({ ...draft, clientId });
      runInAction(() => {
        const order = this.orders.get(clientId); // объект внутри map — observable: просто мутируем
        if (order) Object.assign(order, { serverId: id, status: 'open' });
      });
    } catch (e) {
      runInAction(() => {
        this.orders.delete(clientId);
        this.reserved = new Decimal(this.reserved).minus(amount).toString();
        this.error = toMessage(e);
      });
    }
  }
}
```

### Тест

```ts
// src/orders/orders.test.ts
import { OrdersStore } from './orders.mobx';
import type { Order, OrdersApi } from './orders.model';
import { createOrdersStore } from './orders.zustand';

function fakeApi() {
  const calls: { resolve: (r: { id: string }) => void; reject: (e: Error) => void }[] = [];
  const api: OrdersApi = {
    placeOrder: () => {
      const { promise, resolve, reject } = Promise.withResolvers<{ id: string }>();
      calls.push({ resolve, reject });
      return promise;
    },
  };
  return { api, calls };
}
const ids = (...list: string[]) => () => list.shift() ?? 'x';
const statuses = (orders: Iterable<Order>) => Object.fromEntries([...orders].map((o) => [o.clientId, o.status]));

type Adapter = { place: OrdersStore['place']; read: () => { reserved: string; orders: Record<string, string>; error: string | null } };
const impls: [string, (api: OrdersApi, newId: () => string) => Adapter][] = [
  ['zustand', (api, newId) => {
    const store = createOrdersStore(api, newId);
    const read = () => { const s = store.getState(); return { reserved: s.reserved, orders: statuses(Object.values(s.orders)), error: s.error }; };
    return { place: (d) => store.getState().place(d), read };
  }],
  ['mobx', (api, newId) => {
    const store = new OrdersStore(api, newId);
    return { place: store.place, read: () => ({ reserved: store.reserved, orders: statuses(store.orders.values()), error: store.error }) };
  }],
];

describe.each(impls)('optimistic orders: %s', (_name, make) => {
  it('rolls back only the rejected order', async () => {
    const { api, calls } = fakeApi();
    const s = make(api, ids('a', 'b'));
    const p1 = s.place({ symbol: 'AAPL', side: 'buy', qty: '2', limitPrice: '150.10' }); // резерв 300.20
    const p2 = s.place({ symbol: 'TSLA', side: 'buy', qty: '1', limitPrice: '250' });
    expect(s.read()).toEqual({ reserved: '550.2', orders: { a: 'pending', b: 'pending' }, error: null });
    calls[1]?.resolve({ id: 'srv-2' }); // b подтвердили раньше
    calls[0]?.reject(new Error('Insufficient margin')); // a отклонили позже
    await Promise.all([p1, p2]);
    expect(s.read()).toEqual({ reserved: '250', orders: { b: 'open' }, error: 'Insufficient margin' });
  });
});
```

### Сравнение

| | Zustand | MobX |
|---|---|---|
| Подтверждение | копия `orders` с новым объектом ордера | мутация observable-объекта в map |
| Откат | новый объект без ключа + обратная операция с резервом | `delete` + обратная операция |
| После `await` | обычный `set` | `runInAction` |
| Тестируемость | DI: `api` и `newId` | то же |
| Ловушки | `const prev = get()` до запроса и `set(prev)` в `catch` стирает чужие изменения | то же + изменения после `await` без `runInAction` |

**Ещё практика** (15 мин)

1. **Отмена ордера** (10 мин). `cancel(clientId)` для `open`-ордера — тоже оптимистично. Что делать, если отмену нажали, пока ордер ещё `pending`? *Критерий:* тест на этот случай и решение в одном предложении.
2. **Гонки** (5 мин). Попроси AI: «Какие гонки остались в этом сторе?» Сравни со своим списком. *Критерий:* хотя бы одну ты нашёл сам.

**Самопроверка**

- Почему откат снимком опасен?
- Зачем `clientId` генерирует клиент, а не сервер?
- Когда брать `useMutation` вместо стора?

**Готово, когда…** 2 теста зелёные, и ты за минуту объясняешь сценарий «два ордера, один отклонён».

Дальше: [часть 6 — задачи 8–9: геймификация и тесты](05-state-management-zustand-mobx-part6.md).
