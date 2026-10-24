# JavaScript и TypeScript: вопросы и задачи

Обновлено: 2026-10-21 · Тренинг 1 из 6 · ≈ 16 часов · Вакансия: [карточка](../../card.ru.md)

Часть 5 из 6 · [часть 1](01-javascript-typescript.md) · [часть 2](01-javascript-typescript-part2.md) · [часть 3](01-javascript-typescript-part3.md) · [часть 4](01-javascript-typescript-part4.md) · [часть 6](01-javascript-typescript-part6.md) · [ответы](../01-javascript-typescript-answers/01-javascript-typescript-answers.md)

Правила те же, что в [части 1](01-javascript-typescript.md#как-тренироваться-с-ai). Типы проверяй командой `npx tsc` в песочнице (strict, TypeScript 7).

## Блок 6. TypeScript: основа (1,5 ч)

**Цель:** объяснять систему типов на примерах из своего кода и писать типобезопасный код без `any` и `as`.

**Что повторить**

- Типы живут только до компиляции. В React Native Metro (Babel) стирает типы и ничего не проверяет — поэтому `tsc --noEmit` нужен в CI и pre-commit.
- Версии на 2026-10: TypeScript 6.0 (2026-03-23) — `strict` по умолчанию, `types: []`, `target` — последний стабильный ES, устаревшие опции помечены; TypeScript 7.0 (2026-07-08) — компилятор на Go, в 8–12 раз быстрее на полной сборке, устаревшие опции удалены (`target: es5`, `moduleResolution: node10`, `baseUrl` и др.), программный API — только с 7.1. Читать: [анонс 6.0](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/), [анонс 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/).
- React Native 0.87: Strict TypeScript API по умолчанию — типы генерируются из исходников RN, deep imports вида `react-native/Libraries/*` дают ошибку типов — [RN 0.87](https://reactnative.dev/blog/2026/08/11/react-native-0.87).
- Handbook: [everyday types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html), [narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html), [generics](https://www.typescriptlang.org/docs/handbook/2/generics.html), [utility types](https://www.typescriptlang.org/docs/handbook/utility-types.html), [declaration merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html), [enums](https://www.typescriptlang.org/docs/handbook/enums.html), [tsconfig: strict](https://www.typescriptlang.org/tsconfig/#strict), [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/).
- Release notes: [4.9 — `satisfies`](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html), [5.0 — `const` type parameters](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html), [5.4 — `NoInfer`](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html), [5.5 — inferred type predicates](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html), [5.8 — `erasableSyntaxOnly`](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html).

**Практика 1. Вопросы** (≈ 30 мин)

- **Q47.** Что TypeScript проверяет на этапе компиляции и что остаётся рантайму? Почему в React Native типы не проверяются при сборке (Babel в Metro просто стирает их) и где тогда запускать `tsc --noEmit`?
- **Q48.** Структурная типизация: что это? Excess property checks для «свежих» объектных литералов. Как сделать branded (номинальный) тип, например `type OrderId = string & { readonly __brand: 'OrderId' }`, и зачем это для денег и идентификаторов?
- **Q49.** `type` или `interface`: declaration merging, `extends` против `&` (что будет при конфликте свойств), union и mapped types — только через `type`. Почему interface не подходит под `Record<string, unknown>`, а такой же type alias — подходит? Что советует handbook?
- **Q50.** `any`, `unknown`, `never`, `void`: разница и когда что. Где появляется `never` (исчерпывающие проверки, пересечение несовместимых типов, функция, которая всегда бросает, фильтрация в conditional types)?
- **Q51.** Generics: зачем, ограничения (`extends`), значения по умолчанию, вывод из аргументов. `const` type parameters (TS 5.0) и `NoInfer<T>` (TS 5.4): пример, где нужен каждый.
- **Q52.** Narrowing: `typeof`, `instanceof`, `in`, сравнение, truthiness, discriminant property; type guards `x is T` и assertion functions `asserts x is T`; inferred type predicates (TS 5.5: `filter((x) => x !== null)`). Когда сужение «теряется» (колбэки, мутации, вызов функции)?
- **Q53.** Discriminated unions: как построить, исчерпывающая проверка через `never` или `satisfies never`. Почему union состояний (`idle | loading | success | error`) лучше набора boolean-флагов? Пример со статусами ордера.
- **Q54.** Utility types: `Partial`, `Required`, `Readonly`, `Pick`, `Omit`, `Record`, `Exclude`, `Extract`, `NonNullable`, `ReturnType`, `Parameters`, `Awaited`, `InstanceType`. Почему `Omit` на union теряет дискриминант и как написать `DistributiveOmit`?
- **Q55.** `enum`, union-литералы и `as const`-объект: что каждый генерирует в JS, reverse mapping числовых enum, проблемы `const enum` с `isolatedModules` и Babel, флаг `erasableSyntaxOnly` (TS 5.8) и type stripping в Node.js. Что выберешь для `side: 'buy' | 'sell'`?
- **Q56.** Declaration merging и module augmentation: слияние интерфейсов, расширение типов сторонней библиотеки через `declare module '...'`, `declare global`. Пример — типизация React Navigation: старый паттерн (v6) — `declare global { namespace ReactNavigation { interface RootParamList … } }`; в документации 7.x (static API) — `declare module '@react-navigation/native' { interface RootNavigator … }`. Объясни оба.
- **Q57.** `tsconfig`: какие флаги входят в `strict`; что включаешь сверх него (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `verbatimModuleSyntax`, `isolatedModules`) и зачем? Что поменялось в TypeScript 6.0 и 7.0?
- **Q58.** Типизация React-компонентов: props, `children: React.ReactNode`, `React.FC` — за и против; `ComponentProps<typeof X>` и пропсы RN-компонентов (`PressableProps`, `TextInputProps`); generic-компонент списка `<List<T>>`; `ref` как обычный prop в React 19 вместо `forwardRef`.
- **Q59.** Типизация хуков: `useState<T | null>(null)`, `useReducer` с union-экшенами, `useRef<T>(null)` (в типах React 19 аргумент обязателен), кастомный хук, который возвращает кортеж (`as const`), контекст с `undefined` по умолчанию и хук-guard, который бросает ошибку вне провайдера.
- **Q60.** Данные из сети: почему `(await res.json()) as Quote[]` опасен? `unknown` на границе и runtime-валидация (Zod: `safeParse`, `z.infer`), генерация типов из OpenAPI. Где граница доверия в твоём API-слое?

**Практика 2. Задачи** (≈ 60 мин). Тесты из условия — критерии приёмки.

**T20. `groupBy` с generics** · лёгкая · ⏱ 10 мин

```ts
function groupBy<T, K extends PropertyKey>(items: Iterable<T>, getKey: (item: T, index: number) => K): Partial<Record<K, T[]>>;
function groupByToMap<T, K>(items: Iterable<T>, getKey: (item: T, index: number) => K): Map<K, T[]>;
```

- Без `Object.groupBy` и `Map.groupBy` (ES2024). Порядок групп и элементов — как на входе.
- `groupBy` возвращает объект без прототипа (`Object.create(null)`), как `Object.groupBy`.
- Объясни, зачем в типе `Partial`: какие ключи могут отсутствовать?

```ts
type Trade = { id: number; side: 'buy' | 'sell'; qty: number };
const trades: Trade[] = [{ id: 1, side: 'buy', qty: 5 }, { id: 2, side: 'sell', qty: 3 }, { id: 3, side: 'buy', qty: 1 }];
const bySide = groupBy(trades, (t) => t.side); // { buy: [trades[0], trades[2]], sell: [trades[1]] }
Object.getPrototypeOf(bySide);                 // null
bySide.buy?.length;                            // 2; тип bySide.buy — Trade[] | undefined
groupByToMap(trades, (t) => t.qty > 2);        // Map { true → [trades[0], trades[1]], false → [trades[2]] }
groupBy([] as number[], (x) => x);             // {}
Object.keys(groupBy(trades, (t, i) => (i % 2 === 0 ? 'even' : 'odd'))); // ['even', 'odd']
// сверка: результат совпадает с Object.groupBy / Map.groupBy (есть в Node.js 24; в Hermes проверь)
```

**T21. `parseQuote`: от `unknown` к типу** · средняя · ⏱ 25 мин

```ts
type Quote = { symbol: string; bid: number; ask: number; ts: number; venue?: string };
type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };
function isRecord(value: unknown): value is Record<string, unknown>;
function parseQuote(input: unknown): ParseResult<Quote>;
function parseQuotes(json: string): ParseResult<Quote[]>;
```

- Без `any` и без `as` (кроме `as const`): только сужение типов и свои type guards.
- Проверки по порядку, первая ошибка — в результат: объект (не `null` и не массив) → `symbol` — непустая строка → `bid`, затем `ask` — конечные числа (`Number.isFinite`) → `bid <= ask` → `ts` — целое > 0 → `venue`, если есть, — строка.
- Текст ошибки — `'<поле>: <причина>'`, точно как в тестах. В `parseQuotes` к ошибке элемента добавляется индекс: `'[1].ask: …'`.
- В `value` — только известные поля: лишние отбрасываются; если `venue` не было, ключа `venue` нет.
- ★ Перепиши на Zod 4 (`z.object`, `safeParse`, `z.infer`) и сравни: что удобнее, сколько стоит для бандла?

```ts
parseQuote({ symbol: 'AAPL', bid: 189.9, ask: 190.1, ts: 1761040000000 });
// { ok: true, value: { symbol: 'AAPL', bid: 189.9, ask: 190.1, ts: 1761040000000 } }
parseQuote(null);                                          // { ok: false, error: 'quote: expected object' }
parseQuote([1]);                                           // { ok: false, error: 'quote: expected object' }
parseQuote({ symbol: '', bid: 1, ask: 2, ts: 1 });         // error: 'symbol: expected non-empty string'
parseQuote({ symbol: 'X', bid: '1', ask: 2, ts: 1 });      // error: 'bid: expected finite number'
parseQuote({ symbol: 'X', bid: 1, ask: Infinity, ts: 1 }); // error: 'ask: expected finite number'
parseQuote({ symbol: 'X', bid: 3, ask: 2, ts: 1 });        // error: 'bid: must be <= ask'
parseQuote({ symbol: 'X', bid: 1, ask: 2, ts: 1.5 });      // error: 'ts: expected positive integer'
parseQuote({ symbol: 'X', bid: 1, ask: 2, ts: 1, venue: 7 }); // error: 'venue: expected string'
parseQuote({ symbol: 'A', bid: 1, ask: 2, ts: 1, extra: true });
// { ok: true, value: { symbol: 'A', bid: 1, ask: 2, ts: 1 } } — без extra и без ключа venue
parseQuotes('[{"symbol":"A","bid":1,"ask":2,"ts":1},{"symbol":"B","bid":1,"ask":"2","ts":1}]');
// { ok: false, error: '[1].ask: expected finite number' }
parseQuotes('{oops'); // { ok: false, error: 'json: invalid' }
parseQuotes('{}');    // { ok: false, error: 'quotes: expected array' }
parseQuotes('[]');    // { ok: true, value: [] }
```

**T22. Машина состояний ордера** · средняя · ⏱ 25 мин

```ts
type OrderState =
  | { status: 'draft'; symbol: string; qty: number }
  | { status: 'submitting'; symbol: string; qty: number }
  | { status: 'open'; id: string; symbol: string; qty: number; filledQty: number }
  | { status: 'filled'; id: string; symbol: string; qty: number }
  | { status: 'cancelled'; id: string; symbol: string; filledQty: number; reason: string }
  | { status: 'rejected'; symbol: string; reason: string };
type OrderEvent =
  | { type: 'submit' }
  | { type: 'accepted'; id: string }
  | { type: 'rejected'; reason: string }
  | { type: 'fill'; qty: number }
  | { type: 'cancel'; reason: string };
function orderReducer(state: OrderState, event: OrderEvent): OrderState;
```

Переходы:

- `draft` + `submit` → `submitting`.
- `submitting` + `accepted` → `open` с `filledQty: 0`; `submitting` + `rejected` → `rejected`.
- `open` + `fill`: `qty` события должно быть > 0 и ≤ остатка (`qty - filledQty`), иначе `RangeError`. Дозаполнили — `filled`, иначе `open` с новым `filledQty`.
- `open` + `cancel` → `cancelled` с текущим `filledQty`.
- Любое другое сочетание — вернуть **тот же объект** `state`.

Требования: `switch` по `state.status` с исчерпывающей проверкой (`satisfies never` или `assertNever`); без `as`; входной `state` не мутируется. Проверка: добавь в `OrderState` статус `expired` — компилятор должен показать ошибку в reducer. ★ Подключи reducer к `useReducer` и посмотри, какой тип у `dispatch`.

```ts
let s: OrderState = { status: 'draft', symbol: 'AAPL', qty: 10 };
s = orderReducer(s, { type: 'submit' });              // { status: 'submitting', symbol: 'AAPL', qty: 10 }
s = orderReducer(s, { type: 'accepted', id: 'o-1' }); // { status: 'open', id: 'o-1', symbol: 'AAPL', qty: 10, filledQty: 0 }
s = orderReducer(s, { type: 'fill', qty: 4 });        // { status: 'open', id: 'o-1', symbol: 'AAPL', qty: 10, filledQty: 4 }
s = orderReducer(s, { type: 'fill', qty: 6 });        // { status: 'filled', id: 'o-1', symbol: 'AAPL', qty: 10 }
orderReducer(s, { type: 'cancel', reason: 'user' }) === s; // true — filled не отменить
const open: OrderState = { status: 'open', id: 'o-2', symbol: 'X', qty: 5, filledQty: 1 };
orderReducer(open, { type: 'fill', qty: 5 });         // RangeError — остаток 4
orderReducer(open, { type: 'fill', qty: 0 });         // RangeError
orderReducer(open, { type: 'cancel', reason: 'user' });
// { status: 'cancelled', id: 'o-2', symbol: 'X', filledQty: 1, reason: 'user' }
orderReducer({ status: 'submitting', symbol: 'X', qty: 5 }, { type: 'rejected', reason: 'insufficient funds' });
// { status: 'rejected', symbol: 'X', reason: 'insufficient funds' }
```

**Самопроверка**

- Почему `JSON.parse` возвращает `any`, и как не дать этому `any` «растечься» по коду?
- Чем `satisfies never` в `default` лучше, чем просто `default: return state`?
- Где проходила граница доверия в API-слое Hotline.Finance (Zod-схемы) и что бы ты сделал иначе сейчас?
- Объясни разницу `interface` и `type` за 30 секунд.

**Готово, когда:** T20–T22 компилируются в strict и проходят тесты; на Q47–Q60 отвечаешь с примером из своего кода.

## Блок 7. TypeScript: type-level (1,5 ч)

**Цель:** читать и писать mapped, conditional и template literal types; решать задачи уровня type-challenges easy и medium.

**Что повторить**

- [Mapped types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html), [conditional types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html), [template literal types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html), [`satisfies` (TS 4.9)](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html), [type-challenges](https://github.com/type-challenges/type-challenges).
- Типы проверяют тестами: `Expect<Equal<…>>` и `// @ts-expect-error` (строка обязана быть ошибкой, иначе `tsc` ругается на лишнюю директиву).
- TypeScript 7: template literal inference считает Unicode code point одним символом (раньше — половинки UTF-16); это важно для утилит вроде `Length<S>` на строках с эмодзи.

```ts
// type-test-kit.ts — как в type-challenges
export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
export type Expect<T extends true> = T;
type MergeInsertions<T> = T extends object ? { [K in keyof T]: MergeInsertions<T[K]> } : T;
export type Alike<X, Y> = Equal<MergeInsertions<X>, MergeInsertions<Y>>; // структурное равенство
```

**Практика 1. Вопросы** (≈ 15 мин)

- **Q61.** Mapped types: `{ [K in keyof T]: … }`, модификаторы `readonly` и `?` с `+` / `-`, key remapping через `as` (TS 4.1), фильтрация ключей через `as never`. Что такое homomorphic mapped type и почему он сохраняет модификаторы и работает с массивами и кортежами?
- **Q62.** Conditional types: синтаксис и дистрибутивность по «голому» type parameter; как её отключить (`[T] extends [U]`). Почему `T extends never ? true : false` для `never` даёт `never`, а не `true`?
- **Q63.** `infer`: как достать тип результата функции, элемент массива, значение промиса, первый и последний элемент кортежа; `infer X extends string` (TS 4.7). Как работает рекурсия в типах и какие у неё лимиты?
- **Q64.** Template literal types: `` `on${Capitalize<K>}` ``, intrinsic-типы (`Uppercase`, `Lowercase`, `Capitalize`, `Uncapitalize`), разбор строк через `infer` (параметры маршрута `/assets/:symbol`). Где это реально полезно в приложении?
- **Q65.** `as`, `as const`, `satisfies` и аннотация типа: чем отличаются? Пример конфига или карты маршрутов, где `satisfies` лучше аннотации. Почему `as unknown as T` — запах?
- **Q66.** ★ Вариантность: ковариантность и контравариантность параметров функций, `strictFunctionTypes`, почему методы проверяются бивариантно, аннотации `in` / `out` (TS 4.7). Пример бага, который ловит `strictFunctionTypes`.

**Практика 2. Задачи** (≈ 75 мин). Встроенный аналог использовать нельзя (например, `Pick` в `MyPick`).

**T23. type-challenges: easy** · лёгкая · ⏱ 35 мин

Реализуй: a) `MyPick<T, K>`; b) `MyReadonly<T>`; c) `TupleToObject<T>` — кортеж ключей → объект «ключ: ключ»; d) `First<T>`; e) `Length<T>`; f) `MyExclude<T, U>`; g) `MyAwaited<T>` — рекурсивно и для thenable; h) `If<C, T, F>`; i) `Concat<T, U>`; j) `Includes<T, U>` — точное равенство типов; k) `Push<T, U>` и `Unshift<T, U>`; l) `MyParameters<T>`.

