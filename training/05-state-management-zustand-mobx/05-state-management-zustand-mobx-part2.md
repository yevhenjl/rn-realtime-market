# Управление состоянием: одна задача — два решения (Zustand и MobX)

Обновлено: 2026-10-21 · Тренинг 5 из 6 · ≈ 16 часов · Вакансия: [карточка](../../card.ru.md)

[1](05-state-management-zustand-mobx.md) · Часть 2 из 7 · [3](05-state-management-zustand-mobx-part3.md) · [4](05-state-management-zustand-mobx-part4.md) · [5](05-state-management-zustand-mobx-part5.md) · [6](05-state-management-zustand-mobx-part6.md) · [7](05-state-management-zustand-mobx-part7.md)

## Задача 1. Watchlist: добавить, удалить, переставить (1 ч)

**Цель.** Простая задача, на которой видна разница моделей: новые ссылки против мутаций.

**Что повторить**

- Zustand: `set(fn)` — updater получает текущий state; вернул тот же объект — никого не уведомили ([updating state](https://zustand.docs.pmnd.rs/learn/guides/updating-state)). Middleware `immer` позволяет «мутировать» черновик ([immer](https://zustand.docs.pmnd.rs/reference/middlewares/immer)).
- MobX: `makeAutoObservable` — поля становятся observable, геттеры — `computed`, методы — actions (точнее, `autoAction`), генераторы — `flow`. `autoBind: true` — методы можно передавать как колбэки ([observable state](https://mobx.js.org/observable-state.html)).
- Правила домена (нормализация, валидный индекс) — в чистых функциях `src/watchlist/rules.ts` из блока 1. Они общие для всех реализаций.

**Условие.** Стор watchlist: `add(symbol)`, `remove(symbol)`, `move(from, to)`. Символ нормализуется (`' aapl '` → `'AAPL'`), дубликатов нет, неверные индексы игнорируются.

**Попробуй сам** (25 мин, без AI). Обе реализации и один набор тестов на обе.

*Критерии:* 1) дубликат и пустая строка не добавляются; 2) `move(2, 0)` переставляет, `move(0, 99)` ничего не делает; 3) в Zustand дубликат не вызывает `subscribe`-слушателя, в MobX — не запускает reaction; 4) удаление отсутствующего символа ничего не меняет. Потом — ревью у AI (промпт «Ревью решения» из [части 1](05-state-management-zustand-mobx.md)).

> ⛔ **Не подсматривай, пока не попробуешь.** Ниже — решения.

### Решение на Zustand

```ts
// src/watchlist/watchlist.zustand.ts
import { create } from 'zustand';
import { canMove, normalize } from './rules';

type WatchlistState = {
  symbols: string[];
  add: (raw: string) => void;
  remove: (raw: string) => void;
  move: (from: number, to: number) => void;
};

export const useWatchlist = create<WatchlistState>()((set) => ({
  symbols: [],
  add: (raw) =>
    set((s) => {
      const symbol = normalize(raw);
      if (!symbol || s.symbols.includes(symbol)) return s; // тот же state → подписчиков не будим
      return { symbols: [...s.symbols, symbol] };
    }),
  remove: (raw) =>
    set((s) => {
      const symbol = normalize(raw);
      return s.symbols.includes(symbol) ? { symbols: s.symbols.filter((x) => x !== symbol) } : s;
    }),
  move: (from, to) =>
    set((s) => {
      if (!canMove(s.symbols.length, from, to)) return s;
      const next = [...s.symbols];
      next.splice(to, 0, ...next.splice(from, 1));
      return { symbols: next };
    }),
}));
```

Вариант с immer: меньше копирования, та же семантика. Если рецепт ничего не изменил, Immer возвращает тот же объект — и подписчики снова молчат.

