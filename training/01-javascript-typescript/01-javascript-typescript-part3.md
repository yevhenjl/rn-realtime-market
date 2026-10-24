# JavaScript и TypeScript: вопросы и задачи

Обновлено: 2026-10-21 · Тренинг 1 из 6 · ≈ 16 часов · Вакансия: [карточка](../../card.ru.md)

Часть 3 из 6 · [часть 1](01-javascript-typescript.md) · [часть 2](01-javascript-typescript-part2.md) · [часть 4](01-javascript-typescript-part4.md) · [часть 5](01-javascript-typescript-part5.md) · [часть 6](01-javascript-typescript-part6.md) · [ответы](../01-javascript-typescript-answers/01-javascript-typescript-answers.md)

Правила те же, что в [части 1](01-javascript-typescript.md#как-тренироваться-с-ai): сначала сам, потом сверь с AI. Среда для всех `P`: Node.js 24, файл `.mjs` (ES module, strict mode).

## Блок 3. Асинхронность (2 ч)

**Цель:** безошибочно предсказывать порядок выполнения, писать асинхронный код с правильной обработкой ошибок и отменой.

**Что повторить**

- Порядок: синхронный код → все микрозадачи (`then` / `catch` / `finally`, продолжения после `await`, `queueMicrotask`) → одна задача (таймер, I/O, событие) → снова все микрозадачи → в браузере рендер. `then` всегда возвращает новый промис; код после `await` — микрозадача.
- Читать: [MDN: модель выполнения](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model), [MDN: микрозадачи](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide), [событийный цикл](https://learn.javascript.ru/event-loop), [микрозадачи](https://learn.javascript.ru/microtask-queue).
- Промисы: [основы](https://learn.javascript.ru/promise-basics), [цепочки](https://learn.javascript.ru/promise-chaining), [ошибки](https://learn.javascript.ru/promise-error-handling), [Promise API](https://learn.javascript.ru/promise-api), [async/await](https://learn.javascript.ru/async-await), [асинхронные итераторы](https://learn.javascript.ru/async-iterators-generators).
- Отмена: [прерывание fetch](https://learn.javascript.ru/fetch-abort), [MDN: AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController).
- React Native: [New Architecture и event loop](https://reactnative.dev/blog/2024/10/23/the-new-architecture-is-here), [RFC 0744: well-defined event loop](https://github.com/react-native-community/discussions-and-proposals/blob/main/proposals/0744-well-defined-event-loop.md), [RN 0.87: `InteractionManager` удалён, вместо него `requestIdleCallback`](https://reactnative.dev/blog/2026/08/11/react-native-0.87).
- Workers: [MDN: Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers).

**Практика 1. Вопросы** (≈ 35 мин)

- **Q36.** Опиши event loop: call stack, очередь задач (macrotasks), очередь микрозадач, рендеринг. Что относится к микрозадачам, а что к задачам? Когда очередь микрозадач опустошается?
- **Q37.** Почему бесконечная цепочка микрозадач «вешает» страницу, а рекурсивный `setTimeout` — нет? Почему `setTimeout(fn, 0)` не выполняется сразу?
- **Q38.** Как это устроено в React Native: JS-поток и UI-поток; «well-defined event loop» в New Architecture (RFC 0744); таймеры (`setTimeout`, `setImmediate`, `requestAnimationFrame`, `requestIdleCallback`); чем заменить `InteractionManager` (удалён в RN 0.87)? Как не блокировать JS-поток тяжёлой работой?
- **Q39.** Состояния промиса: pending, fulfilled, rejected; чем «settled» отличается от «resolved»? Почему executor выполняется синхронно? Что будет при повторном `resolve` / `reject`? Можно ли отменить промис?
- **Q40.** Что возвращает `then`? Что происходит, если колбэк вернул значение, бросил ошибку, вернул промис или thenable? Чем `.then(ok).catch(fail)` отличается от `.then(ok, fail)`? Как `finally` влияет на значение и на ошибку?
- **Q41.** `Promise.all`, `allSettled`, `race`, `any`: поведение при ошибке, результат для пустого массива, `AggregateError`. Зачем нужны `Promise.withResolvers` (ES2024) и `Promise.try` (ES2025)?
- **Q42.** `async` / `await`: что всегда возвращает async-функция? Во что «раскрывается» `await` и почему код после него — микрозадача? Последовательные и параллельные `await` (waterfall): как распараллелить независимые запросы? Почему `await` внутри `forEach` не ждёт?
- **Q43.** Ошибки в асинхронном коде: `try / catch` вокруг `await`; когда нужен `return await`; unhandled rejections (в браузере — событие `unhandledrejection`, в Node.js процесс по умолчанию падает); `Error.cause`; свои классы ошибок; `AggregateError`.
- **Q44.** Отмена: `AbortController` / `AbortSignal` (`abort(reason)`, `signal.reason`, `throwIfAborted()`, `AbortSignal.timeout()`, `AbortSignal.any()`). Как отменить `fetch`? Что такое race condition при быстром вводе в поиске или при смене тикера на графике, и как её избежать?
- **Q45.** Async iterators и `for await...of`: как устроены (`Symbol.asyncIterator`) и где пригодятся (пагинация, поток котировок, чтение стрима)? Что делает `Array.fromAsync`?
- **Q46.** Web Workers: зачем они, как общаются (`postMessage`, structured clone, transferable objects), что в них нельзя (DOM, функции)? Какие аналоги есть в React Native (worklets, отдельные JS-рантаймы)?

**Практика 2. «Что выведет»** (≈ 45 мин). Для каждого пазла: сначала таблица очередей на бумаге, потом `node`.

**P11.** Микрозадачи и таймеры. В каком порядке выведутся числа?

```js
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve()
  .then(() => {
    console.log('3');
    setTimeout(() => console.log('4'), 0);
  })
  .then(() => console.log('5'));
queueMicrotask(() => console.log('6'));
setTimeout(() => {
  console.log('7');
  Promise.resolve().then(() => console.log('8'));
}, 0);
console.log('9');
```

**P12.** `async` / `await`. В каком порядке?

```js
async function a() {
  console.log('a1');
  await b();
  console.log('a2');
}
async function b() {
  console.log('b');
}
console.log('start');
setTimeout(() => console.log('timeout'), 0);
a();
Promise.resolve()
  .then(() => console.log('p1'))
  .then(() => console.log('p2'));
console.log('end');
```

**P13.** Две цепочки. В каком порядке?

```js
Promise.resolve()
  .then(() => console.log('a1'))
  .then(() => console.log('a2'))
  .then(() => console.log('a3'));
Promise.resolve()
  .then(() => console.log('b1'))
  .then(() => console.log('b2'));
```

**P14.** Промис из `then`. В каком порядке выведутся числа? Сколько «лишних» тиков добавляет `return Promise.resolve(4)`?

```js
Promise.resolve()
  .then(() => {
    console.log(0);
    return Promise.resolve(4);
  })
  .then((x) => console.log(x));
Promise.resolve()
  .then(() => console.log(1))
  .then(() => console.log(2))
  .then(() => console.log(3))
  .then(() => console.log(5))
  .then(() => console.log(6));
```

**P15.** Executor. Что выведет?

```js
const p = new Promise((resolve, reject) => {
  console.log('A');
  resolve('B');
  reject(new Error('C'));
  resolve('D');
  console.log('E');
});
p.then((v) => console.log('then', v), (e) => console.log('error', e.message));
console.log('F');
```

**P16.** `then` / `catch` / `finally`. Что выведет? Что вернёт цепочка, если `finally` бросит ошибку?

```js
Promise.resolve(1)
  .then((x) => {
    console.log('then1', x);
    throw new Error('boom');
  })
  .then(() => console.log('then2'))
  .catch((e) => {
    console.log('catch', e.message);
    return 2;
  })
  .finally(() => {
    console.log('finally');
    return 3;
  })
  .then((x) => console.log('then3', x));
```

**P17.** `try / catch` без `await`. Что выведет и что произойдёт дальше в Node.js 24? А в браузере?

```js
async function failLater() {
  throw new Error('x');
}
try {
  failLater();
  console.log('after call');
} catch (e) {
  console.log('caught sync');
}
async function main() {
  try {
    await failLater();
  } catch (e) {
    console.log('caught async', e.message);
  }
}
main();
```

**P18.** `forEach` и `for...of` (top-level await). Что и в каком порядке выведет? Сколько примерно миллисекунд занимает каждая функция? Перепиши `withForEach`, чтобы она ждала все задачи параллельно.

```js
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function withForEach(items) {
  items.forEach(async (ms) => {
    await sleep(ms);
    console.log('forEach', ms);
  });
  console.log('forEach done');
}
async function withForOf(items) {
  for (const ms of items) {
    await sleep(ms);
    console.log('for-of', ms);
  }
  console.log('for-of done');
}
await withForEach([30, 10, 20]);
await sleep(100);
await withForOf([30, 10, 20]);
```

**P19.** `return` или `return await`. Что и в каком порядке выведет? Почему `catch` в первой функции не срабатывает?

```js
async function withoutAwait() {
  try {
    return Promise.reject(new Error('A'));
  } catch {
    return 'caught A';
  }
}
async function withAwait() {
  try {
    return await Promise.reject(new Error('B'));
  } catch {
    return 'caught B';
  }
}
withoutAwait().then(console.log, (e) => console.log('rejected', e.message));
withAwait().then(console.log, (e) => console.log('rejected', e.message));
```

**P20.** Комбинаторы. Что и в каком порядке выведет?

```js
const delay = (ms, value, fail = false) =>
  new Promise((resolve, reject) =>
    setTimeout(() => (fail ? reject(new Error(value)) : resolve(value)), ms));

Promise.all([delay(30, 'a'), delay(10, 'b', true), delay(20, 'c')])
  .then((v) => console.log('all', v))
  .catch((e) => console.log('all error', e.message));
Promise.allSettled([delay(30, 'a'), delay(10, 'b', true)])
  .then((r) => console.log('allSettled', r.map((x) => x.status)));
Promise.race([delay(30, 'a'), delay(10, 'b', true)])
  .then((v) => console.log('race', v))
  .catch((e) => console.log('race error', e.message));
Promise.any([delay(30, 'a'), delay(10, 'b', true)])
  .then((v) => console.log('any', v));
Promise.any([]).catch((e) => console.log('any empty', e.constructor.name));
Promise.all([]).then((v) => console.log('all empty', v));
```

**Практика 3. Задачи** (≈ 40 мин). Асинхронные тесты пиши через `async` и `assert.rejects`. Не оставляй промис без обработчика: в `node:test` это валит тест.

**T8. `sleep` и `withTimeout`** · лёгкая · ⏱ 15 мин

```ts
function sleep(ms: number, signal?: AbortSignal): Promise<void>;
class TimeoutError extends Error {} // name === 'TimeoutError'
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T>;
```

- `sleep` резолвится через `ms`. Если `signal` уже отменён — сразу reject с `signal.reason`. При отмене — `clearTimeout` и reject с `signal.reason`. После завершения слушатель `abort` снимается.
- `withTimeout` возвращает результат `promise`, если он успел за `ms`, иначе reject с `TimeoutError`. Таймер очищается в обоих случаях.
- Обсуди: отменяет ли `withTimeout` саму операцию? Как сделать это для `fetch` (`AbortSignal.timeout`)?

```ts
await sleep(50);                                   // ≈ 50 мс
const c = new AbortController();
const p = sleep(1000, c.signal);
c.abort(new Error('cancelled'));
await p;                                           // reject: Error('cancelled')
const c2 = new AbortController();
c2.abort();
await sleep(10, c2.signal);                        // reject: DOMException, name === 'AbortError'
await withTimeout(sleep(10).then(() => 'ok'), 100);       // 'ok'
await withTimeout(sleep(100).then(() => 'late'), 10);     // reject: TimeoutError
await withTimeout(Promise.reject(new Error('own')), 100); // reject: Error('own')
```

**T9. `promiseAll` и `promiseAllSettled`** · средняя · ⏱ 25 мин

```ts
function promiseAll<T>(values: Iterable<T | PromiseLike<T>>): Promise<Awaited<T>[]>;
function promiseAllSettled<T>(values: Iterable<T | PromiseLike<T>>): Promise<PromiseSettledResult<Awaited<T>>[]>;
```

- Без встроенных `Promise.all` и `Promise.allSettled`. Порядок результатов — как на входе, а не по времени завершения.
- Принимают любой iterable (массив, `Set`, генератор) и значения-не-промисы. Пустой вход — сразу `[]`.
- `promiseAll` отклоняется первой ошибкой, не дожидаясь остальных; `promiseAllSettled` не отклоняется никогда.
- ★ Типы как у встроенного: кортеж на входе — кортеж на выходе (см. `PromiseAll` в T24).

```ts
await promiseAll([1, Promise.resolve(2), sleep(10).then(() => 3)]);       // [1, 2, 3]
await promiseAll([]);                                                     // []
await promiseAll(new Set([1, 2]));                                        // [1, 2]
await promiseAll([sleep(30).then(() => 'a'), sleep(10).then(() => 'b')]); // ['a', 'b']
await promiseAll([sleep(200).then(() => 'slow'), Promise.reject(new Error('fast fail'))]);
// reject: Error('fast fail') — сразу, а не через 200 мс
await promiseAllSettled([Promise.resolve(1), Promise.reject(new Error('x')), 3]);
// [{ status: 'fulfilled', value: 1 }, { status: 'rejected', reason: Error('x') }, { status: 'fulfilled', value: 3 }]
await promiseAllSettled([]);                                              // []
```

**Самопроверка**

- Нарисуй очереди (стек, микрозадачи, задачи) для P11 без запуска кода.
- Когда `await` в цикле `for...of` — правильное решение (зависимые шаги), а когда — замечание на ревью?
- Как гарантировать, что ответ на старый поисковый запрос не перезапишет результат нового?
- Что будет с жестами и анимациями в RN-приложении, если JS-поток занят 300 мс? Что из анимаций при этом продолжит работать и почему?

**Готово, когда:** в P11–P20 не больше 2 ошибок с первой попытки, и каждую ты объясняешь таблицей очередей; T8–T9 проходят тесты; на Q36–Q46 отвечаешь без подсказок.

Дальше: [часть 4 — live coding: асинхронные утилиты и структуры данных](01-javascript-typescript-part4.md)