```ts
type Order = { id: string; symbol: string; side: 'buy' | 'sell'; qty: number };
const assets = ['BTC', 'ETH', 'AAPL'] as const;
type Thenable = { then: (onfulfilled: (value: number) => unknown) => unknown };
declare function placeOrder(symbol: string, qty: number, opts?: { tif: 'day' | 'gtc' }): Promise<Order>;

type EasyCases = [
  Expect<Equal<MyPick<Order, 'id' | 'qty'>, { id: string; qty: number }>>,
  Expect<Equal<MyReadonly<Order>, { readonly id: string; readonly symbol: string; readonly side: 'buy' | 'sell'; readonly qty: number }>>,
  Expect<Equal<TupleToObject<typeof assets>, { BTC: 'BTC'; ETH: 'ETH'; AAPL: 'AAPL' }>>,
  Expect<Equal<First<[3, 2, 1]>, 3>>,
  Expect<Equal<First<[]>, never>>,
  Expect<Equal<First<[undefined, 1]>, undefined>>,
  Expect<Equal<Length<typeof assets>, 3>>,
  Expect<Equal<Length<[]>, 0>>,
  Expect<Equal<MyExclude<'buy' | 'sell' | 'hold', 'hold'>, 'buy' | 'sell'>>,
  Expect<Equal<MyAwaited<Promise<string>>, string>>,
  Expect<Equal<MyAwaited<Promise<Promise<Order[]>>>, Order[]>>,
  Expect<Equal<MyAwaited<Thenable>, number>>,
  Expect<Equal<MyAwaited<ReturnType<typeof placeOrder>>, Order>>,
  Expect<Equal<If<true, 'a', 'b'>, 'a'>>,
  Expect<Equal<If<false, 'a', 2>, 2>>,
  Expect<Equal<Concat<[], []>, []>>,
  Expect<Equal<Concat<typeof assets, [1]>, ['BTC', 'ETH', 'AAPL', 1]>>,
  Expect<Equal<Concat<[1, 2], [3, [4]]>, [1, 2, 3, [4]]>>,
  Expect<Equal<Includes<typeof assets, 'ETH'>, true>>,
  Expect<Equal<Includes<typeof assets, 'DOGE'>, false>>,
  Expect<Equal<Includes<[1, 2, 3], 2>, true>>,
  Expect<Equal<Includes<[boolean, 2, 3], false>, false>>,
  Expect<Equal<Includes<[{ a: 'A' }], { readonly a: 'A' }>, false>>,
  Expect<Equal<Includes<[1], 1 | 2>, false>>,
  Expect<Equal<Includes<[null], undefined>, false>>,
  Expect<Equal<Push<[1, 2], '3'>, [1, 2, '3']>>,
  Expect<Equal<Unshift<[1, 2], 0>, [0, 1, 2]>>,
  Expect<Equal<MyParameters<typeof placeOrder>, [symbol: string, qty: number, opts?: { tif: 'day' | 'gtc' }]>>,
  Expect<Equal<MyParameters<() => void>, []>>,
];
// @ts-expect-error — ключа нет в Order
type E1 = MyPick<Order, 'price'>;
// @ts-expect-error — допустим только кортеж ключей
type E2 = TupleToObject<[[1, 2], {}]>;
// @ts-expect-error — не массив
type E3 = First<'abc'>;
// @ts-expect-error — не функция
type E4 = MyParameters<string>;
```

