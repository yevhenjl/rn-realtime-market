# JavaScript и TypeScript: вопросы и задачи

Обновлено: 2026-10-21 · Тренинг 1 из 6 · ≈ 16 часов · Вакансия: [карточка](../../card.ru.md)

Часть 6 из 6 · [часть 1](01-javascript-typescript.md) · [часть 2](01-javascript-typescript-part2.md) · [часть 3](01-javascript-typescript-part3.md) · [часть 4](01-javascript-typescript-part4.md) · [часть 5](01-javascript-typescript-part5.md) · [ответы](../01-javascript-typescript-answers/01-javascript-typescript-answers.md)

Правила те же, что в [части 1](01-javascript-typescript.md#как-тренироваться-с-ai). Хуки тестируй в любом своём RN-проекте: Jest, `@testing-library/react-native` (`renderHook`, `act`), `jest.useFakeTimers()`.

## Блок 8. React и React Native глазами фронтенд-интервьюера (1,5 ч)

**Цель:** объяснять, как React рендерит и когда перерисовывает; писать хуки без stale closure; находить ошибки в чужом компоненте; коротко и точно говорить о New Architecture.

**Что повторить**

- Версии на 2026-10: React 19.3 (2026-09-09; `<ViewTransition>` и Fragment Refs стабильны, пока только в DOM); React 19.2 (2025-10-01; `useEffectEvent`, `<Activity>`); React Compiler 1.0 (2025-10-07); React Native 0.88 (2026-10-19; React 19.3, обработка событий через W3C `EventTarget` с фазами capture и bubble); RN 0.84 — Hermes V1 по умолчанию; RN 0.82 — только New Architecture.
- react.dev: [render и commit](https://react.dev/learn/render-and-commit), [сохранение и сброс состояния](https://react.dev/learn/preserving-and-resetting-state), [synchronizing with effects](https://react.dev/learn/synchronizing-with-effects), [you might not need an effect](https://react.dev/learn/you-might-not-need-an-effect), [separating events from effects](https://react.dev/learn/separating-events-from-effects), [useEffectEvent](https://react.dev/reference/react/useEffectEvent), [useRef](https://react.dev/reference/react/useRef) (не читай и не пиши `ref.current` во время рендера, кроме ленивой инициализации), [useState: storing information from previous renders](https://react.dev/reference/react/useState), [useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore), [memo](https://react.dev/reference/react/memo), [useTransition](https://react.dev/reference/react/useTransition), [useDeferredValue](https://react.dev/reference/react/useDeferredValue), [use](https://react.dev/reference/react/use), [React Compiler](https://react.dev/learn/react-compiler/introduction), [eslint-plugin-react-hooks](https://react.dev/reference/eslint-plugin-react-hooks) (правила `refs`, `set-state-in-render`, `set-state-in-effect`, `immutability`).
- React Native: [архитектура](https://reactnative.dev/architecture/landing-page), [производительность](https://reactnative.dev/docs/performance), [настройка FlatList](https://reactnative.dev/docs/optimizing-flatlist-configuration), [FlashList](https://shopify.github.io/flash-list/) (v2 — только New Architecture, без `estimatedItemSize`), [worklets: `runOnJS` устарел, вместо него `scheduleOnRN`](https://docs.swmansion.com/react-native-worklets/docs/threading/runOnJS).
- Тесты хуков: [RNTL: renderHook](https://callstack.github.io/react-native-testing-library/docs/api/misc/render-hook). В тесте интервала каждый тик — в отдельном `act(...)`: в одном `act` на 3000 мс React не перерисует между тиками, и даже правильный хук покажет 1 вместо 3.
- ⚠️ Тесты ниже записаны в синхронном стиле (`@testing-library/react`, RNTL 13 и старше). В RNTL 14 `renderHook`, `rerender`, `unmount` и `act` асинхронные — пиши `await` (версия для RNTL 14 — в [ответах](../01-javascript-typescript-answers/01-javascript-typescript-answers.md)). С React Native 0.88 Jest-пресет вынесен в пакет `@react-native/jest-preset`.

**Практика 1. Вопросы** (≈ 25 мин)

- **Q67.** Что запускает рендер компонента (state, родитель, context) и что не запускает (изменение ref, мутация объекта)? Чем render отличается от commit? Что такое reconciliation и почему рендер ≠ обновление нативных view?
- **Q68.** Automatic batching (React 18+): как группируются обновления в обработчиках, промисах, таймерах? Почему два `setCount(count + 1)` подряд увеличивают на 1, а два `setCount((c) => c + 1)` — на 2?
- **Q69.** Зачем `key`? Что ломается при `key={index}` при вставке, удалении и сортировке (состояние строк и uncontrolled-инпуты «переезжают»)? Как сбросить состояние компонента через `key`?
- **Q70.** Правила хуков и почему они такие (хуки хранятся по порядку вызова у fiber). Почему `use` (React 19) можно вызывать в условии?
- **Q71.** `useEffect`, `useLayoutEffect`, `useInsertionEffect`: когда что, в каком порядке идут cleanup и setup? Зачем StrictMode в dev монтирует → размонтирует → монтирует снова, и что это говорит о твоих эффектах?
- **Q72.** «You Might Not Need an Effect»: какие эффекты лишние (производные данные, сброс состояния при смене пропса, логика событий, цепочки эффектов) и что делать вместо них?
- **Q73.** Stale closure в хуках: 3 примера (интервал, обработчик подписки, колбэк после `await`). Решения: функциональный апдейт, зависимости, ref с последним значением, `useEffectEvent` (стабилен с React 19.2; в RN — с 0.83).
- **Q74.** Мемоизация: когда `React.memo`, `useMemo`, `useCallback` реально нужны, а когда мешают? Ссылочное равенство пропсов. Что делает React Compiler 1.0 и когда ручная мемоизация остаётся (стабильная зависимость эффекта)?
- **Q75.** Context: когда перерисовываются потребители; почему объект-литерал в `value` перерисовывает всех; как разделять контексты; когда лучше стор с селекторами (Zustand, Redux)? `<Context value>` как провайдер и `use(Context)` в React 19.
- **Q76.** Виды состояния: локальное, серверное (TanStack Query), глобальное клиентское (Zustand). Где держать поток котировок из WebSocket, чтобы 100 обновлений в секунду не перерисовывали весь экран? Зачем `useSyncExternalStore` и что такое tearing?
- **Q77.** Concurrent features: `useTransition`, `useDeferredValue`, Suspense — что значит «прерываемый рендер»? React 19: Actions, `useActionState`, `useOptimistic`, `use`. Где это полезно в мобильном трейдинговом UI?
- **Q78.** Error boundaries: что ловят и что нет (обработчики событий, асинхронный код)? Как с ними работать без классов (`react-error-boundary`) и куда отправлять ошибки?
- **Q79.** Длинные списки в RN: как работает виртуализация `FlatList` (`keyExtractor`, `getItemLayout`, `windowSize`, `initialNumToRender`), чем лучше FlashList v2, зачем мемоизировать строку? Чем профилировать (React DevTools Profiler, React Native DevTools)?
- **Q80.** New Architecture: JSI, Fabric, TurboModules, Codegen, bridgeless. Что изменилось в RN 0.82, 0.84 и 0.88 (см. версии выше)? JS-поток и UI-поток, worklets в Reanimated, вызов JS из worklet (`scheduleOnRN` из `react-native-worklets`, раньше `runOnJS`).

**Практика 2. Задачи** (≈ 65 мин). Тесты из условия — критерии приёмки.

**T28. `useDebounce`** · лёгкая · ⏱ 10 мин

```ts
function useDebounce<T>(value: T, delayMs: number): T;
function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, delayMs: number): (...args: A) => void; // ★
```

- `useDebounce` возвращает `value`, которое не менялось `delayMs` мс; первое значение — сразу. Новый `value` перезапускает таймер; при размонтировании таймер очищается.
- ★ `useDebouncedCallback`: функция стабильна между рендерами, вызывает последнюю версию `fn`, отложенный вызов отменяется при размонтировании.

```ts
const { result, rerender } = renderHook(({ v }) => useDebounce(v, 300), { initialProps: { v: 'a' } });
result.current;                           // 'a'
rerender({ v: 'ab' });
act(() => jest.advanceTimersByTime(299));
result.current;                           // 'a'
rerender({ v: 'abc' });
act(() => jest.advanceTimersByTime(299));
result.current;                           // 'a' — таймер перезапущен
act(() => jest.advanceTimersByTime(1));
result.current;                           // 'abc'
// ★ useDebouncedCallback
const calls: string[] = [];
const cb = renderHook(({ prefix }) => useDebouncedCallback((q: string) => calls.push(prefix + q), 200),
  { initialProps: { prefix: 'v1:' } });
const first = cb.result.current;
first('a'); first('ab');
cb.rerender({ prefix: 'v2:' });
cb.result.current === first;              // true — функция стабильна
act(() => jest.advanceTimersByTime(200));
calls;                                    // ['v2:ab'] — последняя версия fn и последние аргументы
cb.result.current('x'); cb.unmount();
act(() => jest.advanceTimersByTime(500));
calls;                                    // ['v2:ab'] — отменено при размонтировании
```

**T29. `usePrevious` — две версии** · лёгкая · ⏱ 15 мин

```ts
function usePrevious<T>(value: T): T | undefined;         // A: useRef + useEffect
function usePreviousDistinct<T>(value: T): T | undefined; // B: состояние, без чтения ref в рендере
```

- A — классика: значение с прошлого рендера.
- B — по документации React («storing information from previous renders»): состояние и условный `setState` во время рендера; возвращает предыдущее *отличающееся* значение.
- Обсуди: почему версию A ругает правило `react-hooks/refs` и чем это грозит с React Compiler и concurrent rendering? Почему условный `setState` в рендере в версии B допустим, а безусловный — бесконечный цикл?

```ts
// рендеры со значениями 1, 1, 2, 3 (первое — initialProps, дальше rerender); result.current после каждого:
// A: usePrevious         → undefined, 1, 1, 2
// B: usePreviousDistinct → undefined, undefined, 1, 2
```

**T30. `useInterval` без stale closure и `useLatest`** · средняя · ⏱ 20 мин

```ts
function useLatest<T>(value: T): { readonly current: T }; // ref, который обновляется после коммита
function useInterval(callback: () => void, delayMs: number | null): void;
```

- Интервал вызывает **последний** `callback` и не перезапускается на каждом рендере.
- `delayMs === null` — пауза; смена `delayMs` перезапускает интервал; при размонтировании — `clearInterval`.
- Версия 1 — через `useLatest` (ref обновляется в `useLayoutEffect`, а не во время рендера). Версия 2 — через `useEffectEvent`.
- Сравни с наивной версией: `useEffect(() => { const id = setInterval(callback, delayMs); return () => clearInterval(id); }, [])`.
- Типизация теста: с `@testing-library/react` укажи `renderHook<number, Props>(…)`, иначе `rerender({ step: 10, delay: null })` не пройдёт `tsc` (тип пропсов выводится из `initialProps`).

```ts
const { result, rerender } = renderHook(({ step, delay }: { step: number; delay: number | null }) => {
  const [count, setCount] = useState(0);
  useInterval(() => setCount(count + step), delay); // намеренно без функционального апдейта
  return count;
}, { initialProps: { step: 1, delay: 1000 } });
for (let i = 0; i < 3; i++) act(() => jest.advanceTimersByTime(1000)); // каждый тик — в своём act
result.current;                    // 3
rerender({ step: 10, delay: 1000 });
act(() => jest.advanceTimersByTime(1000));
result.current;                    // 13
rerender({ step: 10, delay: null });
act(() => jest.advanceTimersByTime(5000));
result.current;                    // 13 — пауза
rerender({ step: 10, delay: 500 });
act(() => jest.advanceTimersByTime(500));
act(() => jest.advanceTimersByTime(500));
result.current;                    // 33
// наивная версия с [] в зависимостях: после 3 тиков result.current → 1 (stale closure)
```

**T31. Код-ревью: что не так в компоненте?** · средняя · ⏱ 20 мин

Интервьюер показывает код и просит найти проблемы. Их здесь не меньше 8: корректность, утечки, гонки, производительность. Для каждой назови последствие и исправление, потом перепиши компонент.

```tsx
import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';

type Quote = { symbol: string; price: number };
type PriceSocket = { subscribe(symbols: string[], onQuote: (q: Quote) => void): () => void };
type Props = { symbols: string[]; socket: PriceSocket; onSelect: (symbol: string) => void };

export function Watchlist({ symbols, socket, onSelect }: Props) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filter, setFilter] = useState('');
  const [visible, setVisible] = useState<Quote[]>([]);

  useEffect(() => {
    fetch(`https://api.example.com/quotes?symbols=${symbols.join(',')}`)
      .then((res) => res.json())
      .then((data) => setQuotes(data));
  }, [symbols]);

  useEffect(() => {
    socket.subscribe(symbols, (q) => {
      const item = quotes.find((x) => x.symbol === q.symbol);
      if (item) item.price = q.price;
      setQuotes(quotes);
    });
  }, []);

  useEffect(() => {
    setVisible(quotes.filter((q) => q.symbol.includes(filter.toUpperCase())));
  }, [quotes, filter]);

  return (
    <View>
      <TextInput value={filter} onChangeText={setFilter} placeholder="Search" />
      <FlatList
        data={visible.sort((a, b) => b.price - a.price)}
        keyExtractor={(_, index) => String(index)}
        renderItem={({ item }) => (
          <Pressable onPress={() => onSelect(item.symbol)}>
            <Text>{item.symbol}: {item.price.toFixed(2)}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
```

Чек-лист — смотри только после своей попытки: запрос и гонки; ответ сервера без проверки; подписка и cleanup; зависимости эффектов; мутация состояния; производное состояние в эффекте; сортировка в рендере; ключи; частота обновлений и перерисовки всего списка; форматирование цены.

**Самопроверка**

- Почему `key={index}` в списке, отсортированном по цене, — баг, даже если «всё отображается»?
- Что изменилось бы в T31 с React Compiler? Какие проблемы он не решит?
- Как построить watchlist на 200 тикеров с обновлениями 10 раз в секунду (стор, селекторы, батчинг из T32, список)?
- Чем `useEffectEvent` отличается от `useCallback`?

**Готово, когда:** T28–T30 проходят тесты в Jest; в T31 найдено не меньше 8 проблем и есть переписанная версия; на Q67–Q80 отвечаешь с примером из RN-опыта (Hotline.Finance, Siimply Trade).

## Блок 9. Трейдинг и геймификация (1 ч)

**Цель:** решать задачи «из жизни» трейдинговой платформы и игровых механик: поток котировок, деньги, форматирование, рейтинг.

**Что повторить**

- Поток котировок: копить тики в буфере и отдавать в UI пачкой по таймеру (coalescing) — одно обновление стора вместо сотен.
- Деньги: считать в целых единицах (`bigint`), форматировать в самом конце — Q30–Q32, P9.
- `Intl.NumberFormat`: кэш форматтеров; в Hermes — проверка на устройстве (Q34).
- Лидерборд: сортировка с tie-break и ранги «1224» (standard competition ranking).

**Практика** (≈ 1 ч). Тесты из условия — критерии приёмки.

**T32. Батчинг котировок** · средняя · ⏱ 15 мин

```ts
type Tick = { symbol: string; price: number; ts: number };
function createTickBatcher(onFlush: (batch: Map<string, Tick>) => void, intervalMs: number): {
  push(tick: Tick): void;
  flush(): void;   // отдать накопленное сейчас
  dispose(): void; // остановить и очистить буфер
};
```

- В буфере по каждому символу — тик с наибольшим `ts`; тик старше уже лежащего в буфере игнорируется.
- Первый `push` в пустой буфер запускает таймер на `intervalMs`; по таймеру — `onFlush(буфер)` и новый пустой буфер. Пустых вызовов `onFlush` нет.
- `flush()` очищает таймер и сразу отдаёт буфер, если он не пуст. После `dispose()` `onFlush` больше не вызывается.
- ★ Подключи к Zustand: `onFlush` → один `setState`; строка списка подписана селектором на свой символ.

```ts
const batches: Array<Record<string, number>> = [];
const b = createTickBatcher((m) => batches.push(Object.fromEntries([...m].map(([s, t]) => [s, t.price]))), 100);
b.push({ symbol: 'BTC', price: 1, ts: 1 });
b.push({ symbol: 'ETH', price: 10, ts: 2 });
b.push({ symbol: 'BTC', price: 2, ts: 3 });
b.push({ symbol: 'BTC', price: 1.5, ts: 2 }); // старее ts 3 — игнор
tick(99);                                     // batches → []
tick(1);                                      // batches → [{ BTC: 2, ETH: 10 }]
tick(500);                                    // новых вызовов нет
b.push({ symbol: 'ETH', price: 11, ts: 4 });
b.flush();                                    // batches → [{ BTC: 2, ETH: 10 }, { ETH: 11 }] — сразу
tick(100);                                    // повторной отправки нет
b.push({ symbol: 'BTC', price: 3, ts: 5 });
b.dispose();
tick(1000);                                   // batches.length → 2
```

**T33. Деньги и P&L без float** · средняя–сложная · ⏱ 20 мин

```ts
function toUnits(amount: string, scale: number): bigint;  // '123.45', 2 → 12345n
function fromUnits(units: bigint, scale: number): string; // 12345n, 2 → '123.45'
type Fill = { side: 'buy' | 'sell'; qty: number; price: string }; // qty — целое число штук
function calcPnL(fills: readonly Fill[], markPrice: string, scale?: number): { // scale по умолчанию 2
  positionQty: number;
  realized: string;
  unrealized: string;
};
```

- `toUnits`: формат строго `/^-?\d+(\.\d+)?$/`, иначе `TypeError`; знаков после точки больше `scale` — `RangeError` (никакого тихого округления).
- `fromUnits`: ровно `scale` знаков после точки; при `scale = 0` — без точки; минус для отрицательных.
- `calcPnL`: только long, лоты FIFO. `realized` — сумма `(цена продажи − цена лота) × qty` по закрытым частям; `unrealized` — сумма `(mark − цена лота) × qty` по открытым лотам. Продажа больше позиции или `qty` не целое > 0 — `RangeError`.
- Вся арифметика — в `bigint`. Обсуди: что изменится для крипты (дробное `qty` с 8 знаками, scale цены × scale количества, где и как округлять)?

```ts
toUnits('123.45', 2);     // 12345n
toUnits('0.1', 2);        // 10n
toUnits('-0.05', 2);      // -5n
toUnits('7', 8);          // 700000000n
toUnits('1.005', 2);      // RangeError
toUnits('1e3', 2);        // TypeError; так же для '', '1.', '.5', '1,5', ' 1', '+1'
fromUnits(12345n, 2);     // '123.45'
fromUnits(-5n, 2);        // '-0.05'
fromUnits(700000000n, 8); // '7.00000000'
fromUnits(42n, 0);        // '42'
fromUnits(0n, 2);         // '0.00'
fromUnits(toUnits('0.1', 2) + toUnits('0.2', 2), 2); // '0.30'
calcPnL([
  { side: 'buy', qty: 10, price: '100.00' },
  { side: 'buy', qty: 10, price: '110.00' },
  { side: 'sell', qty: 15, price: '120.00' },
], '105.00'); // { positionQty: 5, realized: '250.00', unrealized: '-25.00' }
calcPnL([{ side: 'buy', qty: 3, price: '0.10' }, { side: 'buy', qty: 3, price: '0.20' }], '0.30');
// { positionQty: 6, realized: '0.00', unrealized: '0.90' }; во float: 3 * (0.3 - 0.1) + 3 * (0.3 - 0.2) → 0.8999999999999999
calcPnL([{ side: 'buy', qty: 2, price: '10.5' }, { side: 'sell', qty: 2, price: '10.25' }], '9');
// { positionQty: 0, realized: '-0.50', unrealized: '0.00' }
calcPnL([{ side: 'buy', qty: 1, price: '10.00' }, { side: 'sell', qty: 2, price: '11.00' }], '11.00'); // RangeError
calcPnL([], '1.00'); // { positionQty: 0, realized: '0.00', unrealized: '0.00' }
```

**T34. Цены через `Intl.NumberFormat`** · лёгкая · ⏱ 10 мин

```ts
function formatPrice(value: number, currency: string, fractionDigits: number, locale?: string): string; // locale по умолчанию 'en-US'
function formatChangePercent(ratio: number, locale?: string): string; // 0.0123 → '+1.23%'
function formatVolume(value: number, locale?: string): string;        // 1234567 → '1.2M'
```

- `formatPrice`: `style: 'currency'`, ровно `fractionDigits` знаков. `formatChangePercent`: проценты, ровно 2 знака, знак у ненулевых (`signDisplay: 'exceptZero'`). `formatVolume`: `notation: 'compact'`, не больше 1 знака после запятой.
- Форматтеры кэшируются по `locale + options` (`Map`): 1000 вызовов с одними параметрами — один `new Intl.NumberFormat`.
- Ожидания проверены в Node.js 24 (ICU 77). В Hermes `Intl` опирается на платформу: проверь на iOS и Android и предусмотри запасной вариант.
- ★ Сравни в Node.js `(1.005).toFixed(2)` и `new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(1.005)` и объясни разницу.

```ts
formatPrice(1234.5, 'USD', 2);          // '$1,234.50'
formatPrice(-1234.5, 'USD', 2);         // '-$1,234.50'
formatPrice(0.00012345, 'USD', 6);      // '$0.000123'
formatPrice(1234.5, 'EUR', 2, 'de-DE'); // '1.234,50 €' — перед € неразрывный пробел U+00A0
formatChangePercent(0.0123);            // '+1.23%'
formatChangePercent(-0.005);            // '-0.50%'
formatChangePercent(0);                 // '0.00%'
formatChangePercent(-0.00001);          // '0.00%' — округлилось до нуля, знака нет
formatVolume(999);                      // '999'
formatVolume(1500);                     // '1.5K'
formatVolume(1234567);                  // '1.2M'
formatVolume(1500, 'ru-RU');            // '1,5 тыс.' — пробел U+00A0
```

**T35. Лидерборд турнира: top-N из потока очков** · средняя · ⏱ 15 мин

```ts
type ScoreEvent = { playerId: string; score: number; ts: number };
type Row = { rank: number; playerId: string; score: number };
function createLeaderboard(): {
  submit(event: ScoreEvent): void; // засчитывается, только если score строго больше лучшего результата игрока
  top(n: number): Row[];
};
```

- Порядок: `score` по убыванию; при равенстве выше тот, кто набрал результат раньше (меньший `ts`); при равных `ts` — `playerId` по алфавиту.
- Ранг — «1224»: равные очки — один ранг, следующий ранг пропускается. `top(0)` → `[]`; `n` больше числа игроков — все игроки.
- Обсуди: сортировка на каждый `top` против кучи (heap) или упорядоченного массива с бинарной вставкой; что меняется при 100 000 игроков и `top(100)` раз в секунду; где считать рейтинг — на клиенте или на сервере (античит)?

```ts
const lb = createLeaderboard();
lb.submit({ playerId: 'ann', score: 120, ts: 1 });
lb.submit({ playerId: 'bob', score: 150, ts: 2 });
lb.submit({ playerId: 'cid', score: 120, ts: 3 });
lb.submit({ playerId: 'dan', score: 90, ts: 4 });
lb.submit({ playerId: 'ann', score: 100, ts: 5 }); // хуже прежнего — не засчитывается
lb.top(3);
// [{ rank: 1, playerId: 'bob', score: 150 }, { rank: 2, playerId: 'ann', score: 120 }, { rank: 2, playerId: 'cid', score: 120 }]
lb.submit({ playerId: 'dan', score: 200, ts: 6 });
lb.top(2); // [{ rank: 1, playerId: 'dan', score: 200 }, { rank: 2, playerId: 'bob', score: 150 }]
lb.top(10).map((r) => `${r.rank}:${r.playerId}`); // ['1:dan', '2:bob', '3:ann', '3:cid']
lb.submit({ playerId: 'cid', score: 120, ts: 7 }); // равный результат — не засчитывается
lb.submit({ playerId: 'eve', score: 120, ts: 2 });
lb.top(10).map((r) => `${r.rank}:${r.playerId}`); // ['1:dan', '2:bob', '3:ann', '3:eve', '3:cid']
lb.top(0); // []
```

**Самопроверка**

- Почему цену нельзя хранить в `number`, а показывать через `number` можно?
- Сколько обновлений стора в секунду даст T32 при 500 тиках в секунду и `intervalMs = 100`?
- Как показать ранг игрока, который не попал в top-100?
- Что из этого ты уже делал (Siimply Trade, HabitHero: лиги, очки, стрики) и какой пример расскажешь?

**Готово, когда:** T32–T35 проходят тесты; можешь объяснить, почему деньги — в `bigint`, а форматирование — в самом конце.

## Блок 10. Mock-интервью (1 ч)

**Цель:** пройти интервью целиком в реальном темпе и получить честный разбор.

**Практика**

1. ≈ 45 мин — интервью с AI по промпту ниже: голосом, если есть голосовой режим, или текстом. Код — в песочнице, без AI-подсказок в редакторе, с таймером.
2. ≈ 15 мин — разбор: оценки по блокам → журнал ошибок → список ID на повтор.
3. ★ Второй прогон в другой день — с новыми задачами («не повторяй прошлые, придумай похожие»). ★ Английский режим: замени строку про язык на «The interview is in English. At the end, list my English mistakes briefly».

```text
Ты — Senior Frontend-разработчик в продуктовой компании, которая делает трейдинговую платформу:
основное мобильное приложение на React Native и новые игровые «trading mini-apps» (турниры,
челленджи, лояльность, ачивки). Ты проводишь техническое интервью кандидата на позицию
Senior React Native Developer. Язык интервью — русский, термины — на английском.

Формат — 45 минут, строго по одному вопросу за раз, жди мой ответ:
1. 2 мин — попроси кратко рассказать о себе: стек и последние проекты.
2. 8 мин — 4 вопроса по JavaScript: типы и приведение, замыкания, this, event loop, промисы.
   На каждый ответ — 1 уточняющий вопрос вглубь.
3. 5 мин — 1 задача «что выведет этот код» на порядок промисов, таймеров и async/await.
   Код придумай сам, уровня senior.
4. 15 мин — live coding: одна задача из списка (debounce с cancel, throttle с leading/trailing,
   Promise.all с нуля, retry с backoff и jitter, пул с ограничением параллельности, deepClone
   с циклами, типизированный EventEmitter, LRU-кэш). Дай условие, дождись моих уточняющих
   вопросов, потом решения. Затем спроси про крайние случаи, сложность и типы.
5. 8 мин — React и React Native: код-ревью компонента с ошибками (эффекты, ключи, мутации,
   лишние рендеры) и 2 вопроса (мемоизация и React Compiler, New Architecture, списки, потоки).
6. 5 мин — TypeScript: 2 вопроса (unknown и narrowing, discriminated unions, generics,
   conditional и mapped types, satisfies) и 1 маленькая задача на типы.
7. 2 мин — спроси, какие у меня вопросы к команде.

Правила:
- Не подсказывай и не показывай правильные ответы до конца интервью.
- Если ответ поверхностный — копай глубже, как настоящий интервьюер.
- Если я прошу подсказку — дай минимальную и учти это в оценке.
- Следи за временем: этап затянулся — переходи к следующему.

В конце дай разбор:
- оценка 1–5 по блокам: JavaScript, асинхронность, live coding, React / React Native,
  TypeScript, коммуникация;
- 3 сильные стороны и 3 главных пробела — с примерами из моих ответов;
- правильные ответы там, где я ошибся;
- вердикт: «Senior / Middle+ / не прошёл» и почему;
- план повторения на 2 дня.
```

**Готово, когда:** прогон пройден, разбор перенесён в журнал ошибок, темы с оценкой ниже 4 повторены по ID; ★ второй прогон даёт не ниже 4 по JavaScript, асинхронности и live coding.

## Источники

Списки вопросов и задач:

- GreatFrontEnd: Front End Interview Playbook, JavaScript — https://www.greatfrontend.com/front-end-interview-playbook/javascript · проверено 2026-10-21
- GreatFrontEnd: Top 20 advanced JavaScript questions (2025-04-26) — https://www.greatfrontend.com/blog/advanced-javascript-interviews-questions-for-10-years-experience · проверено 2026-10-21
- Top JavaScript interview questions (GreatFrontEnd, «updated for 2026») — https://github.com/yangshun/top-javascript-interview-questions · проверено 2026-10-21
- Top React interview questions — https://github.com/yangshun/top-reactjs-interview-questions · проверено 2026-10-21
- BFE.dev: задачи — https://bigfrontend.dev/problem; квизы «что выведет» — https://bigfrontend.dev/quiz · проверено 2026-10-21
- type-challenges — https://github.com/type-challenges/type-challenges · проверено 2026-10-21
- DOU: 300+ вопросов по JavaScript (2020) — https://dou.ua/lenta/articles/interview-questions-javascript-developer/; 400+ для Front-end — https://dou.ua/lenta/articles/front-end-developer-interview-questions/ · проверено 2026-10-21
- Хабр: вопросы для frontend-собеседования, часть 1 (2024-01-04) — https://habr.com/ru/articles/784548/ · проверено 2026-10-21
- Live coding с реальных собеседований Middle / Senior — https://github.com/a-khramtsov/frontend-livecoding-practice · проверено 2026-10-21
- itcodik: 72 вопроса на собеседовании frontend (2026) — https://itcodik.com/article/frontend-interview-questions-2026-guide · проверено 2026-10-21
- sprintcode.pro: вопросы по JavaScript — https://sprintcode.pro/ru/blog/frontend-interview-javascript-questions · проверено 2026-10-21

JavaScript:

- learn.javascript.ru — учебник (разделы по ссылкам в блоках 1–3) — https://learn.javascript.ru/ · проверено 2026-10-21
- MDN: модель выполнения — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model; микрозадачи — https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide; Promise — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise · проверено 2026-10-21
- MDN: this — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this; AbortController — https://developer.mozilla.org/en-US/docs/Web/API/AbortController; Web Workers — https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers · проверено 2026-10-21
- MDN: structuredClone — https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone; Iterator — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Iterator; Memory management — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_management · проверено 2026-10-21
- MDN: Intl.NumberFormat — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat; Intl.PluralRules — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules; Temporal — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal · проверено 2026-10-21
- TC39: finished proposals (ES2024–ES2027) — https://github.com/tc39/proposals/blob/main/finished-proposals.md · проверено 2026-10-21
- AWS: Exponential Backoff And Jitter — https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/ · проверено 2026-10-21
- Node.js: MockTimers — https://nodejs.org/api/test.html#class-mocktimers; TypeScript (type stripping) — https://nodejs.org/api/typescript.html · проверено 2026-10-21

TypeScript:

- Анонс TypeScript 6.0 (2026-03-23) — https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/; 7.0 (2026-07-08) — https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/ · проверено 2026-10-21
- TS handbook (narrowing, generics, conditional, mapped, template literal, utility types, declaration merging, enums) — https://www.typescriptlang.org/docs/handbook/2/narrowing.html; tsconfig: strict — https://www.typescriptlang.org/tsconfig/#strict · проверено 2026-10-21
- Release notes 4.9, 5.0, 5.4, 5.5, 5.8 (ссылки в блоке 6) — https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html · проверено 2026-10-21
- React TypeScript Cheatsheet — https://react-typescript-cheatsheet.netlify.app/ · проверено 2026-10-21

React и React Native:

- React 19.3 (2026-09-09) — https://react.dev/blog/2026/09/09/react-19-3; React 19.2 (2025-10-01) — https://react.dev/blog/2025/10/01/react-19-2; React Compiler 1.0 (2025-10-07) — https://react.dev/blog/2025/10/07/react-compiler-1 · проверено 2026-10-21
- react.dev: useEffectEvent — https://react.dev/reference/react/useEffectEvent; useRef — https://react.dev/reference/react/useRef; You Might Not Need an Effect — https://react.dev/learn/you-might-not-need-an-effect; eslint-plugin-react-hooks — https://react.dev/reference/eslint-plugin-react-hooks · проверено 2026-10-21
- React Native 0.82 — https://reactnative.dev/blog/2025/10/08/react-native-0.82; 0.84 (Hermes V1) — https://reactnative.dev/blog/2026/02/11/react-native-0.84; 0.87 (Strict TypeScript API, без InteractionManager) — https://reactnative.dev/blog/2026/08/11/react-native-0.87; 0.88 (React 19.3, EventTarget) — https://reactnative.dev/blog/2026/10/19/react-native-0.88 · проверено 2026-10-21
- The New Architecture is here (event loop) — https://reactnative.dev/blog/2024/10/23/the-new-architecture-is-here; RFC 0744 — https://github.com/react-native-community/discussions-and-proposals/blob/main/proposals/0744-well-defined-event-loop.md · проверено 2026-10-21
- Hermes: Intl APIs — https://github.com/facebook/hermes/blob/main/doc/IntlAPIs.md · проверено 2026-10-21
- react-native-worklets: runOnJS → scheduleOnRN — https://docs.swmansion.com/react-native-worklets/docs/threading/runOnJS; FlashList — https://shopify.github.io/flash-list/; RNTL: renderHook — https://callstack.github.io/react-native-testing-library/docs/api/misc/render-hook · проверено 2026-10-21
- Версии пакетов (`npm view`): react 19.3.1, react-native 0.88.0, typescript 7.0.2, expo 58.0.16, react-native-reanimated 4.7.1, @shopify/flash-list 2.3.3, zustand 5.0.15, zod 4.6.7, @tanstack/react-query 5.104.5 · проверено 2026-10-21
