# Управление состоянием: одна задача — два решения (Zustand и MobX)

Обновлено: 2026-10-21 · Тренинг 5 из 6 · ≈ 16 часов · Вакансия: [карточка](../../card.ru.md)

[1](05-state-management-zustand-mobx.md) · [2](05-state-management-zustand-mobx-part2.md) · Часть 3 из 7 · [4](05-state-management-zustand-mobx-part4.md) · [5](05-state-management-zustand-mobx-part5.md) · [6](05-state-management-zustand-mobx-part6.md) · [7](05-state-management-zustand-mobx-part7.md)

## Задача 3. Загрузка, ошибки и отмена устаревших запросов (1,5 ч)

**Цель.** Async-экшен со статусами `idle / loading / success / error`, где старый ответ не затирает новый. И понимать, когда такой стор вообще не нужно писать.

**Что повторить**

- Гонка: пользователь вводит `AA`, затем `AAPL`; ответ на `AA` приходит позже и затирает результат. Защит две: `AbortController` отменяет сам запрос, а проверка «это ещё актуальный запрос?» игнорирует опоздавший ответ. Нужны обе: не каждый API реагирует на abort, а если fetch уже завершился, `abort()` ничего не отменит — код после `await` всё равно выполнится.
- MobX: в `async`-методе код до первого `await` выполняется внутри action, после — уже нет. Изменения после `await` оборачивай в `runInAction` ([actions](https://mobx.js.org/actions.html)). Альтернатива — `flow`: генератор и `yield`, у промиса есть `cancel()`; в TypeScript нужен `flowResult`.
- Zustand: async-экшен — обычная функция, `set` можно вызывать когда угодно. Служебное (контроллер) держи в замыкании, не в state.
- Фабрика на `createStore` из `zustand/vanilla` плюс `useStore` — стор с зависимостями, которые в тестах подменяются ([createStore](https://zustand.docs.pmnd.rs/reference/apis/create-store)).
- **Когда лучше TanStack Query.** Результаты поиска — это server state. Query сам даёт кэш по ключу, дедупликацию, повторы и `signal` для отмены: если запрос стал неактивным, а `signal` передан в fetch, запрос отменяется ([query cancellation](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation)). Ручной стор оправдан, когда это не HTTP-кэш: команда (ордер), поток, локальная операция.

**Условие.** Поиск инструментов: `search(query)` вызывает `searchFn(query, signal)`. Статус и ошибка — в сторе. Новый поиск отменяет предыдущий запрос, опоздавший ответ игнорируется.

**Попробуй сам** (35 мин, без AI)

*Критерии:* 1) после `search('AA')` и `search('AAPL')` signal первого запроса — `aborted`; 2) ответ на `AA`, пришедший последним, не попадает в `results`; 3) ошибка текущего запроса → `status: 'error'` и текст ошибки; 4) тест без сети и таймеров: фейковый `searchFn` на `Promise.withResolvers`.

> ⛔ **Не подсматривай, пока не попробуешь.** Ниже — решения.

### Общие типы и настоящий запрос

```ts
// src/search/types.ts
export type Instrument = { symbol: string; name: string };
export type SearchFn = (query: string, signal: AbortSignal) => Promise<Instrument[]>;
export type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

export const toMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));
```

```ts
// src/search/api.ts — настоящий запрос; в проекте ответ проверяем Zod-схемой (см. api-layer)
import type { Instrument, SearchFn } from './types';

const API_URL = 'https://api.example.com';

export const searchInstruments: SearchFn = async (query, signal) => {
  const res = await fetch(`${API_URL}/instruments?q=${encodeURIComponent(query)}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as Instrument[];
};
```

### Решение на Zustand

```ts
// src/search/search.zustand.ts — фабрика: в тестах подставляем фейковый searchFn
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { searchInstruments } from './api';
import { type Instrument, type SearchFn, type SearchStatus, toMessage } from './types';

export type SearchState = {
  query: string;
  status: SearchStatus;
  results: Instrument[];
  error: string | null;
  search: (query: string) => Promise<void>;
};

export const createSearchStore = (searchFn: SearchFn) =>
  createStore<SearchState>()((set) => {
    let controller: AbortController | undefined; // не state: UI он не нужен
    return {
      query: '',
      status: 'idle',
      results: [],
      error: null,
      search: async (query) => {
        controller?.abort(); // старый запрос больше не нужен
        const current = (controller = new AbortController());
        set({ query, status: 'loading', error: null });
        try {
          const results = await searchFn(query, current.signal);
          if (!current.signal.aborted) set({ status: 'success', results }); // устаревший ответ игнорируем
        } catch (e) {
          if (!current.signal.aborted) set({ status: 'error', error: toMessage(e) });
        }
      },
    };
  });