**T24. type-challenges: medium** · средняя · ⏱ 30 мин

Реализуй: a) `MyReturnType<T>`; b) `MyOmit<T, K>` — без `Omit`, `Pick`, `Exclude`, модификаторы сохраняются; c) `Last<T>` и `Pop<T>`; d) `TupleToUnion<T>`; e) `Chainable` — `option(key, value)` накапливает тип, `get()` его возвращает, повтор ключа — ошибка компиляции; f) `TrimLeft<S>` и `Trim<S>` (пробел, `\n`, `\t`); g) `ReplaceAll<S, From, To>`; h) ★ тип результата для `PromiseAll` (свяжи с T9); без ★ удали строки с пометкой ★.

```ts
declare const config: Chainable;
const built = config.option('symbol', 'BTC').option('qty', 2).option('flags', { postOnly: true }).get();
// ★ h) допиши тип вместо ???:
// declare function PromiseAll<T extends readonly unknown[]>(values: readonly [...T]): Promise<???>;
const p1 = PromiseAll([1, Promise.resolve('two'), Promise.resolve(Promise.resolve(3n))] as const); // ★

type MediumCases = [
  Expect<Equal<MyReturnType<typeof placeOrder>, Promise<Order>>>,
  Expect<Equal<MyReturnType<() => void>, void>>,
  Expect<Equal<MyOmit<Order, 'id' | 'side'>, { symbol: string; qty: number }>>,
  Expect<Equal<MyOmit<{ readonly a: 1; b?: 2; c: 3 }, 'c'>, { readonly a: 1; b?: 2 }>>,
  Expect<Equal<Last<[1, 2, 3]>, 3>>,
  Expect<Equal<Last<[]>, never>>,
  Expect<Equal<Pop<[1, 2, 3]>, [1, 2]>>,
  Expect<Equal<Pop<[]>, []>>,
  Expect<Equal<TupleToUnion<typeof assets>, 'BTC' | 'ETH' | 'AAPL'>>,
  Expect<Alike<typeof built, { symbol: string; qty: number; flags: { postOnly: boolean } }>>,
  Expect<Equal<TrimLeft<'  \n\tBTC '>, 'BTC '>>,
  Expect<Equal<Trim<'  \n BTC/USD \t '>, 'BTC/USD'>>,
  Expect<Equal<Trim<''>, ''>>,
  Expect<Equal<ReplaceAll<'BTC-USD-PERP', '-', '/'>, 'BTC/USD/PERP'>>,
  Expect<Equal<ReplaceAll<'aaa', 'a', 'aa'>, 'aaaaaa'>>,
  Expect<Equal<ReplaceAll<'abc', '', 'x'>, 'abc'>>,
  Expect<Equal<typeof p1, Promise<[1, string, bigint]>>>, // ★
];
// @ts-expect-error — ключа нет в Order
type E5 = MyOmit<Order, 'price'>;
// @ts-expect-error — ключ 'a' уже задан
config.option('a', 1).option('a', 2);
```