```ts
// src/watchlist/watchlist.immer.ts — вариант с immer: «мутируем» черновик, Immer делает копию
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { canMove, normalize } from './rules';

type State = {
  symbols: string[];
  add: (raw: string) => void;
  remove: (raw: string) => void;
  move: (from: number, to: number) => void;
};

export const useWatchlistImmer = create<State>()(
  immer((set) => ({
    symbols: [],
    add: (raw) =>
      set((draft) => {
        const symbol = normalize(raw);
        if (symbol && !draft.symbols.includes(symbol)) draft.symbols.push(symbol);
      }),
    remove: (raw) =>
      set((draft) => {
        const i = draft.symbols.indexOf(normalize(raw));
        if (i !== -1) draft.symbols.splice(i, 1);
      }),
    move: (from, to) =>
      set((draft) => {
        if (canMove(draft.symbols.length, from, to)) draft.symbols.splice(to, 0, ...draft.symbols.splice(from, 1));
      }),
  })),
);
```

### Решение на MobX

```ts
// src/watchlist/watchlist.mobx.ts
import { makeAutoObservable } from 'mobx';
import { canMove, normalize } from './rules';

export class WatchlistStore {
  symbols: string[] = [];

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true }); // autoBind: store.add можно передать как колбэк
  }

  add(raw: string) {
    const symbol = normalize(raw);
    if (symbol && !this.symbols.includes(symbol)) this.symbols.push(symbol);
  }

  remove(raw: string) {
    const i = this.symbols.indexOf(normalize(raw));
    if (i !== -1) this.symbols.splice(i, 1);
  }

  move(from: number, to: number) {
    if (canMove(this.symbols.length, from, to)) this.symbols.splice(to, 0, ...this.symbols.splice(from, 1));
  }
}
```

### Тест: один набор на все реализации

```ts
// src/watchlist/watchlist.test.ts — один набор тестов для всех реализаций
import { reaction } from 'mobx';
import { WatchlistStore } from './watchlist.mobx';
import { useWatchlistImmer } from './watchlist.immer';
import { useWatchlist } from './watchlist.zustand';

type Api = { add(s: string): void; remove(s: string): void; move(a: number, b: number): void; list(): string[] };

const fromZustand = (store: typeof useWatchlist | typeof useWatchlistImmer) => (): Api => {
  store.setState(store.getInitialState(), true); // сброс синглтона перед тестом
  const s = store.getState;
  return { add: (x) => s().add(x), remove: (x) => s().remove(x), move: (a, b) => s().move(a, b), list: () => s().symbols };
};
const fromMobx = (): Api => {
  const store = new WatchlistStore();
  return { add: store.add, remove: store.remove, move: store.move, list: () => store.symbols.slice() };
};

describe.each([
  ['zustand', fromZustand(useWatchlist)],
  ['zustand + immer', fromZustand(useWatchlistImmer)],
  ['mobx', fromMobx],
])('watchlist: %s', (_name, make) => {
  it('adds without duplicates and normalizes input', () => {
    const w = make();
    ['aapl', ' AAPL ', 'tsla', ''].forEach((x) => w.add(x));
    expect(w.list()).toEqual(['AAPL', 'TSLA']);
  });

  it('moves and removes; ignores invalid moves', () => {
    const w = make();
    ['AAPL', 'TSLA', 'NVDA'].forEach((x) => w.add(x));
    w.move(2, 0);
    w.move(0, 99);
    expect(w.list()).toEqual(['NVDA', 'AAPL', 'TSLA']);
    w.remove('aapl');
    w.remove('MSFT');
    expect(w.list()).toEqual(['NVDA', 'TSLA']);
  });
});

test('zustand: a duplicate does not notify subscribers', () => {
  fromZustand(useWatchlist)();
  const listener = jest.fn();
  const unsubscribe = useWatchlist.subscribe(listener);
  useWatchlist.getState().add('AAPL');
  useWatchlist.getState().add('aapl');
  useWatchlist.getState().remove('MSFT');
  expect(listener).toHaveBeenCalledTimes(1);
  unsubscribe();
});

test('mobx: a duplicate does not trigger reactions', () => {
  const store = new WatchlistStore();
  const effect = jest.fn();
  const dispose = reaction(() => store.symbols.slice(), effect);
  store.add('AAPL');
  store.add('aapl');
  expect(effect).toHaveBeenCalledTimes(1);
  dispose();
});
```

