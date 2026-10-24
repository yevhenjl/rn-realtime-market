# JavaScript и TypeScript: вопросы и задачи

Обновлено: 2026-10-21 · Тренинг 1 из 6 · ≈ 16 часов · Вакансия: [карточка](../../card.ru.md)

Часть 4 из 6 · [часть 1](01-javascript-typescript.md) · [часть 2](01-javascript-typescript-part2.md) · [часть 3](01-javascript-typescript-part3.md) · [часть 5](01-javascript-typescript-part5.md) · [часть 6](01-javascript-typescript-part6.md) · [ответы](../01-javascript-typescript-answers/01-javascript-typescript-answers.md)

Правила те же, что в [части 1](01-javascript-typescript.md#как-тренироваться-с-ai). Здесь только live coding: пиши как на интервью — таймер, без AI, вслух.

## Блок 4. Live coding: асинхронные утилиты (2 ч)

**Цель:** писать за 15–30 минут асинхронные утилиты, которые чаще всего дают на live coding, — с крайними случаями, типами и тестами.

**Что повторить**

- Как ведут себя на live coding: уточни требования (leading или trailing? порядок результатов? что при ошибке?), назови крайние случаи, начни с простой версии, проговаривай решения, сам прогони тесты. По этим осям оценивают в [GreatFrontEnd: playbook](https://www.greatfrontend.com/front-end-interview-playbook/javascript): problem solving, основа инженерии, знание платформы, коммуникация, проверка.
- Debounce и throttle, декораторы функций: [декораторы и переадресация вызова](https://learn.javascript.ru/call-apply-decorators).
- Повторы с экспоненциальной задержкой и jitter: [AWS: Exponential Backoff And Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/).
- Фейковые таймеры в тестах: [Node.js: MockTimers](https://nodejs.org/api/test.html#class-mocktimers) — `mock.timers.enable({ apis: ['setTimeout'] })`, затем `mock.timers.tick(ms)`. В тестах ниже `tick(ms)` — это `mock.timers.tick(ms)`, а время отсчитывается от `enable`.

**Практика** (≈ 2 ч). Тесты из условия — критерии приёмки.

**T10. `promiseRace` и `promiseAny`** · средняя · ⏱ 15 мин

```ts
function promiseRace<T>(values: Iterable<T | PromiseLike<T>>): Promise<Awaited<T>>;
function promiseAny<T>(values: Iterable<T | PromiseLike<T>>): Promise<Awaited<T>>;
```

- Без встроенных `Promise.race` и `Promise.any`.
- `promiseRace` — результат первого завершившегося, успех или ошибка. Пустой вход — промис навсегда остаётся pending.
- `promiseAny` — первый успех. Если отклонились все — `AggregateError`, `errors` в порядке входа, а не по времени. Пустой вход — сразу `AggregateError` с пустым `errors`.

```ts
await promiseRace([sleep(20).then(() => 'slow'), sleep(10).then(() => 'fast')]);     // 'fast'
await promiseRace([sleep(20).then(() => 'slow'), Promise.reject(new Error('boom'))]); // reject: Error('boom')
await promiseAny([Promise.reject(new Error('a')), sleep(10).then(() => 'b')]);        // 'b'
await promiseAny([Promise.reject(new Error('a')), Promise.reject(new Error('b'))]);
// reject: AggregateError; errors.map((e) => e.message) → ['a', 'b']
await promiseAny([sleep(20).then(() => { throw new Error('slow'); }), Promise.reject(new Error('fast'))]);
// reject: AggregateError; errors → ['slow', 'fast'] — порядок входа
await promiseAny([]); // reject: AggregateError; errors → []
```

**T11. `debounce` с `cancel`, `flush`, `pending`** · средняя · ⏱ 25 мин

```ts
type Debounced<A extends unknown[]> = ((...args: A) => void) & {
  cancel(): void;     // отменить отложенный вызов
  flush(): void;      // выполнить отложенный вызов сейчас
  pending(): boolean; // есть ли отложенный вызов
};
function debounce<A extends unknown[]>(fn: (...args: A) => void, wait: number): Debounced<A>;
```

- Trailing: `fn` вызывается с последними аргументами после `wait` мс тишины.
- `flush()` без отложенного вызова ничего не делает; после `flush()` таймер повторно не срабатывает.
- ★ Опция `{ leading: true }`. ★ Сохрани `this`.
- Где в RN: поиск по тикерам, автосохранение настроек.

```ts
const calls: string[] = [];
const save = debounce((q: string) => calls.push(q), 100);
save('a'); save('ab'); save('abc');
save.pending();                      // true
tick(99);                            // calls → []
tick(1);                             // calls → ['abc']
save.pending();                      // false
save('x'); save.cancel(); tick(200); // calls → ['abc']
save('y'); save.flush();             // calls → ['abc', 'y'] — сразу
tick(200);                           // calls → ['abc', 'y'] — повтора нет
save.flush();                        // ничего не происходит
```

**T12. `throttle` с `leading` и `trailing`** · средняя · ⏱ 25 мин

```ts
function throttle<A extends unknown[]>(
  fn: (...args: A) => void,
  wait: number,
  options?: { leading?: boolean; trailing?: boolean }, // по умолчанию оба true
): ((...args: A) => void) & { cancel(): void };
```

Семантика окна — реализуй именно её:

- Вызов без активного окна: при `leading` сразу `fn(args)`, иначе запомнить `args`; открыть окно на `wait` мс.
- Вызов внутри окна: запомнить последние `args` (если `trailing`).
- Конец окна: если `trailing` и есть запомненные `args` — вызвать `fn` с ними и открыть новое окно; иначе окно закрывается.
- `cancel()` закрывает окно и забывает отложенный вызов.
- Пример из трейдинга: обновлять цену в UI не чаще раза в 100 мс, но последнее значение показать обязательно.

```ts
const log: number[] = [];
const t = throttle((v: number) => log.push(v), 100);
t(1);       // t=0:   [1] — leading
t(2); t(3); // t=0:   [1]
tick(100);  // t=100: [1, 3] — trailing с последними аргументами
t(4);       // t=100: [1, 3] — идёт окно после trailing-вызова
tick(100);  // t=200: [1, 3, 4]
tick(100);  // t=300: [1, 3, 4] — окно закрылось
t(5);       // t=300: [1, 3, 4, 5] — сразу
const l2: string[] = [];
const t2 = throttle((v: string) => l2.push(v), 100, { leading: false });
t2('a'); t2('b'); // []
tick(100);        // ['b']
const l3: string[] = [];
const t3 = throttle((v: string) => l3.push(v), 100, { trailing: false });
t3('a'); t3('b'); tick(100); t3('c'); // ['a', 'c']
const l4: number[] = [];
const t4 = throttle((v: number) => l4.push(v), 100);
t4(1); t4(2); t4.cancel(); tick(300); // [1] — отложенный вызов с 2 отменён
t4(3);                                // [1, 3]
```

**T13. `retry` с экспоненциальной задержкой и jitter** · средняя · ⏱ 25 мин

```ts
type RetryOptions = {
  retries: number;          // сколько повторов после первой попытки
  baseDelayMs: number;      // задержка перед первым повтором
  maxDelayMs: number;       // потолок задержки
  jitter?: 'none' | 'full'; // по умолчанию 'full'
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  signal?: AbortSignal;
  random?: () => number;    // для тестов; по умолчанию Math.random
  onRetry?: (info: { attempt: number; delayMs: number; error: unknown }) => void;
};
function retry<T>(fn: (attempt: number) => Promise<T>, options: RetryOptions): Promise<T>;
```

- `attempt` — номер попытки, с 1. Перед повтором номер `k` (k = 1…`retries`) ждём `min(maxDelayMs, baseDelayMs * 2 ** (k - 1))`; при `jitter: 'full'` — `Math.floor(random() * эта задержка)`.
- `onRetry` вызывается перед каждым ожиданием; `attempt` в нём — номер упавшей попытки.
- Повторы кончились — reject последней ошибкой. `shouldRetry` вернул `false` — reject сразу (например, HTTP 4xx).
- `signal`: отмена прерывает ожидание, reject с `signal.reason`, `fn` больше не вызывается.
- Обсуди: зачем jitter, когда 10 000 клиентов одновременно теряют соединение с сервером котировок? Можно ли повторять отправку ордера (идемпотентность)?

```ts
const delays: number[] = [];
let n = 0;
await retry(async (attempt) => { n++; if (attempt < 3) throw new Error(`fail ${attempt}`); return 'ok'; },
  { retries: 5, baseDelayMs: 10, maxDelayMs: 1000, jitter: 'none', onRetry: ({ delayMs }) => delays.push(delayMs) });
// 'ok'; n → 3; delays → [10, 20]
// fn всегда падает с `fail ${attempt}`; retries 5, baseDelayMs 1, maxDelayMs 3, jitter 'none':
// delays → [1, 2, 3, 3, 3]; reject: Error('fail 6')
// fn всегда падает; retries 3, baseDelayMs 10, maxDelayMs 10_000, jitter 'full', random: () => 0.5:
// delays → [5, 10, 20]
// fn бросает HttpError(404); shouldRetry: (e) => !(e instanceof HttpError && e.status < 500)
// → fn вызван 1 раз, reject: HttpError(404)
// fn всегда падает; retries 5, baseDelayMs 1000, maxDelayMs 1000, jitter 'none', signal;
// через 20 мс controller.abort(new Error('user left'))
// → reject: Error('user left'); fn вызван 1 раз
```

`HttpError` для теста — без parameter properties (Node.js их не стирает): `class HttpError extends Error { status: number; constructor(status: number) { super('HTTP ' + status); this.status = status; } }`.

**T14. `mapWithConcurrency`** · средняя · ⏱ 30 мин

```ts
function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]>;
```

- Одновременно не больше `limit` вызовов `fn`. Следующая задача стартует сразу, как освободилось место, — не пачками.
- Результаты — в порядке `items`.
- Первая ошибка: reject с ней; новые задачи больше не стартуют (запущенные доработают, их результат игнорируется).
- `limit` — целое ≥ 1, иначе reject с `RangeError`. Пустой `items` → `[]`.
- Пример: загрузить 200 логотипов тикеров, не больше 4 запросов одновременно.

```ts
const events: string[] = [];
let active = 0;
let maxActive = 0;
await mapWithConcurrency([60, 10, 30, 40], 2, async (ms, i) => {
  events.push(`start ${i}`); active++; maxActive = Math.max(maxActive, active);
  await sleep(ms);
  active--; events.push(`end ${i}`);
  return ms * 2;
}); // [120, 20, 60, 80]
maxActive; // 2
events;    // ['start 0', 'start 1', 'end 1', 'start 2', 'end 2', 'start 3', 'end 0', 'end 3']
// «пачками по 2» дало бы 'start 2' только после 'end 0' — тест это ловит
const calls: number[] = [];
await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (x) => {
  calls.push(x); await sleep(10); if (x === 2) throw new Error('bad 2'); return x;
}); // reject: Error('bad 2'); подожди 50 мс — в calls нет 4 и 5
await mapWithConcurrency([], 3, async (x) => x);  // []
await mapWithConcurrency([1], 0, async (x) => x); // reject: RangeError
```

**T15. ★ `latestOnly`** · средняя · ⏱ 20 мин

```ts
function latestOnly<A extends unknown[], R>(
  fn: (signal: AbortSignal, ...args: A) => Promise<R>,
): (...args: A) => Promise<R>;
```

- Каждый новый вызов отменяет `signal` предыдущего; устаревший вызов отклоняется с `AbortError` (через `signal.reason`).
- Пример: поиск по тикерам при быстром вводе, смена тикера на графике.
- ★ Хук `useLatestRequest` поверх этой функции: при размонтировании отменить последний запрос.

```ts
const search = latestOnly(async (signal, q: string) => {
  await sleep(q.length * 10, signal); // sleep из T8
  return `results for ${q}`;
});
const p1 = search('a');
const p2 = search('ab');
const [r1, r2] = await Promise.allSettled([p1, p2]);
r1.status; // 'rejected'; r1.reason.name → 'AbortError'
r2;        // { status: 'fulfilled', value: 'results for ab' }
```

**Самопроверка**

- Объясни разницу debounce и throttle на примере экрана котировок и поля поиска.
- Почему «пачки» (`Promise.all` по 4 штуки) хуже пула из T14? Посчитай время для `[60, 10, 30, 40]`.
- Какие ошибки нельзя повторять (`shouldRetry`), а какие нужно?
- Как тестировать код с таймерами без реального ожидания?

**Готово, когда:** T10–T14 проходят тесты; каждую задачу можешь написать заново за указанное время, проговаривая вслух.

## Блок 5. Live coding: структуры данных (1,5 ч)

**Цель:** уверенно писать рекурсию по данным, учитывать циклы и ссылки, держать O(1) там, где его ждут.

**Что повторить**

- Обход структур: рекурсия плюс `WeakMap` «уже видели» — так переживают циклы и общие ссылки.
- `Map` хранит порядок вставки — LRU в O(1) без своего списка; классика — `Map` плюс двусвязный список.
- Типизированный emitter — generic-класс по карте событий: `keyof E`, `E[K]`.
- Читать: [MDN: structuredClone](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone), [Map и Set](https://learn.javascript.ru/map-set), [WeakMap и WeakSet](https://learn.javascript.ru/weakmap-weakset), [TS handbook: generics](https://www.typescriptlang.org/docs/handbook/2/generics.html).

**Практика** (≈ 1,5 ч). Тесты из условия — критерии приёмки.

**T16. `deepEqual`** · средняя · ⏱ 20 мин

```ts
function deepEqual(a: unknown, b: unknown): boolean;
```

- Примитивы — как `Object.is`: `NaN` равен `NaN`, `0` и `-0` различаются.
- Прототипы должны совпадать: `[]` и `{}`, `Date` и `{}` — не равны.
- Массивы — одинаковая длина и попарно равные элементы. Объекты — одинаковый набор собственных перечисляемых строковых ключей (порядок не важен) и равные значения.
- `Date` — по `getTime()`. Функции — по ссылке.
- ★ `Map` (ключ — через `has`, значение — глубоко) и `Set` (элементы через `has`). ★ Циклические ссылки без бесконечной рекурсии.

```ts
deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }); // true
deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 });             // true
deepEqual([1, 2], { 0: 1, 1: 2, length: 2 });          // false
deepEqual({ a: undefined }, {});                       // false
deepEqual([1, 2], [1, 2, 3]);                          // false
deepEqual('1', 1);                                     // false
deepEqual(NaN, NaN);                                   // true
deepEqual(0, -0);                                      // false
deepEqual(new Date(0), new Date(0));                   // true
deepEqual(new Date(0), {});                            // false
deepEqual(null, {});                                   // false
const fn = () => 1;
deepEqual({ fn }, { fn });                             // true
deepEqual({ fn }, { fn: () => 1 });                    // false
deepEqual(new Map([['x', { y: 1 }]]), new Map([['x', { y: 1 }]])); // ★ true
deepEqual(new Set([1, 2]), new Set([2, 1]));           // ★ true
const c1: Record<string, unknown> = { id: 1 }; c1.self = c1;
const c2: Record<string, unknown> = { id: 1 }; c2.self = c2;
deepEqual(c1, c2);                                     // ★ true, без бесконечной рекурсии
```

**T17. `deepClone`** · средняя · ⏱ 25 мин

```ts
function deepClone<T>(value: T): T;
```

- Примитивы — как есть; функции — та же ссылка.
- Массивы и объекты — глубоко; прототип сохраняется (экземпляр класса остаётся экземпляром).
- `Date`, `Map`, `Set` — новые объекты с глубоко скопированным содержимым. ★ `RegExp`.
- Циклы и общие ссылки сохраняются: два поля, которые указывали на один объект, в копии указывают на одну новую копию.
- Сравни со `structuredClone`: что он делает иначе?

```ts
const src: any = { n: 1, d: new Date(0), list: [1, { x: 2 }], m: new Map([['k', { v: 1 }]]), s: new Set([1]) };
src.self = src;
src.shared = src.list[1];
const copy = deepClone(src);
copy !== src;                    // true
copy.self === copy;              // true — цикл сохранён
copy.list[1] !== src.list[1];    // true — глубокая копия
copy.shared === copy.list[1];    // true — общая ссылка осталась общей
copy.d instanceof Date && copy.d.getTime() === 0 && copy.d !== src.d; // true
copy.m.get('k').v === 1 && copy.m.get('k') !== src.m.get('k');       // true
deepClone(42);                   // 42
deepClone(null);                 // null
const fn = () => 1;
deepClone({ fn }).fn === fn;     // true
class Point { x: number; constructor(x: number) { this.x = x; } }
deepClone(new Point(1)) instanceof Point;       // true
structuredClone(new Point(1)) instanceof Point; // false
structuredClone({ fn });                        // DOMException, name → 'DataCloneError'
```

**T18. Типизированный `TypedEmitter`** · средняя · ⏱ 25 мин

```ts
type EventMap = Record<string, unknown[]>;
class TypedEmitter<E extends EventMap> {
  on<K extends keyof E>(event: K, listener: (...args: E[K]) => void): () => void; // вернёт отписку
  once<K extends keyof E>(event: K, listener: (...args: E[K]) => void): () => void;
  off<K extends keyof E>(event: K, listener: (...args: E[K]) => void): void;
  emit<K extends keyof E>(event: K, ...args: E[K]): boolean; // true, если были слушатели
  listenerCount(event: keyof E): number;
}
```

- Один и тот же слушатель на одно событие добавляется один раз (как `addEventListener`).
- `emit` идёт по снимку списка: добавленные во время `emit` в этом `emit` не вызываются; отписка внутри обработчика не пропускает следующего.
- `off(event, listener)` снимает и слушатель, добавленный через `once`.
- Неверное имя события, тип или число аргументов — ошибка компиляции.
- ★ Ошибка в одном слушателе не мешает остальным: после цикла `emit` бросает `AggregateError`.
- Обсуди: почему карта событий объявлена через `type`, а не `interface` (см. Q49)?

```ts
type MarketEvents = { price: [symbol: string, price: number]; status: [state: 'open' | 'closed'] };
const bus = new TypedEmitter<MarketEvents>();
const got: string[] = [];
const off = bus.on('price', (s, p) => got.push(`${s}:${p}`));
bus.emit('price', 'AAPL', 190); // true; got → ['AAPL:190']
off();
bus.emit('price', 'AAPL', 191); // false; got не изменился
bus.once('status', (st) => got.push(st));
bus.emit('status', 'open'); bus.emit('status', 'closed'); // got → ['AAPL:190', 'open']
const order: string[] = [];
const offA = bus.on('price', () => { order.push('A'); offA(); });
bus.on('price', () => order.push('B'));
bus.emit('price', 'X', 1); bus.emit('price', 'X', 2);     // order → ['A', 'B', 'B']
const l = () => order.push('dup');
bus.on('status', l); bus.on('status', l);
bus.listenerCount('status'); // 1
const onceL = () => order.push('never');
bus.once('status', onceL); bus.off('status', onceL);
bus.listenerCount('status'); // 1
// @ts-expect-error — не хватает аргумента
bus.emit('price', 'AAPL');
// @ts-expect-error — нет такого события
bus.emit('volume', 1);
// @ts-expect-error — неверный тип аргумента у слушателя
bus.on('status', (st: number) => {});
```

**T19. `LRUCache`** · средняя · ⏱ 20 мин

```ts
class LRUCache<K, V> {
  constructor(capacity: number); // целое ≥ 1, иначе RangeError
  get(key: K): V | undefined;     // делает ключ самым свежим
  set(key: K, value: V): void;    // обновление тоже освежает; при переполнении вытесняет самый старый
  has(key: K): boolean;           // порядок не меняет
  get size(): number;
}
```

- `get` и `set` — O(1). Версия 1 — на `Map`. ★ Версия 2 — `Map` плюс двусвязный список: так спросят, если скажут «без порядка `Map`».
- Где пригодится: кэш свечей графика по `symbol + interval`, кэш аватаров игроков в лидерборде.

```ts
const c = new LRUCache<string, number>(2);
c.set('a', 1); c.set('b', 2);
c.get('a');      // 1 — теперь 'a' свежее 'b'
c.set('c', 3);   // вытесняет 'b'
c.has('b');      // false
c.get('b');      // undefined
c.set('a', 10);  // обновление освежает 'a'
c.set('d', 4);   // вытесняет 'c'
[c.get('a'), c.get('c'), c.get('d')]; // [10, undefined, 4]
c.size;          // 2
new LRUCache(0); // RangeError
```

**Самопроверка**

- Почему `JSON.stringify(a) === JSON.stringify(b)` — плохой `deepEqual`? Назови 3 случая.
- Что лежит в `WeakMap` у `deepClone` и почему именно `WeakMap`, а не `Map`?
- Почему `emit` идёт по копии списка слушателей? Какой баг будет без этого?
- Какая сложность у `get` и `set` в твоём LRU и почему?

**Готово, когда:** T16–T19 проходят тесты, включая ★-тесты хотя бы в двух задачах; можешь назвать сложность и крайние случаи каждой.

Дальше: [часть 5 — TypeScript](01-javascript-typescript-part5.md)
