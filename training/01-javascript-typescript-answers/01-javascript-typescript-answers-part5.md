# Тренинг 1: JavaScript и TypeScript — ответы и решения

Обновлено: 2026-10-21 · Тренинг 1 из 6 · ≈ 16 часов · Вакансия: [карточка](../../card.ru.md)

Ответы, часть 5 из 9 · [1](01-javascript-typescript-answers.md) · [2](01-javascript-typescript-answers-part2.md) · [3](01-javascript-typescript-answers-part3.md) · [4](01-javascript-typescript-answers-part4.md) · [6](01-javascript-typescript-answers-part6.md) · [7](01-javascript-typescript-answers-part7.md) · [8](01-javascript-typescript-answers-part8.md) · [9](01-javascript-typescript-answers-part9.md) · вопросы: [часть 4, блок 5](../01-javascript-typescript/01-javascript-typescript-part4.md#блок-5-live-coding-структуры-данных-15-ч)

Как пользоваться и как проверено — в [части 1](01-javascript-typescript-answers.md#как-пользоваться-ответами). Все тесты из условия, включая ★, проходят; `@ts-expect-error` в T18 проверены `tsc`.

## Блок 5. Live coding: структуры данных

**T16. `deepEqual`** — O(n) по размеру структуры.

```ts
export function deepEqual(a: unknown, b: unknown, seen = new WeakMap<object, object>()): boolean {
  if (Object.is(a, b)) return true; // примитивы, NaN, ±0, одна и та же ссылка (функции — тоже тут)
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false; // [] ≠ {}, Date ≠ {}
  if (seen.get(a) === b) return true; // ★ эту пару уже сравниваем выше по стеку — цикл
  seen.set(a, b);
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [key, value] of a) if (!b.has(key) || !deepEqual(value, b.get(key), seen)) return false;
    return true;
  }
  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    for (const value of a) if (!b.has(value)) return false; // элементы-объекты — по ссылке
    return true;
  }
  if (Array.isArray(a) && Array.isArray(b) && a.length !== b.length) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.hasOwn(b, key)) return false; // { a: undefined } ≠ {}
    if (!deepEqual(Reflect.get(a, key), Reflect.get(b, key), seen)) return false;
  }
  return true;
}
```

Порядок проверок важен. `Object.is` сразу закрывает `NaN`, `0 / -0` и функции (равны только по ссылке). Сравнение прототипов отсекает `[]` против `{ 0: 1, 1: 2, length: 2 }` и `Date` против `{}`. `Object.hasOwn` отличает `{ a: undefined }` от `{}` — простое `b[key] === undefined` здесь ошиблось бы. Порядок ключей не важен: идём по ключам `a` и проверяем их наличие в `b`. Длина массивов сравнивается отдельно: `Object.keys` не видит дырок, а `[ , ]` и `[]` разной длины. ★ Цикл: пару `a → b` запоминаем **до** рекурсии; встретив её снова, считаем равной — сравнение уже идёт выше по стеку. Ограничения: `new Number(1)` и `new Number(2)`, `/a/` и `/b/` окажутся «равны» (своих перечисляемых ключей нет) — нужны отдельные ветки; символьные ключи не сравниваются. Почему `JSON.stringify(a) === JSON.stringify(b)` — плохой `deepEqual`: порядок ключей влияет на результат; `undefined` пропадает, а `NaN` становится `null`; `Map` и `Set` превращаются в `{}`; на цикле — исключение.

**T17. `deepClone`** — O(n) по числу узлов.

```ts
export function deepClone<T>(value: T): T {
  return cloneValue(value, new WeakMap()) as T; // одно приведение на входе: внутри работаем с unknown
}

function cloneValue(value: unknown, seen: WeakMap<object, unknown>): unknown {
  if (typeof value !== 'object' || value === null) return value; // примитивы и функции — как есть
  if (seen.has(value)) return seen.get(value); // цикл или общая ссылка → та же копия
  if (value instanceof Date) return remember(seen, value, new Date(value.getTime()));
  if (value instanceof RegExp) return remember(seen, value, new RegExp(value.source, value.flags));
  if (value instanceof Map) {
    const copy = remember(seen, value, new Map<unknown, unknown>()); // запомнить ДО обхода детей
    for (const [k, v] of value) copy.set(cloneValue(k, seen), cloneValue(v, seen));
    return copy;
  }
  if (value instanceof Set) {
    const copy = remember(seen, value, new Set<unknown>());
    for (const v of value) copy.add(cloneValue(v, seen));
    return copy;
  }
  const copy: object = Array.isArray(value) ? new Array(value.length) : Object.create(Object.getPrototypeOf(value));
  seen.set(value, copy);
  for (const key of Reflect.ownKeys(value)) { // строковые и символьные ключи
    if (!Object.prototype.propertyIsEnumerable.call(value, key)) continue; // length массива и т. п.
    Reflect.set(copy, key, cloneValue(Reflect.get(value, key), seen));
  }
  return copy;
}

function remember<C>(seen: WeakMap<object, unknown>, original: object, copy: C): C {
  seen.set(original, copy);
  return copy;
}
```

`seen` — карта «оригинал → копия». Копию регистрируем **до** обхода детей: цикл `src.self` вернёт копию, которая ещё строится, а `shared` и `list[1]` получат одну и ту же новую копию — так проходят тесты `copy.self === copy` и `copy.shared === copy.list[1]`. `Object.create(прототип)` сохраняет класс: `deepClone(new Point(1)) instanceof Point`. `new Array(length)` сохраняет дырки. Ключи `Map` тоже копируются: ключ-объект в копии — новый объект. Почему `WeakMap`, а не `Map`: внутри одного вызова разницы нет, но `WeakMap` не продлит жизнь исходному графу, если карту переиспользуют, и явно говорит о намерении. Ограничения: приватные `#поля` скопировать нельзя — метод копии, читающий `#v`, бросит `TypeError` (проверено); typed arrays, `ArrayBuffer`, `Error` нужно разбирать отдельно; геттеры оригинала вызываются, и в копии они станут обычными значениями. Чем отличается `structuredClone`: теряет прототипы (`Point` → обычный объект), на функции бросает `DataCloneError`, отбрасывает символьные ключи (всё проверено), зато знает больше встроенных типов. Циклы и общие ссылки он тоже сохраняет.

**T18. Типизированный `TypedEmitter`** — `on` / `off` O(1), `emit` O(число слушателей).

```ts
type EventMap = Record<string, unknown[]>;
type Listener<A extends unknown[]> = (...args: A) => void;
type Registry<E extends EventMap> = { [K in keyof E]?: Set<Listener<E[K]>> };

export class TypedEmitter<E extends EventMap> {
  #listeners: Registry<E> = Object.create(null); // без прототипа: событие 'toString' не сломает поиск
  #onceListeners: Registry<E> = Object.create(null);

  on<K extends keyof E>(event: K, listener: Listener<E[K]>): () => void {
    (this.#listeners[event] ??= new Set()).add(listener); // Set: повторное добавление игнорируется
    return () => this.off(event, listener);
  }

  once<K extends keyof E>(event: K, listener: Listener<E[K]>): () => void {
    (this.#onceListeners[event] ??= new Set()).add(listener); // без обёртки → off(listener) работает
    return this.on(event, listener);
  }

  off<K extends keyof E>(event: K, listener: Listener<E[K]>): void {
    this.#listeners[event]?.delete(listener);
    this.#onceListeners[event]?.delete(listener);
  }

  emit<K extends keyof E>(event: K, ...args: E[K]): boolean {
    const listeners = this.#listeners[event];
    if (!listeners || listeners.size === 0) return false;
    const errors: unknown[] = [];
    for (const listener of [...listeners]) { // снимок: изменения списка во время emit не влияют на этот emit
      if (this.#onceListeners[event]?.delete(listener)) listeners.delete(listener); // once — снять до вызова
      try {
        listener(...args);
      } catch (error) {
        errors.push(error); // ★ один упавший слушатель не мешает остальным
      }
    }
    if (errors.length > 0) throw new AggregateError(errors, `${String(event)}: ${errors.length} listener(s) failed`);
    return true;
  }

  listenerCount(event: keyof E): number {
    return this.#listeners[event]?.size ?? 0;
  }
}
```

Решения по требованиям:

- `Set` на событие даёт дедупликацию, как у `addEventListener`, и порядок добавления → `listenerCount('status')` = 1 после двух `on(l)`.
- `once` не оборачивает слушатель, а помечает его в отдельном `Set`. Поэтому `off(event, onceL)` снимает его напрямую: с обёрткой понадобилась бы карта «оригинал → обёртка». Once-слушатель снимается до вызова — повторный `emit` изнутри обработчика его уже не вызовет.
- Снимок `[...listeners]` нужен по двум причинам. В массиве удаление текущего элемента сдвигает индексы, и следующий слушатель пропускается — классический баг (тест `['A', 'B', 'B']`). Живой `Set` при переборе вызывает и слушателей, добавленных во время `emit`. Оба эффекта проверены в Node.js; со снимком их нет. Это семантика `EventEmitter` в Node.js; в DOM `EventTarget` слушатель, снятый во время dispatch, уже не вызывается.
- Типы без `any`: `Registry<E>` — mapped type по `K`, поэтому `this.#listeners[event]` имеет тип `Set<Listener<E[K]>>` и связь «событие → аргументы» не теряется. Ошибки компиляции — неверное имя события, число или тип аргументов, тип параметра слушателя (все три `@ts-expect-error` срабатывают).
- `Object.create(null)` — событие с именем `toString` не находит метод прототипа (проверено).
- Почему карта событий — `type`, а не `interface` (Q49): у interface нет неявной index signature, и `new TypedEmitter<MarketEventsInterface>()` — ошибка «Index signature for type 'string' is missing» (проверено).

**T19. `LRUCache`** — `get` / `set` O(1).

```ts
export class LRUCache<K, V> {
  readonly #capacity: number;
  readonly #map = new Map<K, V>(); // порядок вставки: первый ключ — самый старый

  constructor(capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError(`capacity must be an integer >= 1, got ${capacity}`);
    this.#capacity = capacity;
  }

  get(key: K): V | undefined {
    if (!this.#map.has(key)) return undefined;
    const value = this.#map.get(key) as V; // has + get: V сам может включать undefined
    this.#map.delete(key); // delete + set = переставить в конец (самый свежий)
    this.#map.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    this.#map.delete(key); // обновление тоже освежает
    this.#map.set(key, value);
    if (this.#map.size > this.#capacity) {
      const oldest = this.#map.keys().next();
      if (!oldest.done) this.#map.delete(oldest.value);
    }
  }

  has(key: K): boolean {
    return this.#map.has(key); // порядок не трогаем
  }

  get size(): number {
    return this.#map.size;
  }
}
```

Версия 1 опирается на то, что `Map` хранит порядок вставки: «освежить» = удалить и вставить заново, самый старый — первый ключ (`keys().next()` за O(1)). `has` порядок не меняет — так требует условие. Значение `undefined` в кэше отличается от промаха через `has` (проверено). ★ Версия 2 — если скажут «без порядка `Map`»: `Map<K, узел>` для поиска за O(1) плюс двусвязный список для порядка.

```ts
type LruNode<K, V> = { key: K; value: V; prev: LruNode<K, V> | null; next: LruNode<K, V> | null };

export class LinkedLRUCache<K, V> {
  readonly #capacity: number;
  readonly #nodes = new Map<K, LruNode<K, V>>();
  #head: LruNode<K, V> | null = null; // самый свежий
  #tail: LruNode<K, V> | null = null; // самый старый

  constructor(capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError(`capacity must be an integer >= 1, got ${capacity}`);
    this.#capacity = capacity;
  }

  get(key: K): V | undefined {
    const node = this.#nodes.get(key);
    if (!node) return undefined;
    this.#moveToHead(node);
    return node.value;
  }

  set(key: K, value: V): void {
    const existing = this.#nodes.get(key);
    if (existing) {
      existing.value = value;
      this.#moveToHead(existing);
      return;
    }
    const node: LruNode<K, V> = { key, value, prev: null, next: null };
    this.#nodes.set(key, node);
    this.#pushHead(node);
    if (this.#nodes.size > this.#capacity && this.#tail) {
      const oldest = this.#tail;
      this.#unlink(oldest);
      this.#nodes.delete(oldest.key);
    }
  }

  has(key: K): boolean {
    return this.#nodes.has(key);
  }

  get size(): number {
    return this.#nodes.size;
  }

  #moveToHead(node: LruNode<K, V>): void {
    if (this.#head === node) return;
    this.#unlink(node);
    this.#pushHead(node);
  }

  #pushHead(node: LruNode<K, V>): void {
    node.next = this.#head;
    if (this.#head) this.#head.prev = node;
    this.#head = node;
    this.#tail ??= node;
  }

  #unlink(node: LruNode<K, V>): void {
    if (node.prev) node.prev.next = node.next;
    else this.#head = node.next;
    if (node.next) node.next.prev = node.prev;
    else this.#tail = node.prev;
    node.prev = null;
    node.next = null;
  }
}
```

Обе версии прошли один и тот же набор: тест из условия, ёмкость 1, значение `undefined`. Узел хранит `key`, чтобы при вытеснении хвоста удалить запись из `Map`. Типичные ошибки: забыть обновить `tail`, когда удаляется последний узел; при `set` существующего ключа создать второй узел вместо перемещения. `readonly #поле` и `get size()` — стираемый синтаксис, работает в Node.js без сборки (parameter properties в конструкторе — нет). Где пригодится: кэш свечей графика по ключу `` `${symbol}:${interval}` ``, кэш аватаров игроков в лидерборде.

Дальше: [часть 6 — TypeScript: основа](01-javascript-typescript-answers-part6.md)