### Сравнение

| | Zustand | MobX |
|---|---|---|
| Изменение | новый массив; no-op — вернуть тот же `s` | `push` / `splice` внутри action |
| Ре-рендеры | компоненты, чей селектор вернул новое значение (`s.symbols` — новая ссылка) | `observer`, который читал массив (длину, элементы) |
| Boilerplate | копирование массивов; immer его убирает | меньше: класс и `makeAutoObservable` |
| Тестируемость | `getState()`; синглтон сбрасывай перед тестом | `new WatchlistStore()` на тест |
| Ловушки | `s.symbols.push(x); return s` — мутация без новой ссылки, UI не обновится; `filter` без проверки — новая ссылка без изменений | FlatList с `data={store.symbols}` не обновится: FlatList не observer → передавай `slice()`; строка в `renderItem` — тоже `observer` (задача 9) |

**Ещё практика** (15 мин)

1. Попроси AI предложить `replaceAll(symbols)` и `clear()` для обеих реализаций — но тесты напиши сам и заранее. *Критерий:* тесты общие для трёх реализаций, без копипасты.
2. Лимит 50 символов. Где проверка — в правилах или в сторе? *Критерий:* правило в `rules.ts`, обе реализации используют его.

**Самопроверка**

- Почему `return s` в Zustand-updater не будит подписчиков, а `return {}` будит?
- Зачем `autoBind: true` в MobX и что сломается без него в тесте?
- Что сделает Immer, если рецепт ничего не изменил?

**Готово, когда…** 8 тестов зелёные на трёх реализациях, и ты объясняешь каждую строку сравнения.

## Задача 2. Портфель и P&L: производные значения и деньги (1,5 ч)

**Цель.** Посчитать стоимость портфеля и P&L из позиций и живых цен — без float-ошибок и без лишних пересчётов.

**Что повторить**

- `0.1 + 0.2 !== 0.3`, а `(1.005).toFixed(2) === '1.00'`. Деньги — десятичные строки из API и decimal.js (или целые минимальные единицы). Формулы, правило округления и «что считает сервер» — в [тренинге 2, блок 5](../02-trading-app-architecture/02-trading-app-architecture-part2.md).
- Чистая функция `summarize` общая для обоих сторов: математика не зависит от библиотеки состояния.
- Zustand: селектор выполняется для каждого подписанного компонента на каждое изменение стора. Тяжёлый расчёт мемоизируй по ссылкам входов, а из компонента выбирай примитив.
- MobX: `computed` пересчитывается, только если изменились прочитанные observable. `observable.map().get(key)` подписывает на конкретный ключ. `computedStruct` не будит наблюдателей, если результат структурно равен прошлому; `observableRef` следит только за заменой ссылки ([computeds](https://mobx.js.org/computeds.html)).

**Условие.** Позиции `{ symbol, qty, avgPrice }` (строки) и последние цены, которые приходят пачками. Нужно: стоимость, P&L, P&L в процентах и список символов без цены — их не считаем нулём.

**Попробуй сам** (35 мин, без AI)

*Критерии:* 1) AAPL 10 × 150.10 при цене 155.35 и BTC 0.5 × 60000 при 61234.56 → стоимость `32170.78`, P&L `669.78`, процент `2.13`; 2) символ без цены попадает в `missing`; 3) Zustand: повторный вызов селектора без изменений стора возвращает тот же объект; 4) MobX: тик символа не из портфеля не запускает reaction на `summary`.

> ⛔ **Не подсматривай, пока не попробуешь.** Ниже — решения.

### Общая математика