export const searchStore = createSearchStore(searchInstruments);
export const useSearch = <T>(selector: (s: SearchState) => T) => useStore(searchStore, selector);
```

### Решение на MobX: `async` + `runInAction`

```ts
// src/search/search.mobx.ts
import { makeAutoObservable, runInAction } from 'mobx';
import { type Instrument, type SearchFn, type SearchStatus, toMessage } from './types';

export class SearchStore {
  query = '';
  status: SearchStatus = 'idle';
  results: Instrument[] = [];
  error: string | null = null;
  private controller: AbortController | undefined = undefined;

  constructor(private readonly searchFn: SearchFn) {
    // private-поля TS перечисляем в generic, чтобы выключить их из наблюдения
    makeAutoObservable<SearchStore, 'controller' | 'searchFn'>(
      this,
      { controller: false, searchFn: false },
      { autoBind: true },
    );
  }

  async search(query: string) {
    this.controller?.abort();
    const current = (this.controller = new AbortController());
    this.query = query; // до первого await мы ещё внутри action
    this.status = 'loading';
    this.error = null;
    try {
      const results = await this.searchFn(query, current.signal);
      // после await — уже вне action: оборачиваем в runInAction
      if (!current.signal.aborted) runInAction(() => { this.status = 'success'; this.results = results; });
    } catch (e) {
      if (!current.signal.aborted) runInAction(() => { this.status = 'error'; this.error = toMessage(e); });
    }
  }
}
```

### Решение на MobX: `flow` и `cancel()`

```ts
// src/search/search.flow.ts — вариант на flow: у промиса есть cancel()
import { type CancellablePromise, flowResult, isFlowCancellationError, makeAutoObservable } from 'mobx';
import { type Instrument, type SearchFn, type SearchStatus, toMessage } from './types';

export class FlowSearchStore {
  status: SearchStatus = 'idle';
  results: Instrument[] = [];
  error: string | null = null;
  private pending: CancellablePromise<void> | undefined = undefined;

  constructor(private readonly searchFn: SearchFn) {
    makeAutoObservable<FlowSearchStore, 'pending' | 'searchFn'>(
      this,
      { pending: false, searchFn: false },
      { autoBind: true },
    );
  }

  search(query: string): Promise<void> {
    this.pending?.cancel(); // генератор прерван, его finally отменит запрос
    const promise = (this.pending = flowResult(this.load(query))); // flowResult — только для типов TS
    return promise.catch((e) => {
      if (!isFlowCancellationError(e)) throw e;
    });
  }

  // генератор → makeAutoObservable сам сделает из него flow; yield вместо await, runInAction не нужен
  *load(query: string): Generator<Promise<Instrument[]>, void, Instrument[]> {
    const controller = new AbortController();
    this.status = 'loading';
    this.error = null;
    try {
      this.results = yield this.searchFn(query, controller.signal);
      this.status = 'success';
    } catch (e) {
      this.status = 'error';
      this.error = toMessage(e);
    } finally {
      controller.abort(); // если flow отменили — отменяем и fetch (после успеха abort ничего не делает)
    }
  }
}
```

### Тот же поиск на TanStack Query

Гонку здесь решает ключ запроса: компонент читает данные только своего `queryKey`, а устаревший запрос отменяется через `signal`.

```ts
// src/search/useInstrumentSearch.ts — то же на TanStack Query v5: результаты поиска — это server state
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { searchInstruments } from './api';

export function useInstrumentSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ['instruments', 'search', q],
    queryFn: ({ signal }) => searchInstruments(q, signal), // signal передан → Query сможет отменить запрос
    enabled: q.length > 0,
    staleTime: 60_000,
    placeholderData: keepPreviousData, // пока грузится новый запрос, показываем прошлые результаты
  });
}
```

### Тест: три реализации, один набор

```ts
// src/search/search.test.ts
import { FlowSearchStore } from './search.flow';
import { SearchStore } from './search.mobx';
import { createSearchStore } from './search.zustand';
import type { Instrument, SearchFn, SearchStatus } from './types';

