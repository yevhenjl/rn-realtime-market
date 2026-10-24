# Управление состоянием: одна задача — два решения (Zustand и MobX)

Обновлено: 2026-10-21 · Тренинг 5 из 6 · ≈ 16 часов · Вакансия: [карточка](../../card.ru.md)

[1](05-state-management-zustand-mobx.md) · [2](05-state-management-zustand-mobx-part2.md) · [3](05-state-management-zustand-mobx-part3.md) · Часть 4 из 7 · [5](05-state-management-zustand-mobx-part5.md) · [6](05-state-management-zustand-mobx-part6.md) · [7](05-state-management-zustand-mobx-part7.md)

## Задача 4. Котировки в реальном времени: пачки и conflation (1,5 ч)

**Цель.** Сотни обновлений в секунду из WebSocket — без перерисовки всего списка.

**Что повторить**

- Не делай `set` на каждое сообщение. Буфер и flush раз в 100–250 мс; по каждому символу храним только последний тик (conflation). 1000 тиков → одно обновление стора.
- Сокет и буфер живут вне React (сервис), стор обновляется пачкой, строка списка подписана только на свой символ.
- Zustand: пачка — один `set`; неизменённые символы сохраняют свои ссылки, их строки не перерисуются.
- MobX: пачка — один action (`merge`); `observable.map` отслеживает каждый ключ отдельно; `{ deep: false }` — не превращать каждую котировку в observable-объект.
- Подключение, переподключение и heartbeat — в [тренинге 6](../06-websocket-demo-binance/06-websocket-demo-binance.md) и в [подготовке по WebSocket](../../../../../interview-prep/technical/websockets.ru.md). Вспышка цены — анимация Reanimated на UI-потоке ([тренинг 4](../04-animations-reanimated-skia/04-animations-reanimated-skia.md)).

**Условие.** Поток тиков `{ symbol, price, ts }`. Нужен общий conflator и два стора котировок. Строка списка — компонент, подписанный только на свою цену.

**Попробуй сам** (35 мин, без AI)

*Критерии:* 1) 1000 тиков по 3 символам за 100 мс → один flush с 3 записями, у каждой последняя цена; 2) старый тик (меньший `ts`) не перетирает новый в буфере; 3) 50 тиков AAPL → строка AAPL перерисовалась 1 раз, TSLA и NVDA — ни разу (считай через `<Profiler>`); 4) `dispose()` останавливает таймер.

> ⛔ **Не подсматривай, пока не попробуешь.** Ниже — решения.

### Общий conflator и сокет

```ts
// src/realtime/conflator.ts — не зависит от стора: Zustand и MobX используют один и тот же
export type Quote = { symbol: string; price: string; ts: number };

// Копит тики и отдаёт пачкой раз в intervalMs; по символу — только последний тик (conflation)
export function createConflator(onFlush: (batch: Map<string, Quote>) => void, intervalMs = 100) {
  let pending = new Map<string, Quote>();
  const timer = setInterval(() => {
    if (pending.size === 0) return;
    const batch = pending;
    pending = new Map();
    onFlush(batch);
  }, intervalMs);
  return {
    push(q: Quote) {
      const prev = pending.get(q.symbol);
      if (!prev || q.ts >= prev.ts) pending.set(q.symbol, q); // опоздавший старый тик не перетирает новый
    },
    dispose() {
      clearInterval(timer);
      pending.clear();
    },
  };
}
```

```ts
// src/realtime/startQuotes.ts — сокет живёт вне React; переподключение и heartbeat — в тренинге 6
import type { Quote } from './conflator';

type TradeMessage = { s: string; p: string; T: number }; // поля trade stream Binance: symbol, price, time

export function startQuotes(url: string, push: (q: Quote) => void): () => void {
  const ws = new WebSocket(url);
  ws.onmessage = (e) => {
    const m = JSON.parse(String(e.data)) as TradeMessage; // в проде — проверка схемой
    push({ symbol: m.s, price: m.p, ts: m.T });
  };
  return () => ws.close();
}
```

Подключение в приложении: `const c = createConflator(useQuotes.getState().applyBatch)` и `startQuotes(url, c.push)`; для MobX — `createConflator(quotes.applyBatch)`, где `quotes` — экземпляр `QuotesStore` (метод привязан благодаря `autoBind`).

### Решение на Zustand

