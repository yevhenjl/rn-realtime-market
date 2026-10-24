# Тренинг 1: JavaScript и TypeScript — ответы и решения

Обновлено: 2026-10-21 · Тренинг 1 из 6 · ≈ 16 часов · Вакансия: [карточка](../../card.ru.md)

Ответы, часть 4 из 9 · [1](01-javascript-typescript-answers.md) · [2](01-javascript-typescript-answers-part2.md) · [3](01-javascript-typescript-answers-part3.md) · [5](01-javascript-typescript-answers-part5.md) · [6](01-javascript-typescript-answers-part6.md) · [7](01-javascript-typescript-answers-part7.md) · [8](01-javascript-typescript-answers-part8.md) · [9](01-javascript-typescript-answers-part9.md) · вопросы: [часть 4](../01-javascript-typescript/01-javascript-typescript-part4.md)

Как пользоваться и как проверено — в [части 1](01-javascript-typescript-answers.md#как-пользоваться-ответами). Все решения ниже прошли тесты из условия: таймерные — через `mock.timers` из `node:test`, остальные — на реальных таймерах (T14 — пять прогонов подряд).

## Блок 4. Live coding: асинхронные утилиты

Как вести себя на live coding: сначала уточни требования (порядок результатов, что при ошибке, пустой вход), назови крайние случаи, напиши простую версию, проговаривай решения и сам прогони тесты.

**T10. `promiseRace` и `promiseAny`** — O(n).

```ts
export function promiseRace<T>(values: Iterable<T | PromiseLike<T>>): Promise<Awaited<T>> {
  return new Promise((resolve, reject) => {
    for (const item of values) Promise.resolve(item).then(resolve, reject); // кто первый — тот и решил
  }); // пустой вход: ни resolve, ни reject — навсегда pending, как у Promise.race
}

export function promiseAny<T>(values: Iterable<T | PromiseLike<T>>): Promise<Awaited<T>> {
  return new Promise((resolve, reject) => {
    const items = Array.from(values);
    const errors: unknown[] = new Array(items.length);
    let left = items.length;
    if (left === 0) {
      reject(new AggregateError([], 'All promises were rejected'));
      return;
    }
    items.forEach((item, i) => {
      Promise.resolve(item).then(resolve, (error: unknown) => {
        errors[i] = error; // по индексу — порядок входа, а не времени
        if (--left === 0) reject(new AggregateError(errors, 'All promises were rejected'));
      });
    });
  });
}
```

Первый `resolve` / `reject` фиксирует результат — все последующие вызовы промис игнорирует, поэтому «гонка» решается сама. `promiseRace([])` по спецификации остаётся pending навсегда (тест ждёт 20 мс и проверяет, что он не завершился); в реальном коде пустой вход стоит проверять заранее. `promiseAny([])` отклоняется сразу — как встроенный `Promise.any([])` (проверено). **Ошибка:** `errors.push(error)` даёт порядок по времени — тест `['slow', 'fast']` это ловит. **Ошибка:** `values.length` — у `Set` его нет, у генератора тоже; сначала `Array.from`.

**T11. `debounce` с `cancel`, `flush`, `pending`** — O(1) на вызов.

```ts
type Debounced<A extends unknown[]> = ((...args: A) => void) & {
  cancel(): void;
  flush(): void;
  pending(): boolean;
};

export function debounce<A extends unknown[]>(fn: (...args: A) => void, wait: number): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastArgs: A | undefined;
  const invoke = () => {
    const args = lastArgs;
    timer = undefined;
    lastArgs = undefined;
    if (args) fn(...args);
  };
  const debounced = (...args: A) => {
    lastArgs = args;
    clearTimeout(timer); // каждый вызов перезапускает «тишину»
    timer = setTimeout(invoke, wait);
  };
  return Object.assign(debounced, {
    cancel() {
      clearTimeout(timer);
      timer = undefined;
      lastArgs = undefined;
    },
    flush() {
      if (timer === undefined) return; // нечего выполнять
      clearTimeout(timer); // иначе таймер выстрелит повторно
      invoke();
    },
    pending: () => timer !== undefined,
  });
}

// ★ leading + this: первый вызов серии — сразу, следующие в окне — один trailing
export function debounceLeading<This, A extends unknown[]>(fn: (this: This, ...args: A) => void, wait: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let trailing: { self: This; args: A } | undefined;
  return function (this: This, ...args: A) {
    if (timer === undefined) fn.apply(this, args);
    else trailing = { self: this, args };
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      if (trailing) fn.apply(trailing.self, trailing.args);
      trailing = undefined;
    }, wait);
  };
}
```

Как проходит тест: три вызова перезапускают один таймер; через 99 мс пусто, через 100 — `['abc']`. `cancel` забывает аргументы, `flush` выполняет сразу и снимает таймер — повтора через 200 мс нет; `flush` без отложенного вызова ничего не делает. `invoke` обнуляет состояние **до** вызова `fn` — если `fn` снова вызовет `debounced`, состояние не испортится. `Object.assign` сразу даёт нужный тип без `as`. ★ `debounceLeading` проверен тестом: `T1` сразу, `T3` через 100 мс тишины, `this` сохранён. Где в RN: поиск по тикерам (запрос после паузы в наборе), автосохранение настроек. **Ошибка в React:** создавать `debounce(...)` прямо в теле компонента — на каждом рендере новая функция со своим таймером, и debounce не работает. Нужен `useMemo` / `useRef` или хук из T28.

**T12. `throttle` с `leading` и `trailing`** — O(1) на вызов.

```ts
export function throttle<A extends unknown[]>(
  fn: (...args: A) => void,
  wait: number,
  { leading = true, trailing = true }: { leading?: boolean; trailing?: boolean } = {},
): ((...args: A) => void) & { cancel(): void } {
  let timer: ReturnType<typeof setTimeout> | undefined; // есть таймер = окно открыто
  let pendingArgs: A | undefined;
  const openWindow = () => {
    timer = setTimeout(() => {
      if (trailing && pendingArgs) {
        const args = pendingArgs;
        pendingArgs = undefined;
        fn(...args);
        openWindow(); // после trailing-вызова — новое окно
      } else {
        timer = undefined; // окно закрылось
      }
    }, wait);
  };
  const throttled = (...args: A) => {
    if (timer === undefined) {
      if (leading) fn(...args);
      else pendingArgs = args;
      openWindow();
    } else if (trailing) {
      pendingArgs = args; // в окне — только запоминаем последние
    }
  };
  return Object.assign(throttled, {
    cancel() {
      clearTimeout(timer);
      timer = undefined;
      pendingArgs = undefined;
    },
  });
}
```

Главный тест по времени: t=0 — `1` сразу (leading), `2` и `3` запомнены; t=100 — trailing с последними аргументами `3`, сразу новое окно; `4` запомнен; t=200 — trailing `4`, новое окно; t=300 — аргументов нет, окно закрылось; `5` — сразу. `leading: false` — первый вызов ждёт конца окна (`['b']`); `trailing: false` — вызовы внутри окна теряются (`['a', 'c']`); `cancel` забыл `2`, а `3` после закрытого окна прошёл сразу. Новое окно после trailing-вызова гарантирует частоту: без него trailing на t=100 и leading на t=101 дали бы два вызова подряд. Пример из трейдинга: цена в UI обновляется не чаще раза в 100 мс, но последнее значение показывается обязательно. **Ошибка:** throttle на `Date.now()` без trailing — последний тик теряется, и на экране «зависает» устаревшая цена.

**T13. `retry` с экспоненциальной задержкой и jitter.**

```ts
import { sleep } from './t8-sleep.ts';

type RetryOptions = {
  retries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter?: 'none' | 'full';
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  signal?: AbortSignal;
  random?: () => number;
  onRetry?: (info: { attempt: number; delayMs: number; error: unknown }) => void;
};

export async function retry<T>(fn: (attempt: number) => Promise<T>, options: RetryOptions): Promise<T> {
  const { retries, baseDelayMs, maxDelayMs, jitter = 'full', shouldRetry = () => true, signal, random = Math.random, onRetry } = options;
  for (let attempt = 1; ; attempt++) {
    signal?.throwIfAborted(); // отменили — fn больше не вызываем
    try {
      return await fn(attempt); // await внутри try — иначе catch не поймает reject
    } catch (error) {
      if (attempt > retries || !shouldRetry(error, attempt)) throw error;
      const capped = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const delayMs = jitter === 'full' ? Math.floor(random() * capped) : capped;
      onRetry?.({ attempt, delayMs, error });
      await sleep(delayMs, signal); // abort прерывает ожидание: reject с signal.reason
    }
  }
}
```

Как проходят тесты: `[10, 20]` и `n = 3` — две неудачи, третья попытка успешна. `retries: 5`, `maxDelayMs: 3` → задержки `min(3, 1·2^(k−1))` = `[1, 2, 3, 3, 3]`, после 6-й попытки `attempt > retries` → бросаем **последнюю** ошибку как есть (`'fail 6'`), не оборачивая. `random: () => 0.5` → `floor(0.5 · 10/20/40)` = `[5, 10, 20]`. `HttpError(404)` → `shouldRetry` вернул `false` → 1 вызов. Abort на 20-й мс прерывает `sleep(1000)` → reject `Error('user left')`, `fn` вызван 1 раз. Зачем jitter: 10 000 клиентов потеряли соединение с сервером котировок в одну секунду. Без jitter они повторяют синхронными волнами (1 с, 2 с, 4 с…) и снова кладут сервер — thundering herd. Full jitter равномерно размазывает повторы по `[0, cap)`; по замерам AWS это снижает и нагрузку, и общее время. Повтор ордера — только идемпотентно: клиент генерирует `clientOrderId` один раз на намерение пользователя. При таймауте сначала спроси статус ордера по этому id или повтори с тем же id. У Binance это `newClientOrderId`: ордер с тем же id отклоняется, пока предыдущий не исполнен, — проверь, как именно сервер отбрасывает дубли. 4xx (валидация, нет средств) не повторяют; сетевые ошибки, 5xx и 429 — с backoff и с учётом `Retry-After`.

**T14. `mapWithConcurrency`** — время близко к оптимальному жадному расписанию, память O(n).

```ts
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError(`limit must be an integer >= 1, got ${limit}`);
  const results = new Array<R>(items.length);
  const queue = items.entries(); // общий итератор: каждый next() выдаёт следующую задачу ровно одному воркеру
  let failed = false;
  const worker = async () => {
    for (const [index, item] of queue) {
      if (failed) return; // после первой ошибки новые задачи не стартуют
      try {
        results[index] = await fn(item, index);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  };
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers); // reject первой ошибкой; запущенные задачи доработают сами
  return results;
}
```

Идея: `limit` воркеров тянут задачи из **одного** итератора. JS однопоточный, `next()` синхронный — две задачи одному воркеру не достанутся, а `noUncheckedIndexedAccess` не мешает (нет `items[i]`). Свободный воркер сразу берёт следующую задачу — это не пачки. `[60, 10, 30, 40]`, `limit 2`: t=0 старт 0 и 1; t=10 конец 1 → старт 2; t=40 конец 2 → старт 3; t=60 конец 0; t=80 конец 3 → ровно ожидаемый `events`, итого 80 мс. «Пачки по 2» (`Promise.all` на чанках): 60 + 40 = 100 мс, и `start 2` только после `end 0`. Ошибка: воркер ставит `failed` и бросает; `Promise.all` отклоняется первой ошибкой. Другой воркер успел взять задачу 3 до ошибки и доделывает её, но 4 уже не берёт — в `calls` нет 4 и 5. `limit` проверяется внутри async-функции, поэтому `RangeError` приходит как reject (тест через `assert.rejects`). **Ошибка:** `items.map(fn)` (лимит не соблюдается), `results.push` (порядок по времени), нет остановки после ошибки.

**T15. ★ `latestOnly`** — O(1) на вызов.

```ts
export function latestOnly<A extends unknown[], R>(
  fn: (signal: AbortSignal, ...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  let current: AbortController | undefined;
  return (...args: A) => {
    current?.abort(); // reason по умолчанию — DOMException 'AbortError'
    const controller = new AbortController();
    current = controller;
    return new Promise<R>((resolve, reject) => {
      // устаревший вызов отклоняется, даже если fn игнорирует signal
      controller.signal.addEventListener('abort', () => reject(controller.signal.reason), { once: true });
      fn(controller.signal, ...args).then(resolve, reject);
    });
  };
}
```

Новый вызов отменяет `signal` предыдущего, и `sleep` из T8 отклоняется с `signal.reason` — `AbortError`. Обёртка-промис гарантирует reject устаревшего вызова, даже если `fn` не слушает `signal` (проверено отдельным тестом). Если `fn` уже завершился, поздний abort ничего не меняет. ★ Хук (проверен в Jest: второй вызов отменяет первый, размонтирование — последний):

```ts
export function useLatestRequest<A extends unknown[], R>(fn: (signal: AbortSignal, ...args: A) => Promise<R>) {
  const latestFn = useLatest(fn); // useLatest — из T30
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);
  return useCallback(
    (...args: A): Promise<R> => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      return new Promise<R>((resolve, reject) => {
        controller.signal.addEventListener('abort', () => reject(controller.signal.reason), { once: true });
        latestFn.current(controller.signal, ...args).then(resolve, reject);
      });
    },
    [latestFn],
  );
}
```

В компоненте отклонённый с `AbortError` вызов — не ошибка: в `catch` проверь `error.name === 'AbortError'` и ничего не показывай.

Дальше: [часть 5 — live coding: структуры данных](01-javascript-typescript-answers-part5.md)