```ts
// src/portfolio/money.ts — чистая математика, без стора: её тестируем отдельно
import Decimal from 'decimal.js';

export type Position = { symbol: string; qty: string; avgPrice: string }; // десятичные строки из API
export type Summary = { value: string; pnl: string; pnlPct: string | null; missing: string[] };

// Цена передаётся функцией: Zustand даст s.prices[symbol], MobX — map.get(symbol)
export function summarize(positions: readonly Position[], priceOf: (symbol: string) => string | undefined): Summary {
  let value = new Decimal(0);
  let cost = new Decimal(0);
  const missing: string[] = [];
  for (const p of positions) {
    const price = priceOf(p.symbol);
    if (price === undefined) {
      missing.push(p.symbol); // нет цены — не считаем 0, а показываем «—»
      continue;
    }
    value = value.plus(new Decimal(p.qty).times(price));
    cost = cost.plus(new Decimal(p.qty).times(p.avgPrice));
  }
  const pnl = value.minus(cost);
  return {
    value: value.toFixed(2), // округляем только на выходе (ROUND_HALF_UP по умолчанию)
    pnl: pnl.toFixed(2),
    pnlPct: cost.isZero() ? null : pnl.div(cost).times(100).toFixed(2),
    missing,
  };
}
```

### Решение на Zustand

```ts
// src/portfolio/portfolio.zustand.ts
import { create } from 'zustand';
import { type Position, type Summary, summarize } from './money';

type PortfolioState = {
  positions: Position[];
  prices: Record<string, string>;
  setPositions: (positions: Position[]) => void;
  applyPrices: (batch: Record<string, string>) => void;
};

export const usePortfolio = create<PortfolioState>()((set) => ({
  positions: [],
  prices: {},
  setPositions: (positions) => set({ positions }),
  applyPrices: (batch) => set((s) => ({ prices: { ...s.prices, ...batch } })),
}));

// Мемоизация по ссылкам входов: один пересчёт на изменение стора, а не на каждый компонент
let memo: { positions: Position[]; prices: Record<string, string>; result: Summary } | undefined;

export const selectSummary = (s: PortfolioState): Summary => {
  if (memo?.positions !== s.positions || memo.prices !== s.prices) {
    memo = { positions: s.positions, prices: s.prices, result: summarize(s.positions, (sym) => s.prices[sym]) };
  }
  return memo.result;
};

// Компонент выбирает примитив → перерисовка только когда меняется сама строка
export const useTotalValue = () => usePortfolio((s) => selectSummary(s).value);
export const useTotalPnl = () => usePortfolio((s) => selectSummary(s).pnl);
```

### Решение на MobX

```ts
// src/portfolio/portfolio.mobx.ts
import { computedStruct, makeAutoObservable, observable, observableRef } from 'mobx';
import { type Position, type Summary, summarize } from './money';

export class PortfolioStore {
  positions: Position[] = [];
  readonly prices = observable.map<string, string>();

  constructor() {
    makeAutoObservable(this, {
      positions: observableRef, // данные API иммутабельны: следим только за заменой массива
      summary: computedStruct, // результат структурно равен прошлому → наблюдателей не будим
    });
  }

  setPositions(positions: Position[]) {
    this.positions = positions;
  }

  applyPrices(batch: Record<string, string>) {
    this.prices.merge(batch);
  }

  // computed читает prices.get() только для своих символов → тик чужого символа не пересчитывает
  get summary(): Summary {
    return summarize(this.positions, (symbol) => this.prices.get(symbol));
  }
}
```

### Тест