```ts
// src/realtime/quotes.zustand.ts
import { create } from 'zustand';
import type { Quote } from './conflator';

type QuotesState = {
  bySymbol: Record<string, Quote>;
  applyBatch: (batch: Map<string, Quote>) => void;
};

export const useQuotes = create<QuotesState>()((set) => ({
  bySymbol: {},
  // пачка → один set → одно уведомление; неизменённые символы сохраняют свои ссылки
  applyBatch: (batch) => set((s) => ({ bySymbol: { ...s.bySymbol, ...Object.fromEntries(batch) } })),
}));

// строка подписана только на цену своего символа (строка → сравнение по значению)
export const usePrice = (symbol: string) => useQuotes((s) => s.bySymbol[symbol]?.price);
```

### Решение на MobX

```ts
// src/realtime/quotes.mobx.ts
import { makeAutoObservable, observable } from 'mobx';
import type { Quote } from './conflator';

export class QuotesStore {
  // deep: false — котировки иммутабельны: не превращаем каждую в observable-объект
  readonly bySymbol = observable.map<string, Quote>({}, { deep: false });

  constructor() {
    // price: false — это чтение, а не action: иначе каждый рендер попадёт в spy как «action»
    makeAutoObservable(this, { bySymbol: false, price: false }, { autoBind: true });
  }

  applyBatch(batch: Map<string, Quote>) {
    this.bySymbol.merge(batch); // один action → одна волна реакций
  }

  price(symbol: string) {
    return this.bySymbol.get(symbol)?.price; // в observer подписывает только на этот ключ
  }
}
```

### Строки списка

```tsx
// src/realtime/QuoteRow.tsx
import { observer } from 'mobx-react-lite';
import { memo } from 'react';
import { Text } from 'react-native';
import type { QuotesStore } from './quotes.mobx';
import { usePrice } from './quotes.zustand';

// Zustand: memo — чтобы перерисовка родителя (новый watchlist) не трогала строки
export const ZQuoteRow = memo(function ZQuoteRow({ symbol }: { symbol: string }) {
  const price = usePrice(symbol);
  return <Text>{`${symbol} ${price ?? '—'}`}</Text>;
});

// MobX: observer уже включает memo и подписан только на прочитанный ключ map
export const MQuoteRow = observer(function MQuoteRow({ store, symbol }: { store: QuotesStore; symbol: string }) {
  return <Text>{`${symbol} ${store.price(symbol) ?? '—'}`}</Text>;
});
```

### Тест

```tsx
// src/realtime/realtime.test.tsx
import { Profiler, type ProfilerOnRenderCallback } from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { createConflator, type Quote } from './conflator';
import { QuotesStore } from './quotes.mobx';
import { useQuotes } from './quotes.zustand';
import { MQuoteRow, ZQuoteRow } from './QuoteRow';

const SYMBOLS = ['AAPL', 'TSLA', 'NVDA'];
const tick = (symbol: string, i: number): Quote => ({ symbol, price: (100 + i).toFixed(2), ts: i });

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('conflation: 1000 ticks → one batch with the latest tick per symbol', () => {
  const onFlush = jest.fn();
  const c = createConflator(onFlush, 100);
  for (let i = 0; i < 1000; i++) c.push(tick(SYMBOLS[i % 3]!, i));
  c.push(tick('AAPL', 5)); // старый тик пришёл поздно
  jest.advanceTimersByTime(100);
  expect(onFlush).toHaveBeenCalledTimes(1);
  const batch: Map<string, Quote> = onFlush.mock.calls[0][0];
  expect(batch.get('AAPL')?.price).toBe('1099.00');
  expect(batch.size).toBe(3);
  c.dispose();
});

describe.each([
  ['zustand', () => {
    useQuotes.setState(useQuotes.getInitialState(), true);
    return { applyBatch: useQuotes.getState().applyBatch, Row: ({ symbol }: { symbol: string }) => <ZQuoteRow symbol={symbol} /> };
  }],
  ['mobx', () => {
    const store = new QuotesStore();
    return { applyBatch: store.applyBatch, Row: ({ symbol }: { symbol: string }) => <MQuoteRow store={store} symbol={symbol} /> };
  }],
])('rows: %s', (_name, setup) => {
  it('a burst of AAPL ticks re-renders only the AAPL row, once', async () => {
    const { applyBatch, Row } = setup();
    const c = createConflator(applyBatch, 100);
    const renders: Record<string, number> = {};
    const onRender: ProfilerOnRenderCallback = (id) => { renders[id] = (renders[id] ?? 0) + 1; };
    await render(<>{SYMBOLS.map((s) => <Profiler key={s} id={s} onRender={onRender}><Row symbol={s} /></Profiler>)}</>);
    await act(() => {
      for (let i = 0; i < 50; i++) c.push(tick('AAPL', i));
      jest.advanceTimersByTime(100);
    });
    expect(screen.getByText('AAPL 149.00')).toBeTruthy();
    expect(renders).toEqual({ AAPL: 2, TSLA: 1, NVDA: 1 }); // mount + одно обновление
    c.dispose();
  });
});
```

