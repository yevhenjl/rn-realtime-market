# Тренинг 1: JavaScript и TypeScript — ответы и решения

Обновлено: 2026-10-21 · Тренинг 1 из 6 · ≈ 16 часов · Вакансия: [карточка](../../card.ru.md)

Ответы, часть 3 из 9 · [1](01-javascript-typescript-answers.md) · [2](01-javascript-typescript-answers-part2.md) · [4](01-javascript-typescript-answers-part4.md) · [5](01-javascript-typescript-answers-part5.md) · [6](01-javascript-typescript-answers-part6.md) · [7](01-javascript-typescript-answers-part7.md) · [8](01-javascript-typescript-answers-part8.md) · [9](01-javascript-typescript-answers-part9.md) · вопросы: [часть 3](../01-javascript-typescript/01-javascript-typescript-part3.md)

Как пользоваться и как проверено — в [части 1](01-javascript-typescript-answers.md#как-пользоваться-ответами).

## Блок 3. Асинхронность

### Вопросы Q36–Q46

**Q36. Event loop.** Call stack — выполняемые сейчас вызовы. Задачи (macrotasks): весь скрипт, колбэки `setTimeout` / `setInterval`, I/O, события UI и сети, `MessageChannel`, `setImmediate` в Node.js. Микрозадачи: реакции промисов (`then` / `catch` / `finally`), продолжения после `await`, `queueMicrotask`, `MutationObserver`; в Node.js ещё `process.nextTick` — своя очередь, она идёт раньше промисов. Цикл: взять одну задачу → выполнить до пустого стека → выполнить **все** микрозадачи, включая добавленные по ходу → в браузере, если пора, рендер (`requestAnimationFrame` → layout → paint, примерно раз в 16,7 мс при 60 Гц) → следующая задача. Очередь микрозадач опустошается после каждой задачи и каждый раз, когда стек пустеет: после каждого обработчика события, в Node.js (с 11-й версии) — после каждого колбэка таймера.

**Q37. Почему микрозадачи «вешают», а `setTimeout` — нет.** Следующая задача и рендер ждут пустой очереди микрозадач. Микрозадача, которая всё время ставит новую, не отпускает цикл: нет рендера и ввода, страница висит, как от `while (true)`. Рекурсивный `setTimeout` — это отдельные задачи; между ними браузер рисует и обрабатывает ввод, а вложенные таймеры глубже 5 уровней ещё и зажимаются минимум до 4 мс. `setTimeout(fn, 0)` не выполняется сразу: это задача с минимальной задержкой (в Node.js 1 мс), и она ждёт, пока закончится текущий код, выполнятся все микрозадачи и задачи, вставшие в очередь раньше.

**Q38. Event loop в React Native.** JS-поток: рендер React, бизнес-логика, обработчики. UI-поток (main): нативные view, жесты, монтирование. В New Architecture Fabric считает layout (Yoga) в C++ и может делать commit синхронно. RFC 0744 (только New Architecture) вводит цикл как в вебе: задача → все микрозадачи → «обновить рендеринг» (применить изменения Fabric). Одна итерация — одно атомарное обновление UI. Промисы — настоящие микрозадачи, а не полифил на таймерах. `useLayoutEffect` получает синхронный доступ к layout и блокирует отрисовку — нет мерцания. Таймеры: `setTimeout` / `setInterval` — задачи с задержкой; `setImmediate` — «как можно скорее» после текущей задачи (не завязывайся на порядок относительно таймеров); `requestAnimationFrame` — перед следующим кадром; `requestIdleCallback` — когда JS-поток свободен. `InteractionManager` удалён в RN 0.87, официальная замена — `requestIdleCallback`; тяжёлое обновление UI после жеста можно пометить `startTransition`. Не блокировать JS-поток: дробить работу на куски (`requestIdleCallback`, `setTimeout`); тяжёлые вычисления — в native через JSI (TurboModules, C++) или в отдельный worklet runtime; батчить обновления (T32); виртуализировать списки (Q79); анимации — на UI-потоке через Reanimated.

**Q39. Состояния промиса.** pending → fulfilled (значение) или rejected (причина). Settled — уже не pending. Resolved — судьба зафиксирована: промис либо settled, либо «привязан» к другому промису или thenable. Например, `resolve(pendingPromise)` — ещё pending, но уже resolved, и новые `resolve` / `reject` ничего не изменят. Executor выполняется синхронно внутри `new Promise`: работа стартует сразу, `resolve` / `reject` доступны немедленно (P15); исключение в executor — это reject, если промис ещё не resolved. Повторные `resolve` / `reject` игнорируются: выигрывает первый вызов (проверено: `throw` после `resolve` молча теряется). Отменить промис нельзя — это только место для будущего результата. Отменяют операцию (`AbortController`, T8) или игнорируют результат (T15).

**Q40. `then`, `catch`, `finally`.** `then` всегда возвращает новый промис `p2`. Колбэк вернул значение → `p2` fulfilled им; бросил → `p2` rejected; вернул промис или thenable → `p2` принимает его состояние, причём на нативном промисе это стоит 2 лишних тика (P14). Нет колбэка для исхода — исход проходит дальше. `.then(ok).catch(fail)`: `fail` ловит и исходный reject, и ошибку внутри `ok`. `.then(ok, fail)`: `fail` ловит только исходный reject, ошибка из `ok` уходит дальше по цепочке (проверено). `finally(cb)`: `cb` без аргументов; значение или ошибка цепочки сохраняются (`finally(() => 2)` → значение осталось `1`). Если `cb` бросил или вернул rejected-промис — эта ошибка заменяет результат. Если вернул pending-промис — цепочка его ждёт.

**Q41. Комбинаторы.**

| Метод | Успех | Ошибка | Пустой вход |
|---|---|---|---|
| `all` | массив значений в порядке входа | первая ошибка, не ждёт остальных | сразу `[]` |
| `allSettled` | всегда: `{ status, value }` / `{ status, reason }` | никогда | сразу `[]` |
| `race` | первый завершившийся — успех | первый завершившийся — ошибка | навсегда pending |
| `any` | первый успех | все упали → `AggregateError`, `errors` в порядке входа | сразу `AggregateError` |

`Promise.withResolvers()` (ES2024) отдаёт `{ promise, resolve, reject }` без трюка с замыканием executor — удобно оборачивать событийные API (дождаться `onopen` у WebSocket), очереди, тесты. `Promise.try(fn, ...args)` (ES2025) вызывает `fn` синхронно и любой исход — значение, промис или синхронное исключение — превращает в промис: `Promise.try(() => JSON.parse(raw)).catch(report)`.

**Q42. `async` / `await`.** Async-функция всегда возвращает промис: `return x` → fulfilled, `throw` → rejected, `return promise` → принимает его состояние. `await x` ≈ `Promise.resolve(x).then(продолжение, бросить внутрь)`: остаток функции продолжается в микрозадаче, даже если `x` не промис (`await 1` тоже уступает очередь). Waterfall — независимые запросы последовательно, итого сумма задержек:

```ts
const [quotes, news] = await Promise.all([getQuotes(), getNews()]); // оба запроса стартуют сразу
```

`await` внутри `forEach` не ждёт: `forEach` игнорирует возвращённые промисы, внешняя функция идёт дальше, ошибки становятся unhandled rejection (P18). Нужен `for...of` (последовательно: шаги зависят друг от друга или есть лимит запросов), `Promise.all(items.map(...))` (параллельно) или пул (T14). **Интервьюер ждёт:** слово «waterfall» и `Promise.all` для независимых запросов.

**Q43. Ошибки в асинхронном коде.**

- `try / catch` вокруг `await` ловит reject так же, как синхронный `throw`.
- `return await` нужен внутри `try` / `catch` / `finally`, иначе reject пролетает мимо `catch` (P19). Вне `try` он почти лишний, но оставляет функцию в async stack trace.
- Unhandled rejection: в браузере — событие `unhandledrejection` и «Uncaught (in promise)» в консоли, страница работает дальше; в Node.js 15+ по умолчанию процесс падает с кодом 1 (P17); в RN в dev — предупреждение LogBox, в проде — глобальный обработчик и отправка в Sentry.
- `Error.cause` (ES2022) сохраняет низкоуровневую причину.
- Свой класс ошибки — без parameter properties (их не стирает type stripping); в `catch (error)` тип `unknown` — сужай через `instanceof`. `AggregateError` — несколько ошибок сразу (`Promise.any`, emitter из T18).

```ts
export class HttpError extends Error {
  status: number;
  constructor(status: number, options?: ErrorOptions) {
    super(`HTTP ${status}`, options);
    this.name = 'HttpError';
    this.status = status;
  }
}
// ...
throw new Error('Failed to load quotes', { cause: error }); // причина не теряется
```

**Q44. Отмена и гонки.** `const c = new AbortController(); fetch(url, { signal: c.signal }); c.abort(reason)` — `fetch` отклоняется с `reason`, по умолчанию это `DOMException` с именем `AbortError`. `signal.aborted`, `signal.reason`, `signal.throwIfAborted()` (бросает `reason` — удобно в циклах), `addEventListener('abort', …, { once: true })`. `AbortSignal.timeout(ms)` — сигнал, который сам отменится с `TimeoutError`; `AbortSignal.any([userSignal, AbortSignal.timeout(5000)])` — отмена по любому из сигналов (в Node.js 24 оба есть, в RN проверь). Race condition: ввод `a`, `ab`, `abc` — три запроса в полёте, ответы приходят в любом порядке, медленный ответ на `a` перезаписывает выдачу для `abc`. То же при смене тикера на графике: история старого тикера приходит после нового. Решения: отменять предыдущий запрос (T15) — заодно экономия трафика; игнорировать устаревший ответ (флаг `ignore` в cleanup эффекта, сравнение id запроса или текущего символа); debounce ввода (T11); TanStack Query с ключом `['search', q]` — он передаёт `signal` в `queryFn` и не путает ответы.

**Q45. Async iterators.** Объект с `[Symbol.asyncIterator]()`, у итератора `next()` возвращает `Promise<{ value, done }>`. `for await (const x of src)` ждёт каждый шаг. Проще всего писать через `async function*`; `break` вызывает `return()`, а значит `finally` генератора — там закрывают сокет или отменяют запрос. Где пригодится: пагинация, поток котировок (сообщения WebSocket → асинхронная очередь), чтение стримов (`ReadableStream` и потоки Node.js — async iterable).

```ts
export async function* pages(): AsyncGenerator<Trade[]> {
  let cursor: string | undefined;
  do {
    const page = await fetchPage(cursor);
    yield page.items;
    cursor = page.next;
  } while (cursor);
}
for await (const items of pages()) console.log(items.length); // страница за страницей
const all = (await Array.fromAsync(pages())).flat(); // Trade[]
```

`Array.fromAsync` (ES2026) собирает async iterable в массив, дожидаясь элементов по очереди (в отличие от параллельного `Promise.all`). В песочнице с `target: es2025` `tsc` его не знает — добавь `"lib": ["esnext"]` (проверено).

**Q46. Web Workers.** Отдельный поток со своим глобальным окружением и event loop — для тяжёлой работы (парсинг большого JSON, расчёт индикаторов, крипто, картинки) без блокировки UI. Общение — `postMessage` / `onmessage`; данные копируются structured clone (Q24). Transferable objects (`ArrayBuffer`, `MessagePort`, `OffscreenCanvas`) передаются без копирования: отправитель теряет к ним доступ. `SharedArrayBuffer` + `Atomics` — общая память, нужна cross-origin isolation. В worker нет DOM, `window` и переменных главного потока; функции передать нельзя (`DataCloneError`), экземпляры классов приходят обычными объектами. В React Native Web Workers в ядре нет. Аналоги: Reanimated worklets — маленькие функции на UI runtime (анимации, жесты); `createWorkletRuntime` из `react-native-worklets` — отдельный JS runtime на другом потоке (минимум API: `performance.now`, `console`, остальное нужно передать); вернуть результат в основной runtime — `scheduleOnRN`. Тяжёлое и долгое — в native-модуль через JSI (TurboModule, C++).

### «Что выведет» P11–P20

**P11.**

```text
1
9
3
6
5
2
7
8
4
```

| Шаг | Вывод | Микрозадачи после шага | Таймеры |
|---|---|---|---|
| синхронный код | 1, 9 | `then(3)`, `queueMicrotask(6)` | T2, T7 |
| `then(3)` | 3 | `6`, `then(5)` | T2, T7, T4 |
| `6`, затем `then(5)` | 6, 5 | — | T2, T7, T4 |
| T2 | 2 | — | T7, T4 |
| T7 | 7 | `then(8)` | T4 |
| `then(8)` | 8 | — | T4 |
| T4 | 4 | — | — |

`then(5)` встаёт в очередь только после выполнения `then(3)` — поэтому `6` раньше `5`. `8` печатается раньше `4`: Node.js (с 11-й версии), как и браузер, выполняет микрозадачи после каждого колбэка таймера. `T4` зарегистрирован позже `T2` и `T7` — он последний.

**P12.**

```text
start
a1
b
end
a2
p1
p2
timeout
```

`a()` выполняется синхронно до первого `await`: `a1`, затем синхронный вызов `b()` → `b`. `b()` вернул уже выполненный промис; `await` на нативном промисе стоит 1 тик, поэтому продолжение `a` встало в очередь **раньше** `p1`. Потом `end`, затем микрозадачи: `a2`, `p1`, `p2` (её поставил `p1`), и только потом таймер. До оптимизации `await` в 2019 году (Node.js 10) `await` стоил 3 тика и вывод был бы `p1 p2 a2` — интервьюеры любят это уточнение.

**P13.**

```text
a1
b1
a2
b2
a3
```

Каждый следующий `then` встаёт в очередь только после выполнения предыдущего. Очередь: `[a1, b1]` → `a1` ставит `a2` → `b1` ставит `b2` → `[a2, b2]` → `a2` ставит `a3` → `[b2, a3]`. Цепочки чередуются по одному шагу.

**P14.**

```text
0
1
2
3
4
5
6
```

`return Promise.resolve(4)` из `then` добавляет **2 лишних тика**. Тик 1: `0` (колбэк вернул промис → в очередь задача NewPromiseResolveThenableJob) и `1`. Тик 2: эта задача вызывает `promise4.then(resolveOuter)` — промис уже выполнен, реакция встаёт в очередь; печатается `2`. Тик 3: `resolveOuter(4)` выполняет внешний промис и ставит в очередь `log(x)`; печатается `3`. Тик 4: `4`, потом `5`. Тик 5: `6`. Если вернуть просто `4`, вывод был бы `0 1 4 2 3 5 6`.

**P15.**

```text
A
E
F
then B
```

Executor синхронный: `A`; `resolve('B')` фиксирует результат; `reject` и второй `resolve` игнорируются; `resolve` не прерывает функцию, поэтому печатается `E`. Затем `F`, а реакция `then` — микрозадача → `then B`.

**P16.**

```text
then1 1
catch boom
finally
then3 2
```

`then1` бросает → `then2` пропущен → `catch` печатает и возвращает `2` → `finally` печатает, его `return 3` игнорируется → `then3` получает `2`. Если `finally` бросит (или вернёт rejected-промис), цепочка отклонится этой ошибкой, значение `2` потеряется, и `then3` не выполнится.

**P17.**

```text
after call
caught async x
```

…после чего Node.js 24 печатает в stderr стек `Error: x` и завершает процесс с кодом 1 (проверено). Почему: `failLater()` — async-функция, она не бросает синхронно, а возвращает rejected-промис. `try / catch` вокруг вызова без `await` ничего не ловит, поэтому `after call`. `main()` ждёт второй вызов — его reject ловится → `caught async x`. Когда очередь микрозадач опустела, у первого промиса нет обработчика → unhandled rejection; в Node.js 15+ режим по умолчанию `throw` — процесс падает. В браузере те же 2 строки, затем «Uncaught (in promise) Error: x» в консоли и событие `unhandledrejection`, страница продолжает работать. Исправление: `await` внутри `try` или `failLater().catch(handle)`.

**P18.**

```text
forEach done
forEach 10
forEach 20
forEach 30
for-of 30
for-of 10
for-of 20
for-of done
```

`withForEach` завершается почти за 0 мс: `forEach` запускает три async-колбэка и не ждёт их, поэтому `forEach done` печатается первым. Колбэки работают параллельно и печатают на 10, 20 и 30 мс — во время `await sleep(100)`. `withForOf` ждёт каждый шаг: 30 + 10 + 20 ≈ 60 мс (замер — 68 мс), порядок как во входе. Параллельная версия — ≈ 30 мс (замер — 32 мс):

```js
async function withForEach(items) {
  await Promise.all(items.map(async (ms) => {
    await sleep(ms);
    console.log('forEach', ms);
  }));
  console.log('forEach done');
}
```

**P19.**

```text
caught B
rejected A
```

`withoutAwait`: `return Promise.reject(...)` — это не исключение, а возврат промиса. Функция выходит из `try` сразу; результат async-функции «принимает» этот промис уже снаружи, поэтому `catch` не срабатывает и итог — reject `A`. `withAwait`: `await` разворачивает reject **внутри** `try` → `catch` → `'caught B'`. Порядок по тикам: результат `withoutAwait` resolved промисом (+2 тика, как в P14), а продолжение `withAwait` выполняется через 1 тик. Тик 1 — `withAwait` поймал ошибку и вернул строку; тик 2 — печать `caught B`; тик 3 — печать `rejected A`.

**P20.**

```text
any empty AggregateError
all empty []
all error b
race error b
allSettled [ 'fulfilled', 'rejected' ]
any a
```

`Promise.any([])` и `Promise.all([])` завершаются сразу при вызове, поэтому их обработчики — первые микрозадачи, в порядке подписки. На 10 мс срабатывают четыре таймера `b` (порядок регистрации: `all`, `allSettled`, `race`, `any`), после каждого — микрозадачи. `all` падает первой ошибкой → `all error b`; `allSettled` ждёт; `race` отклоняется → `race error b`; `any` запоминает ошибку. На 20 мс `c` — `all` уже завершён, результат игнорируется. На 30 мс: `allSettled` собрал оба исхода, а `any` получил первый успех `a`.

### Задачи T8–T9

**T8. `sleep` и `withTimeout`.**

```ts
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason); // уже отменён — сразу, таймер не ставим
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort); // не держим слушатель после завершения
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export class TimeoutError extends Error {
  override name = 'TimeoutError';
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(`timed out after ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
```

`c2.abort()` без аргумента ставит `reason` = `DOMException` с именем `AbortError` — отсюда ожидание теста. `{ once: true }` и `removeEventListener` после таймера — чтобы долгоживущий сигнал не копил слушатели (утечка). `finally` очищает таймер и при успехе, и при ошибке `promise` (тест `Error('own')`), иначе процесс или тест ждал бы лишний таймер. `withTimeout` **не отменяет** саму операцию: промис продолжает жить, мы только перестаём ждать. Отменить `fetch` по-настоящему: `fetch(url, { signal: AbortSignal.timeout(5_000) })` или `AbortSignal.any([userSignal, AbortSignal.timeout(5_000)])`. **Ошибка:** забыть ветку «уже отменён» — тогда `sleep` ждёт весь срок.

**T9. `promiseAll` и `promiseAllSettled`** — O(n).

```ts
// перегрузка для кортежей (как у встроенного): `| []` заставляет TS выводить кортеж
export function promiseAll<T extends readonly unknown[] | []>(values: T): Promise<{ -readonly [K in keyof T]: Awaited<T[K]> }>;
export function promiseAll<T>(values: Iterable<T | PromiseLike<T>>): Promise<Awaited<T>[]>;
export function promiseAll<T>(values: Iterable<T | PromiseLike<T>>): Promise<Awaited<T>[]> {
  return new Promise((resolve, reject) => {
    const items = Array.from(values); // любой iterable: массив, Set, генератор
    const results: Awaited<T>[] = new Array(items.length);
    let left = items.length;
    if (left === 0) {
      resolve(results);
      return;
    }
    items.forEach((item, i) => {
      Promise.resolve(item).then((value) => {
        results[i] = value; // по индексу, а не push: порядок входа
        if (--left === 0) resolve(results);
      }, reject); // первая ошибка — reject; повторные reject игнорируются
    });
  });
}

export function promiseAllSettled<T>(values: Iterable<T | PromiseLike<T>>): Promise<PromiseSettledResult<Awaited<T>>[]> {
  return promiseAll(
    Array.from(values, (item) =>
      Promise.resolve(item).then(
        (value): PromiseSettledResult<Awaited<T>> => ({ status: 'fulfilled', value }),
        (reason: unknown): PromiseSettledResult<Awaited<T>> => ({ status: 'rejected', reason }),
      ),
    ),
  );
}
```

`Promise.resolve(item)` одинаково обрабатывает значения, промисы и thenable. Счётчик `left`, а не `results.length`: массив создан нужной длины с дырками, и его длина ничего не говорит о готовности. Пустой вход — отдельная ветка, иначе промис навсегда pending. `reject` вызывается на первой ошибке, не дожидаясь медленных (тест `fast fail` < 100 мс); повторные вызовы `reject` / `resolve` промис игнорирует. `promiseAllSettled` превращает каждый исход в запись и переиспользует `promiseAll` — reject в нём невозможен. ★ Перегрузка `T extends readonly unknown[] | []` — приём из `lib.es2015.promise.d.ts`: литерал массива выводится как кортеж, и `await promiseAll([1, Promise.resolve('two'), …])` даёт тип `[number, string, boolean]` (проверено `tsc`). **Ошибка:** `results.push(value)` — порядок по времени завершения, тест `['a', 'b']` упадёт.

Дальше: [часть 4 — live coding: асинхронные утилиты](01-javascript-typescript-answers-part4.md)