```ts
// src/portfolio/portfolio.test.ts
import { reaction } from 'mobx';
import { summarize, type Position } from './money';
import { PortfolioStore } from './portfolio.mobx';
import { selectSummary, usePortfolio } from './portfolio.zustand';

const positions: Position[] = [
  { symbol: 'AAPL', qty: '10', avgPrice: '150.10' },
  { symbol: 'BTC', qty: '0.5', avgPrice: '60000' },
];

test('float vs decimal', () => {
  expect(0.1 + 0.2).not.toBe(0.3);
  expect((1.005).toFixed(2)).toBe('1.00'); // в float 1.005 — это 1.00499999…
  expect(summarize([{ symbol: 'X', qty: '1', avgPrice: '1' }], () => '1.005').value).toBe('1.01');
});

test('summary: value, P&L, missing prices', () => {
  const prices: Record<string, string> = { AAPL: '155.35', BTC: '61234.56' };
  expect(summarize(positions, (s) => prices[s])).toEqual({
    value: '32170.78', pnl: '669.78', pnlPct: '2.13', missing: [],
  });
  expect(summarize(positions, (s) => (s === 'AAPL' ? '155.35' : undefined)).missing).toEqual(['BTC']);
});

test('zustand: memoized selector', () => {
  usePortfolio.setState(usePortfolio.getInitialState(), true);
  const { setPositions, applyPrices } = usePortfolio.getState();
  setPositions(positions);
  applyPrices({ AAPL: '155.35', BTC: '61234.56' });
  const first = selectSummary(usePortfolio.getState());
  expect(selectSummary(usePortfolio.getState())).toBe(first); // тот же объект: пересчёта нет
  applyPrices({ TSLA: '250.00' }); // чужой символ: prices новый → пересчёт, но value тот же
  expect(selectSummary(usePortfolio.getState())).not.toBe(first);
  expect(selectSummary(usePortfolio.getState()).value).toBe(first.value);
});

test('mobx: reaction fires only when summary really changes', () => {
  const store = new PortfolioStore();
  store.setPositions([{ symbol: 'AAPL', qty: '1', avgPrice: '150' }]);
  const effect = jest.fn();
  const dispose = reaction(() => store.summary, effect);
  store.applyPrices({ AAPL: '155.351' });
  expect(effect).toHaveBeenCalledTimes(1);
  store.applyPrices({ TSLA: '250' }); // чужой символ: computed даже не пересчитывается
  store.applyPrices({ AAPL: '155.352' }); // пересчёт есть, но value всё ещё 155.35 → computedStruct молчит
  expect(effect).toHaveBeenCalledTimes(1);
  expect(store.summary.value).toBe('155.35');
  dispose();
});
```

### Сравнение

| | Zustand | MobX |
|---|---|---|
| Пересчёт | на каждое изменение `positions` или `prices`, даже по чужому символу; мемо спасает от пересчёта в каждом компоненте | только когда меняется цена символа из портфеля или сами позиции |
| Ре-рендеры | компонент выбирает строку `value` → перерисовка только при смене строки | `observer` читает `summary.value`; `computedStruct` гасит структурно равные результаты |
| Boilerplate | ручная мемоизация (или `createSelector` из Reselect / RTK) | геттер и одна аннотация |
| Тестируемость | селектор — чистая функция от state | reaction и счётчик вызовов |
| Ловушки | `usePortfolio((s) => summarize(…))` без мемо возвращает новый объект → бесконечный цикл (проверено, см. задачу 5); мемо на уровне модуля — одно на все экземпляры стора | `computed` вне реактивного контекста пересчитывается на каждое чтение; без `observableRef` массив позиций глубоко превращается в observable — лишняя работа |

**Ещё практика** (25 мин)

1. **P&L по позиции** (15 мин). Zustand — хук `usePositionPnl(symbol)`, который возвращает строку. MobX — метод или `computed` внутри строки ([computeds with arguments](https://mobx.js.org/computeds-with-args.html); `computedFn` из `mobx-utils` пока объявляет peer `mobx ^6`). *Критерий:* тик AAPL не перерисовывает строку BTC — проверь счётчиком рендеров из задачи 5.
2. **Неудобные числа** (10 мин). Попроси AI 10 граничных случаев для `summarize` — без кода — и добавь их в тест. *Критерий:* все зелёные или есть объяснение, почему кейс некорректен.

**Самопроверка**

- Почему отсутствующую цену нельзя считать нулём?
- Почему в Zustand из компонента лучше выбрать строку, а не весь `Summary`?
- Почему в MobX тик чужого символа не пересчитывает `summary`?
- Где округлять — в каждом шаге расчёта или на выходе?

**Готово, когда…** 4 теста зелёные, и ты объясняешь разницу «пересчёт» и «перерисовка» в обеих моделях.

Дальше: [часть 3 — задача 3: загрузка, ошибки и отмена запросов](05-state-management-zustand-mobx-part3.md).