### Сравнение

| | Zustand | MobX |
|---|---|---|
| Применение пачки | копия `bySymbol` — O(n) на flush, при 4–10 flush в секунду это дёшево | `merge` в map: трогаются только изменённые ключи |
| Кого будим | селекторы всех подписанных строк выполняются, перерисовываются только изменившиеся | только `observer` изменённых ключей |
| Boilerplate | минимальный | минимальный, но `deep: false` и `price: false` надо знать |
| Тестируемость | fake timers + `<Profiler>` | то же |
| Ловушки | селектор `s.bySymbol` целиком → каждая строка рендерится на каждый flush; `set` на каждый тик | без `deep: false` каждая котировка — observable-объект (память, CPU); строка в `renderItem` без `observer` не обновится |

Для 10 000+ символов в Zustand думай о разбиении: отдельные сторы по экранам или подписка строки вне React. Для типичного watchlist на 20–200 символов хватает схемы выше.

**Ещё практика** (20 мин)

1. **Интервал или кадр** (10 мин). Сравни flush через `setInterval` и через `requestAnimationFrame`. Что лучше для 60 FPS и для разряда батареи? Попроси AI аргументы против своего выбора. *Критерий:* 3 аргумента «за» и 2 «против» своими словами.
2. **Устаревшая цена** (10 мин). Если по символу нет тика 5 секунд — строка серая. Где хранить время последнего тика и кто проверяет время? *Критерий:* один таймер на весь стор, не по таймеру на строку.

**Самопроверка**

- Почему 1000 `set` в секунду плохо, даже если строки мемоизированы?
- Чем conflation отличается от throttle?
- Почему в Zustand неизменённые строки не перерисуются после `{ ...s.bySymbol, ...batch }`?
- Зачем `deep: false` в MobX?

**Готово, когда…** 3 теста зелёные, и ты рисуешь путь тика: сокет → conflator → стор → строка.

## Задача 5. Контроль ре-рендеров и замеры (1,5 ч)

**Цель.** Находить и чинить лишние ре-рендеры — и доказывать это цифрами.

**Что повторить**

