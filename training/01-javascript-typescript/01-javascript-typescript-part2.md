# JavaScript и TypeScript: вопросы и задачи

Обновлено: 2026-10-21 · Тренинг 1 из 6 · ≈ 16 часов · Вакансия: [карточка](../../card.ru.md)

Часть 2 из 6 · [часть 1](01-javascript-typescript.md) · [часть 3](01-javascript-typescript-part3.md) · [часть 4](01-javascript-typescript-part4.md) · [часть 5](01-javascript-typescript-part5.md) · [часть 6](01-javascript-typescript-part6.md) · [ответы](../01-javascript-typescript-answers/01-javascript-typescript-answers.md)

Правила те же, что в [части 1](01-javascript-typescript.md#как-тренироваться-с-ai): сначала сам, потом сверь с AI. Среда для всех `P`: Node.js 24, файл `.mjs` (ES module, strict mode).

## Блок 2. JS: объекты и данные (1,5 ч)

**Цель:** понимать, как устроены объекты, классы и модули; копировать данные без сюрпризов; знать ловушки чисел и денег.

**Что повторить**

- Прототипы и классы: поиск свойства идёт по цепочке `[[Prototype]]` до `null`; `class` — строгий синтаксис над той же моделью. Читать: [прототипное наследование](https://learn.javascript.ru/prototype-inheritance), [F.prototype](https://learn.javascript.ru/function-prototype), [классы](https://learn.javascript.ru/class), [наследование классов](https://learn.javascript.ru/class-inheritance), [приватные свойства](https://learn.javascript.ru/private-protected-properties-methods).
- Модули: [введение в модули](https://learn.javascript.ru/modules-intro).
- Итераторы и генераторы: [перебираемые объекты](https://learn.javascript.ru/iterable), [генераторы](https://learn.javascript.ru/generators), [MDN: Iterator и iterator helpers](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Iterator).
- Копирование и коллекции: [MDN: structuredClone](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone), [Map и Set](https://learn.javascript.ru/map-set), [WeakMap и WeakSet](https://learn.javascript.ru/weakmap-weakset).
- Память: [сборка мусора](https://learn.javascript.ru/garbage-collection), [MDN: Memory management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_management).
- Числа и деньги: double не хранит точно `0.1`; деньги — в целых minor units или `BigInt` — [числа](https://learn.javascript.ru/number), [BigInt](https://learn.javascript.ru/bigint).
- `Intl`: [MDN: Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat), [MDN: Intl.PluralRules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules). В Hermes `Intl` опирается на API платформы; [документ Hermes](https://github.com/facebook/hermes/blob/main/doc/IntlAPIs.md) перечисляет опции, которых нет на iOS (`notation: 'compact'`, `signDisplay`, `formatToParts`). Что из этого изменилось в Hermes V1, проверь на устройстве.
- Новое в языке ([TC39: finished proposals](https://github.com/tc39/proposals/blob/main/finished-proposals.md)): ES2025 — iterator helpers, методы `Set`, `Promise.try`, import attributes и JSON modules, `Float16Array`; ES2026 — `Error.isError`, `Math.sumPrecise`, `Array.fromAsync`, `Uint8Array` ↔ base64, `RegExp.escape`, `Iterator.concat`; ожидаются в ES2027 — Temporal, `using` (explicit resource management), `Map.prototype.getOrInsert`.

**Практика 1. Вопросы** (≈ 40 мин)

- **Q17.** Прототипное наследование: чем `[[Prototype]]` объекта отличается от свойства `prototype` функции? Как идёт поиск свойства по цепочке? Когда нужен `Object.create(null)`?
- **Q18.** Что делает `new F(...args)` по шагам? Что будет, если конструктор вернул объект или примитив? Как работает `instanceof` и что меняет `Symbol.hasInstance`?
- **Q19.** Чем классы отличаются от функций-конструкторов (strict mode, вызов без `new` → `TypeError`, TDZ, неперечисляемые методы)? `super`, `static`, static-блоки, getters / setters. Чем приватные поля `#x` отличаются от `private` в TypeScript во время выполнения? Что проверяет `#x in obj`?
- **Q20.** ES modules и CommonJS: статическая структура, live bindings, когда выполняется код модуля, циклические зависимости, `import()` и top-level await. Можно ли в Node.js 22+ сделать `require()` ES-модуля?
- **Q21.** Default или named exports — плюсы и минусы? Что такое barrel-файлы (`index.ts` с реэкспортами) и почему в большом React Native-приложении они могут замедлять старт и мешать tree-shaking?
- **Q22.** Протокол итерации: iterable и iterator, `Symbol.iterator`, `next()` → `{ value, done }`, `return()`. Что использует этот протокол (`for...of`, spread, деструктуризация, `Array.from`, `Promise.all`)? Почему обычный объект не итерируемый?
- **Q23.** Генераторы: `function*`, `yield`, ленивые и бесконечные последовательности, `next(value)`, `return()`, `throw()`, `yield*`. Где они применялись (redux-saga) и что их заменило в обычном коде?
- **Q24.** Поверхностная и глубокая копия: spread, `Object.assign`, `slice`, `structuredClone`, `JSON.parse(JSON.stringify(x))`. Что `structuredClone` копирует (Map, Set, Date, циклы) и чего не умеет (функции, прототипы классов, геттеры)? Как проверить, есть ли он в твоём рантайме (Hermes), и чем заменить?
- **Q25.** `Object.freeze`, `Object.seal`, `Object.preventExtensions` — в чём разница? Почему `freeze` поверхностный? Чем `const` отличается от `freeze`? Что дают `readonly` и `as const` в TypeScript и почему только на этапе компиляции?
- **Q26.** Немутирующие методы массивов ES2023: `toSorted`, `toReversed`, `toSpliced`, `with`; плюс `at`, `findLast`. Почему `items.sort()` на массиве из state — баг в React? Что такое structural sharing (Immer)?
- **Q27.** `Map` или объект, `Set` или массив: ключи любых типов, порядок, `size`, частые вставки и удаления, JSON. Новые методы `Set` (ES2025): `union`, `intersection`, `difference`, `isSubsetOf` — пример с watchlist.
- **Q28.** Как работает сборщик мусора (достижимость, mark-and-sweep, поколения)? Назови 5 типичных источников утечек в React или React Native-приложении.
- **Q29.** `WeakMap`, `WeakSet`, `WeakRef`, `FinalizationRegistry`: когда они нужны (метаданные к объекту, кэш, «посещённые» объекты в `deepClone`)? Почему `WeakMap` нельзя перебрать и узнать его размер?
- **Q30.** Почему `0.1 + 0.2 !== 0.3` (IEEE 754 double)? Что такое `Number.EPSILON`, `Number.MAX_SAFE_INTEGER`, `Number.isSafeInteger`? Почему int64-идентификаторы из бэкенда передают строкой?
- **Q31.** Как хранить и считать деньги: целые minor units, `BigInt`, decimal-библиотеки? Ловушки округления: `toFixed`, `Math.round` для отрицательных, banker's rounding (`halfEven`). Что выберешь для трейдингового приложения и почему?
- **Q32.** `BigInt`: литерал `10n`, деление (дробная часть отбрасывается), смешивание с `number` (`TypeError`), `JSON.stringify` (`TypeError`), `typeof`. Как передать `BigInt` через JSON?
- **Q33.** `Number()`, `parseInt`, `parseFloat`, унарный `+`: что вернут для `'08'`, `'1e3'`, `''`, `' 42 '`, `'42px'`, `null`? Зачем radix в `parseInt`? Чем `Number.isNaN` отличается от `isNaN`?
- **Q34.** `Intl`: `NumberFormat` (`currency`, `percent`, `notation: 'compact'`, `signDisplay`, `roundingMode`, `formatToParts`), `DateTimeFormat` с `timeZone`, `RelativeTimeFormat` («2 минуты назад»), `PluralRules` (в русском one / few / many / other — «1 очко, 2 очка, 5 очков»), `Collator`. Почему форматтер создают один раз? Чем `Intl` в Hermes отличается от браузера?
- **Q35.** Что нового в ES2023–ES2026 и чем ты пользуешься? Назови 6 возможностей с пользой для кода (например, `Object.groupBy`, `Promise.withResolvers`, iterator helpers, методы `Set`, `Promise.try`, `Array.fromAsync`, `Error.isError`). Что ещё в пути (Temporal, `using`) и как проверить поддержку в Hermes?

**Практика 2. «Что выведет»** (≈ 15 мин)

**P6.** Классы, `static`, приватные поля. Что выведет? Почему `LimitOrder.count` сначала равен `Order.count`, а после `++` — нет?

```js
class Order {
  static count = 0;
  #secret = 'hidden';
  constructor(symbol) {
    this.symbol = symbol;
    Order.count++;
  }
  describe() { return `Order ${this.symbol}`; }
  get secretLength() { return this.#secret.length; }
}
class LimitOrder extends Order {
  constructor(symbol, price) {
    super(symbol);
    this.price = price;
  }
  describe() { return `${super.describe()} @ ${this.price}`; }
}
const o = new LimitOrder('AAPL', 190);
console.log(o.describe());
console.log(Order.count, LimitOrder.count);
LimitOrder.count++;
console.log(Order.count, LimitOrder.count);
console.log(Object.getPrototypeOf(o) === LimitOrder.prototype, o instanceof Order);
console.log(Object.getPrototypeOf(LimitOrder) === Order);
console.log(Object.hasOwn(o, 'describe'), 'describe' in o, Object.keys(o));
console.log(o.secretLength, typeof Order);
```

**P7.** Class fields и `this`. Что выведет? Сколько копий `print` и `printArrow` будет в памяти при 1000 экземпляров?

```js
class Ticker {
  symbol = 'BTC';
  price = 0;
  print() { return `${this?.symbol}`; }
  printArrow = () => `${this.symbol}`;
  update(price) { this.price = price; return this; }
}
const t = new Ticker();
const { print, printArrow } = t;
console.log(print(), printArrow());
console.log(t.update(1).update(2).price);
console.log(Object.hasOwn(t, 'printArrow'), Object.hasOwn(t, 'print'));
const t2 = new Ticker();
console.log(t.print === t2.print, t.printArrow === t2.printArrow);
```

**P8.** Копирование и `freeze`. Что выведет?

```js
const position = { symbol: 'ETH', qty: 2, meta: { tags: ['spot'] } };
const shallow = { ...position };
shallow.qty = 5;
shallow.meta.tags.push('margin');
const deep = structuredClone(position);
deep.meta.tags.push('futures');
const frozen = Object.freeze({ inner: { value: 1 } });
frozen.inner.value = 2;
let error = 'none';
try {
  frozen.inner = null;
} catch (e) {
  error = e.constructor.name;
}
console.log(position.qty, position.meta.tags);
console.log(deep.meta.tags);
console.log(frozen.inner.value, error);
```

**P9.** Числа. Что выведет каждая строка? Какие из этих строк — реальные баги в денежных расчётах?

```js
console.log(0.1 + 0.2 === 0.3, 0.1 + 0.2);
console.log((0.1 + 0.2).toFixed(2), (1.005).toFixed(2), (1.255).toFixed(2));
console.log(Math.round(1.005 * 100) / 100, Math.round(-2.5), Math.round(2.5));
console.log(Number.MAX_SAFE_INTEGER + 1 === Number.MAX_SAFE_INTEGER + 2);
console.log(9007199254740993n + 1n, 7n / 2n, typeof 10n);
console.log(0.1 * 3, 1 / 0, -1 / 0, 0 / 0);
console.log(parseInt('08'), parseInt('1e3'), Number('1e3'), Number(''), Number(null), Number(undefined));
console.log(Number.isNaN('abc'), isNaN('abc'));
```

**P10.** Генераторы. Что выведет? Когда срабатывает `finally` внутри генератора?

```js
function* gen() {
  const x = yield 1;
  console.log('got', x);
  try {
    yield 2;
  } finally {
    console.log('cleanup');
  }
  yield 3;
}
const it = gen();
console.log(it.next('ignored').value);
console.log(it.next('hello').value);
console.log(it.return(42));
console.log(it.next());
console.log([...gen()]);
```

**Практика 3. Задачи** (≈ 35 мин). Тесты из условия — критерии приёмки.

**T5. `myNew` и `myInstanceOf`** · лёгкая · ⏱ 15 мин

```ts
function myNew(Ctor: Function, ...args: unknown[]): object;
function myInstanceOf(value: unknown, Ctor: Function): boolean;
```

- `myNew` повторяет шаги `new` для функций-конструкторов (ES5-стиль), без `new` и `Reflect.construct` внутри.
- `myInstanceOf` идёт по цепочке `Object.getPrototypeOf`, без `instanceof`.
- Обсуди: почему `myNew(class Foo {})` бросает `TypeError`?

```ts
function Account(this: { owner: string }, owner: string) { this.owner = owner; }
Account.prototype.hello = function (this: { owner: string }) { return `hi ${this.owner}`; };
const a = myNew(Account, 'Ann') as { hello(): string };
a.hello();                                  // 'hi Ann'
a instanceof Account;                       // true
function ReturnsObject(this: { x: number }) { this.x = 1; return { y: 2 }; }
myNew(ReturnsObject);                       // { y: 2 }
function ReturnsPrimitive(this: { x: number }) { this.x = 1; return 42; }
myNew(ReturnsPrimitive);                    // { x: 1 }, прототип — ReturnsPrimitive.prototype
myNew(class Foo {});                        // TypeError
myInstanceOf([], Array);                    // true
myInstanceOf([], Object);                   // true
myInstanceOf(Object.create(null), Object);  // false
myInstanceOf(1, Number);                    // false
class A {}
class B extends A {}
myInstanceOf(new B(), A);                   // true
myInstanceOf(new A(), B);                   // false
```

**T6. `range` и `take`** · лёгкая · ⏱ 10 мин

```ts
function range(start: number, end: number, step?: number): Iterable<number>; // end не входит
function take<T>(iterable: Iterable<T>, n: number): Generator<T>;
```

- `range` ленивый и повторно итерируемый: каждый `for...of` начинает сначала. `step` по умолчанию 1, может быть отрицательным; `step === 0` → `RangeError` сразу при вызове `range`.
- `take` не берёт из источника лишний элемент.
- ★ То же через iterator helpers: `Iterator.from(range(0, Infinity)).filter((x) => x % 2 === 0).take(3).toArray()` → `[0, 2, 4]`.

```ts
[...range(0, 5)];                  // [0, 1, 2, 3, 4]
[...range(5, 0, -2)];              // [5, 3, 1]
[...range(0, 0)];                  // []
[...take(range(0, Infinity), 3)];  // [0, 1, 2]
const r = range(1, 3);
[...r]; [...r];                    // оба раза [1, 2]
range(0, 1, 0);                    // RangeError
let pulled = 0;
function* counter() { while (true) { pulled++; yield pulled; } }
[...take(counter(), 3)];           // [1, 2, 3]
pulled;                            // 3 — лишний элемент не взят
```

**T7. `flatten`** · лёгкая · ⏱ 10 мин

```ts
function flatten(arr: readonly unknown[], depth?: number): unknown[];
```

- Как `Array.prototype.flat`, но без `flat` и `flatMap`. `depth` по умолчанию 1, поддерживается `Infinity`.
- Дырки разреженного массива пропускаются, как во `flat`.
- ★ Итеративная версия со стеком, без рекурсии, с тем же порядком элементов.

```ts
flatten([1, [2, [3, [4]]]]);           // [1, 2, [3, [4]]]
flatten([1, [2, [3, [4]]]], 2);        // [1, 2, 3, [4]]
flatten([1, [2, [3, [4]]]], Infinity); // [1, 2, 3, 4]
flatten([[]]);                         // []
flatten([1, [2]], 0);                  // [1, [2]]
flatten([1, , 3]);                     // [1, 3]
```

**Самопроверка**

- Нарисуй цепочку прототипов для `new LimitOrder('AAPL', 190)` из P6 — до `null`.
- Почему `structuredClone` не подходит для копирования экземпляра класса `Order`?
- Чем `Map` лучше объекта для кэша котировок по символу?
- Как посчитать сумму комиссий по 1000 сделкам без ошибок округления?

**Готово, когда:** P6–P10 решены и разобраны; T5–T7 проходят тесты; можешь за минуту объяснить, почему `0.1 + 0.2 !== 0.3` и как хранить деньги.

Дальше: [часть 3 — асинхронность](01-javascript-typescript-part3.md)