function fakeApi() {
  const calls: { query: string; signal: AbortSignal; resolve: (r: Instrument[]) => void; reject: (e: Error) => void }[] = [];
  const searchFn: SearchFn = (query, signal) => {
    const { promise, resolve, reject } = Promise.withResolvers<Instrument[]>();
    calls.push({ query, signal, resolve, reject });
    return promise;
  };
  return { calls, searchFn };
}

type Adapter = { search(q: string): Promise<void>; read(): { status: SearchStatus; symbols: string[]; error: string | null } };

const impls: [string, (fn: SearchFn) => Adapter][] = [
  ['zustand', (fn) => {
    const store = createSearchStore(fn);
    const read = () => { const s = store.getState(); return { status: s.status, symbols: s.results.map((r) => r.symbol), error: s.error }; };
    return { search: (q) => store.getState().search(q), read };
  }],
  ['mobx', (fn) => {
    const store = new SearchStore(fn);
    return { search: store.search, read: () => ({ status: store.status, symbols: store.results.map((r) => r.symbol), error: store.error }) };
  }],
  ['mobx flow', (fn) => {
    const store = new FlowSearchStore(fn);
    return { search: store.search, read: () => ({ status: store.status, symbols: store.results.map((r) => r.symbol), error: store.error }) };
  }],
];

describe.each(impls)('search: %s', (_name, make) => {
  it('aborts the stale request and ignores its late response', async () => {
    const api = fakeApi();
    const s = make(api.searchFn);
    const first = s.search('AA');
    const second = s.search('AAPL');
    const [old, fresh] = api.calls;
    expect(old?.signal.aborted).toBe(true);
    fresh?.resolve([{ symbol: 'AAPL', name: 'Apple' }]);
    old?.resolve([{ symbol: 'AA', name: 'Alcoa' }]); // опоздавший ответ
    await Promise.all([first, second]);
    expect(s.read()).toEqual({ status: 'success', symbols: ['AAPL'], error: null });
  });

  it('shows an error for the current request', async () => {
    const api = fakeApi();
    const s = make(api.searchFn);
    const pending = s.search('TSLA');
    expect(s.read().status).toBe('loading');
    api.calls[0]?.reject(new Error('HTTP 503'));
    await pending;
    expect(s.read()).toEqual({ status: 'error', symbols: [], error: 'HTTP 503' });
  });
});
```

### Сравнение

| | Zustand | MobX: `async` + `runInAction` | MobX: `flow` |
|---|---|---|---|
| Асинхронность | обычный `async`, `set` в любой момент | после `await` — `runInAction`, иначе предупреждение strict mode | `yield`, обёртки не нужны |
| Отмена | `AbortController` в замыкании | `AbortController` в private-поле | `cancel()` прерывает генератор, `finally` вызывает `abort()` |
| Boilerplate | средний | средний + generic для private-полей | меньше обёрток, но `flowResult` и тип генератора |
| Тестируемость | фабрика + фейковый `searchFn` | DI через конструктор | то же |
| Ловушки | контроллер в state — несериализуемый state и лишние уведомления | private-поля без generic → ошибка TS в аннотациях; изменения после `await` без `runInAction` | без `flowResult` TS считает, что вернулся генератор; `cancel()` отклоняет промис `FlowCancellationError` — фильтруй `isFlowCancellationError` |

И общий вывод: **если данные приходят по HTTP и их можно кэшировать — бери `useQuery`, а не стор.** Стор из этой задачи нужен, чтобы понимать механику и уметь её объяснить.

**Ещё практика** (20 мин)

1. **Debounce 300 мс** (12 мин). Где он должен жить — в компоненте, в хуке или в сторе? Сделай в одном месте и объясни выбор. *Критерий:* тест на fake timers: 3 вызова за 100 мс → 1 запрос.
2. **Найди гонку** (8 мин). Убери проверку `aborted` в своей версии и попроси AI: «Найди гонку в этом сторе и опиши сценарий по шагам». *Критерий:* AI находит её, а ты воспроизводишь сценарий тестом.

**Самопроверка**

- Зачем нужна проверка `signal.aborted` после `await`, если уже есть `abort()`?
- Какая часть `async`-метода MobX выполняется внутри action?
- Зачем `flowResult` и что делает `cancel()` с генератором?
- Когда ты не стал бы писать этот стор, а взял бы `useQuery`?

**Готово, когда…** 6 тестов зелёные на трёх реализациях, и ты объясняешь гонку и обе защиты.

Дальше: [часть 4 — задачи 4–5: котировки в реальном времени и контроль ре-рендеров](05-state-management-zustand-mobx-part4.md).