- Zustand: `useStore()` без селектора — подписка на весь стор. Селектор, возвращающий новый объект или массив, в v5 даёт бесконечный цикл (`Maximum update depth exceeded`): `useSyncExternalStore` требует стабильный снимок. Лечится атомарными селекторами (по примитиву на вызов) или `useShallow` ([useShallow](https://zustand.docs.pmnd.rs/learn/guides/prevent-rerenders-with-use-shallow), [миграция на v5](https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5)).
- MobX: `observer` на каждом компоненте, который читает observable; «разыменовывай поздно» — передавай объект, а поле читай в самом нижнем компоненте ([React optimizations](https://mobx.js.org/react-optimizations.html)). В Redux принято наоборот: выбирать примитивы рано. `observer` уже включает `memo`.
- Замеры: React Native DevTools (`j` в терминале Metro или Dev Menu → Open DevTools) → Profiler: запиши взаимодействие и посмотри flamegraph; в настройках — «Highlight updates when components render» ([RN DevTools](https://reactnative.dev/docs/react-native-devtools)). В коде и тестах — `<Profiler onRender>` ([Profiler](https://react.dev/reference/react/Profiler)) или счётчик рендеров.
- React Compiler (в Expo — флаг `experiments.reactCompiler`; в шаблоне SDK 58 он уже включён — проверено в [тренинге 6](../06-websocket-demo-binance/06-websocket-demo-binance.md)) мемоизирует компоненты, но гранулярность подписки на стор не исправит. С MobX осторожно: документация React предупреждает, что `observer` ломает предположения мемоизации; если компонент перестал обновляться — `"use no memo"` в нём ([incompatible libraries](https://react.dev/reference/eslint-plugin-react-hooks/lints/incompatible-library)).

**Условие.** Шапка счёта показывает `cash` и `equity`. В том же сторе есть `heartbeatAt` — он меняется каждую секунду. Шапка не должна перерисовываться от heartbeat. На MobX ещё сравни экраны с «ранним» и «поздним» разыменованием.

**Попробуй сам** (30 мин, без AI)

*Критерии:* 1) тест доказывает, что heartbeat не перерисовывает шапку; 2) воспроизведи `Maximum update depth exceeded` и почини двумя способами; 3) MobX: при смене `cash` экран с поздним разыменованием не перерисовывается — перерисовывается только текст.

> ⛔ **Не подсматривай, пока не попробуешь.** Ниже — решения.

### Счётчик рендеров

> ⚠️ В шаблоне Expo SDK 58 включены React Compiler и ESLint `react-hooks` v7: запись в `ref.current` во время рендера — ошибка линтера. Счётчик ниже подходит для песочницы этого тренинга; в проекте на шаблоне SDK 58 считай рендеры через `<Profiler onRender>` (так сделано в [тренинге 6](../06-websocket-demo-binance/06-websocket-demo-binance-part6.md)).

```ts
// src/rerenders/useRenderCount.ts — простой счётчик рендеров для отладки
import { useRef } from 'react';

export const renderCounts = new Map<string, number>();

export function useRenderCount(name: string) {
  const count = useRef(0);
  count.current += 1;
  if (__DEV__) renderCounts.set(name, count.current); // в проде не пишем
}
```

### Решение на Zustand

```tsx
// src/rerenders/account.zustand.tsx
import { Text } from 'react-native';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

type AccountState = {
  cash: string;
  equity: string;
  heartbeatAt: number; // меняется каждую секунду, но UI шапки он не нужен
  beat: (at: number) => void;
  setCash: (cash: string) => void;
};

export const useAccount = create<AccountState>()((set) => ({
  cash: '1000.00',
  equity: '1000.00',
  heartbeatAt: 0,
  beat: (at) => set({ heartbeatAt: at }),
  setCash: (cash) => set({ cash }),
}));

// ❌ селектор каждый раз возвращает новый объект → в v5 бесконечный цикл
export function BadHeader() {
  const { cash, equity } = useAccount((s) => ({ cash: s.cash, equity: s.equity }));
  return <Text>{`${cash} / ${equity}`}</Text>;
}

// ⚠️ без селектора — подписка на весь стор: перерисовка на каждый heartbeat
export function GreedyHeader() {
  const { cash, equity } = useAccount();
  return <Text>{`${cash} / ${equity}`}</Text>;
}

// ✅ useShallow: если поля поверхностно равны, возвращается прошлый объект
export function ShallowHeader() {
  const { cash, equity } = useAccount(useShallow((s) => ({ cash: s.cash, equity: s.equity })));
  return <Text>{`${cash} / ${equity}`}</Text>;
}

// ✅ или атомарные селекторы: каждый возвращает примитив
export function AtomicHeader() {
  const cash = useAccount((s) => s.cash);
  const equity = useAccount((s) => s.equity);
  return <Text>{`${cash} / ${equity}`}</Text>;
}
```

### Решение на MobX

```tsx
// src/rerenders/account.mobx.tsx
import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';
import { Text, View } from 'react-native';
import { useRenderCount } from './useRenderCount';

export class AccountStore {
  cash = '1000.00';
  equity = '1000.00';
  heartbeatAt = 0;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  beat(at: number) {
    this.heartbeatAt = at;
  }

  setCash(cash: string) {
    this.cash = cash;
  }
}

// observer подписан только на прочитанные поля: heartbeatAt не читаем → не перерисовываемся
export const MHeader = observer(function MHeader({ account }: { account: AccountStore }) {
  useRenderCount('MHeader');
  return <Text>{`${account.cash} / ${account.equity}`}</Text>;
});

// «Разыменовывай поздно»: передаём стор, значение читает самый нижний компонент
const CashText = observer(function CashText({ account }: { account: AccountStore }) {
  useRenderCount('CashText');
  return <Text>{account.cash}</Text>;
});

export const LateScreen = observer(function LateScreen({ account }: { account: AccountStore }) {
  useRenderCount('LateScreen');
  return <View><CashText account={account} /></View>; // сам экран cash не читает
});

// Экран сам читает cash → при смене cash перерисовывается весь экран
export const EarlyScreen = observer(function EarlyScreen({ account }: { account: AccountStore }) {
  useRenderCount('EarlyScreen');
  return <View><Text>{account.cash}</Text></View>;
});
```

### Тест: `<Profiler>` и счётчик

```tsx
// src/rerenders/rerenders.test.tsx — считаем рендеры: <Profiler> и useRenderCount
import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from 'react';
import { act, render } from '@testing-library/react-native';
import { AccountStore, EarlyScreen, LateScreen, MHeader } from './account.mobx';
import { AtomicHeader, BadHeader, GreedyHeader, ShallowHeader, useAccount } from './account.zustand';
import { renderCounts } from './useRenderCount';

const commits: Record<string, number> = {};
const onRender: ProfilerOnRenderCallback = (id) => { commits[id] = (commits[id] ?? 0) + 1; };
const measure = (id: string, node: ReactNode) => <Profiler id={id} onRender={onRender}>{node}</Profiler>;

beforeEach(() => {
  for (const k of Object.keys(commits)) delete commits[k];
  renderCounts.clear();
  useAccount.setState(useAccount.getInitialState(), true);
});

test('zustand v5: a selector that returns a new object loops forever', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  await expect(render(<BadHeader />)).rejects.toThrow(/Maximum update depth exceeded/);
  jest.restoreAllMocks();
});

test('zustand: a heartbeat re-renders only the greedy header', async () => {
  await render(<>{measure('greedy', <GreedyHeader />)}{measure('shallow', <ShallowHeader />)}{measure('atomic', <AtomicHeader />)}</>);
  await act(() => useAccount.getState().beat(1));
  await act(() => useAccount.getState().beat(2));
  expect(commits).toEqual({ greedy: 3, shallow: 1, atomic: 1 });
  await act(() => useAccount.getState().setCash('900.00'));
  expect(commits).toEqual({ greedy: 4, shallow: 2, atomic: 2 });
});

test('mobx: observer tracks only what it reads; dereference late', async () => {
  const account = new AccountStore();
  await render(<><MHeader account={account} /><LateScreen account={account} /><EarlyScreen account={account} /></>);
  await act(() => account.beat(1));
  await act(() => account.setCash('900.00'));
  expect(Object.fromEntries(renderCounts)).toEqual({ MHeader: 2, LateScreen: 1, CashText: 2, EarlyScreen: 2 });
});
```

### Сравнение

| | Zustand | MobX |
|---|---|---|
| Кто решает | ты: селектор и сравнение | библиотека: что прочитано в рендере |
| Типичный лишний рендер | подписка на весь стор; объект из селектора без `useShallow` | поле читает родитель, а не ребёнок |
| Инструменты | атомарные селекторы, `useShallow`, мемо-селекторы | мелкие `observer`, позднее разыменование, `computed` |
| Замеры | Profiler, счётчик, `subscribe` | то же + `getDependencyTree` (задача 10) |
| Ловушки | бесконечный цикл в v5; `useShallow` сравнивает поверхностно — вложенные объекты с новыми ссылками всё равно перерисуют | забытый `observer`; React Compiler; `observableRequiresReaction` в dev с React 19.2+ сыплет предупреждениями ([configuration](https://mobx.js.org/configuration.html)) |

**Ещё практика** (25 мин)

1. **Профиль реального экрана** (20 мин). В любом своём проекте на React Native запиши профиль одного экрана в RN DevTools, найди один лишний ре-рендер, почини и запиши профиль снова. Попроси AI объяснить flamegraph, но вывод сделай сам. *Критерий:* два скриншота «до» и «после» и одно предложение: что было и почему.
2. **Вопрос интервьюера** (5 мин). Ответь вслух за 60 секунд: «Как ты ищешь лишние ре-рендеры в React Native?» *Критерий:* назвал инструмент, метрику и способ починки.

**Самопроверка**

- Почему селектор с объектом в Zustand 5 падает, а в Zustand 4 «просто» перерисовывал на каждое изменение?
- Что делает `useShallow` внутри?
- Почему MobX советует передавать объект, а Redux — примитив?
- Как увидеть ре-рендеры в React Native без единой строки кода?

**Готово, когда…** 3 теста зелёные, и ты показываешь лишний ре-рендер в профайлере и объясняешь, как его убрать в обеих библиотеках.

Дальше: [часть 5 — задачи 6–7: persistence и оптимистичный ордер](05-state-management-zustand-mobx-part5.md).