**T25. `DeepReadonly` и `DeepPartial`** · средняя · ⏱ 10 мин

- Объекты — рекурсивно; массивы и кортежи — `readonly`-массивы для `DeepReadonly` и массивы с `DeepPartial`-элементами для `DeepPartial`.
- Функции и `Date` — без изменений; примитивы — как есть.
- Где пригодится: патч настроек (`DeepPartial<Settings>`), неизменяемый снимок стора.

```ts
type Settings = {
  theme: { mode: 'light' | 'dark'; accent: string };
  watchlist: { symbol: string; alerts: number[] }[];
  onChange: (key: string) => void;
  updatedAt: Date;
};
type DeepCases = [
  Expect<Equal<DeepReadonly<Settings>, {
    readonly theme: { readonly mode: 'light' | 'dark'; readonly accent: string };
    readonly watchlist: readonly { readonly symbol: string; readonly alerts: readonly number[] }[];
    readonly onChange: (key: string) => void;
    readonly updatedAt: Date;
  }>>,
  Expect<Equal<DeepPartial<Settings>, {
    theme?: { mode?: 'light' | 'dark'; accent?: string };
    watchlist?: { symbol?: string; alerts?: number[] }[];
    onChange?: (key: string) => void;
    updatedAt?: Date;
  }>>,
  Expect<Equal<DeepReadonly<[1, { a: 2 }]>, readonly [1, { readonly a: 2 }]>>,
  Expect<Equal<DeepReadonly<string>, string>>,
];
```

**T26. ★ Типизированные `pipe` и `compose`** · средняя · ⏱ 15 мин

- `pipe(value, f1, …, f4)` — значение первым, функции слева направо; перегрузки до 4 функций.
- `compose(f3, f2, f1)` — справа налево, возвращает функцию; перегрузки для 2 и 3 функций.

```ts
const r1 = pipe(' 42 ', (s) => s.trim(), Number, (n) => n * 2); // 84
const toLabel = compose((n: number) => `#${n}`, (s: string) => s.length);
toLabel('abcd'); // '#4'
type PipeCases = [
  Expect<Equal<typeof r1, number>>,
  Expect<Equal<typeof toLabel, (a: string) => string>>,
];
// @ts-expect-error — string не number
pipe('x', (s: number) => s);
// @ts-expect-error — у number нет trim
pipe(1, (n) => n.trim());
```

**T27. ★ Template literal types** · средняя–сложная · ⏱ 15 мин

- `Handlers<E>` — из карты событий делает необязательные пропсы `onXxx` для компонента.
- `RouteParams<S>` — достаёт параметры `:name` из пути (типизированные deep links).

```ts
type MarketEvents = { price: [symbol: string, price: number]; statusChange: [state: 'open' | 'closed'] };
type TemplateCases = [
  Expect<Equal<Handlers<MarketEvents>, {
    onPrice?: (symbol: string, price: number) => void;
    onStatusChange?: (state: 'open' | 'closed') => void;
  }>>,
  Expect<Equal<RouteParams<'/assets/:symbol/orders/:orderId'>, { symbol: string; orderId: string }>>,
  Expect<Equal<RouteParams<'/u/:id'>, { id: string }>>,
  Expect<Equal<RouteParams<'/settings'>, {}>>,
];
```

**Самопроверка**

- Почему наивный `Includes` через `U extends T[number]` не проходит тест с `boolean`?
- Что такое дистрибутивность и как она работает в `MyExclude`?
- Где в RN-коде пригодились бы `DeepPartial` (патч настроек) и `RouteParams` (deep links)?
- Чем тест типов через `Expect<Equal<…>>` лучше, чем «навёл мышкой — вроде правильно»?

**Готово, когда:** все `Cases` из T23–T25 компилируются (`npx tsc` без ошибок) и каждое `@ts-expect-error` действительно ошибка; T26–T27 — по желанию.

Дальше: [часть 6 — React, React Native, трейдинговые задачи и mock-интервью](01-javascript-typescript-part6.md)
