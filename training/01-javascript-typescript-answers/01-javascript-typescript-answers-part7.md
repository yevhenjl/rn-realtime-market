# Тренинг 1: JavaScript и TypeScript — ответы и решения

Обновлено: 2026-10-21 · Тренинг 1 из 6 · ≈ 16 часов · Вакансия: [карточка](../../card.ru.md)

Ответы, часть 7 из 9 · [1](01-javascript-typescript-answers.md) · [2](01-javascript-typescript-answers-part2.md) · [3](01-javascript-typescript-answers-part3.md) · [4](01-javascript-typescript-answers-part4.md) · [5](01-javascript-typescript-answers-part5.md) · [6](01-javascript-typescript-answers-part6.md) · [8](01-javascript-typescript-answers-part8.md) · [9](01-javascript-typescript-answers-part9.md) · вопросы: [часть 5, блок 7](../01-javascript-typescript/01-javascript-typescript-part5.md#блок-7-typescript-type-level-15-ч)

Как пользоваться и как проверено — в [части 1](01-javascript-typescript-answers.md#как-пользоваться-ответами). Все `Cases` из T23–T27 вставлены в проверочный файл дословно из условия; `tsc` 7.0.2 — без ошибок, каждое `@ts-expect-error` — действительно ошибка. Для контроля: если сломать `First` (написать `T[0]`), тест `First<[]>` падает.

## Блок 7. TypeScript: type-level

### Вопросы Q61–Q66

**Q61. Mapped types.** `{ [K in keyof T]: T[K] }` — перебор ключей. Модификаторы `readonly` и `?` добавляются `+` (по умолчанию) и снимаются `-`: `{ -readonly [K in keyof T]-?: T[K] }` превращает `{ readonly a?: 1 }` в `{ a: 1 }`. Key remapping через `as` (TS 4.1): `{ [K in keyof T as `get${Capitalize<K & string>}`]: () => T[K] }` → `{ getPrice: () => number }`. Фильтрация: `as never` выкидывает ключ — `{ [K in keyof T as T[K] extends Function ? never : K]: T[K] }` оставляет только данные. Homomorphic mapped type — перебор `keyof T`, где `T` — type parameter. Он сохраняет модификаторы исходных свойств и превращает массив в массив, кортеж в кортеж: `Wrap<[1, 2]>` → `[Promise<1>, Promise<2>]`. Тонкость: для необязательного свойства `T[K]` включает `undefined`, поэтому `{ a?: 1 }` даёт `{ a?: Promise<1 | undefined> }`. Всё проверено `tsc`.

**Q62. Conditional types.** `T extends U ? X : Y`. Если `T` — «голый» type parameter, тип дистрибутивный: применяется к каждому члену union. `ToArray<string | number>` → `string[] | number[]`. Отключить — обернуть в кортеж: `[T] extends [unknown]` → `(string | number)[]`. `never` — пустой union, распределять не по чему, поэтому `T extends never ? true : false` для `never` даёт `never`. Правильная проверка — `[T] extends [never] ? true : false` → `true`. Всё проверено. На дистрибутивности построены `Exclude`, `Extract`, `NonNullable`.

**Q63. `infer`.** Объявляет переменную типа внутри `extends` и «вынимает» часть типа:

```ts
type Ret<F> = F extends (...args: never[]) => infer R ? R : never;          // результат функции
type ElementOf<T> = T extends readonly (infer E)[] ? E : never;               // элемент массива
type Unwrap<P> = P extends Promise<infer V> ? V : P;                          // значение промиса
type Head<T> = T extends readonly [infer F, ...unknown[]] ? F : never;        // первый элемент
type LastOf<T> = T extends readonly [...unknown[], infer L] ? L : never;      // последний элемент
type NumFromString<S> = S extends `${infer N extends number}` ? N : never;    // '42' → 42
```

`infer X extends C` (TS 4.7) — совпадение только если выведенный тип подходит под `C`; так строка `'42'` превращается в число `42` (проверено). Рекурсия: conditional type может ссылаться на себя (`Awaited`, `DeepReadonly`, разбор строк). Лимиты: обычная (не хвостовая) рекурсия падает с TS2589 «Type instantiation is excessively deep» уже на глубине около 50 (в TS 7 проверено: 48 — ок, 49 — ошибка). Хвостовая — когда рекурсивный вызов и есть результат ветки, с аккумулятором — разрешена до 1000 итераций (TS 4.5+): `BuildTuple<999>` компилируется. Поэтому длинную рекурсию пишут с аккумулятором.

**Q64. Template literal types.** `` `on${Capitalize<K>}` `` собирает строку на уровне типов. Встроенные intrinsic-типы (реализованы в компиляторе): `Uppercase`, `Lowercase`, `Capitalize`, `Uncapitalize`. Разбор строки через `infer`: `'/assets/:symbol/orders/:orderId'` → `{ symbol: string; orderId: string }` (T27). Где полезно в приложении: пропсы-обработчики из карты событий (`onPrice`, T27), типизированные маршруты и deep links (typed routes в expo-router генерируют такие типы), ключи i18n с точками (`'settings.theme.title'`), единицы (`` `${number}px` ``), эндпоинты (`` `/v1/${string}` ``), типы экшенов (`` `${Domain}/${Action}` ``). TypeScript 7 выводит template literal по Unicode code point: «длина» `'😀a'` через `infer` — 2 в TS 7 и 3 в TS 6.0.3 (проверено обоими компиляторами). Это ломает утилиты, которые считали UTF-16.

**Q65. `as`, `as const`, `satisfies`, аннотация.** Аннотация `const x: T = expr` проверяет `expr` и даёт переменной тип `T` — литералы и конкретные ключи теряются. `satisfies T` (TS 4.9) проверяет `expr` на соответствие `T`, но оставляет собственный выведенный тип выражения. `as const` — самый узкий литеральный тип плюс `readonly` вглубь, без проверки. `as T` — «поверь мне»: нужна только достаточная совместимость типов, во время выполнения ничего не происходит.

```ts
const routes = { home: '/', asset: '/assets/:symbol' } satisfies Record<string, `/${string}`>;
routes.asset; // тип '/assets/:symbol' — литерал сохранён даже без as const
routes.typo;  // ошибка: ключи известны
const annotated: Record<string, `/${string}`> = { home: '/', asset: '/assets/:symbol' };
annotated.typo; // компилируется: у Record<string, …> «есть» любой ключ (с noUncheckedIndexedAccess — `/${string}` | undefined)
const bad = { home: 'home' } satisfies Record<string, `/${string}`>; // ошибка: значение не начинается с '/'
```

Всё проверено `tsc`. `as unknown as T` обходит любую проверку и прячет реальное несоответствие — это запах. Лучше type guard, валидация или исправленные типы; допустимо в тестах и с комментарием «почему».

**Q66. ★ Вариантность.** Ковариантность — для «выходов»: `Producer<Dog>` можно отдать туда, где ждут `Producer<Animal>`. Контравариантность — для «входов»: функцию, принимающую любое `Animal`, можно использовать там, где будут передавать `Dog`, но не наоборот. `strictFunctionTypes` (входит в `strict`) проверяет параметры свойств-функций контравариантно. Методы (запись `handle(e): void`) остаются бивариантными ради совместимости — на этом держится присваивание `Dog[]` в `Animal[]` (и это дыра: можно `push` кошку). Аннотации `in` / `out` (TS 4.7) — `interface Producer<out T>`, `interface Consumer<in T>`: явная и проверяемая вариантность, ускоряет проверку. Баг, который ловит флаг (проверено):

```ts
type Handler = (e: { type: string }) => void;
const onPrice = (e: { type: string; price: number }) => e.price.toFixed(2);
const h: Handler = onPrice; // ошибка при strictFunctionTypes; без флага h({ type: 'tick' }) упадёт: price === undefined
type HandlerMethod = { handle(e: { type: string }): void };
const hm: HandlerMethod = { handle: onPrice }; // метод — бивариантно: компилируется даже в strict
```

Вывод: колбэки в своих типах объявляй как свойства (`handle: (e: E) => void`), а не как методы — тогда проверка строгая.

### Задачи T23–T27

Помощник `Equal<X, Y>` из условия сравнивает типы через «генерик-функцию» `<T>() => T extends X ? 1 : 2`. Он отличает типы, которые взаимно присваиваемы, но не идентичны (`readonly`, `any`, необязательность) — поэтому тесты строгие.

**T23. type-challenges: easy.**

```ts
type MyPick<T, K extends keyof T> = { [P in K]: T[P] };
type MyReadonly<T> = { readonly [P in keyof T]: T[P] };
type TupleToObject<T extends readonly PropertyKey[]> = { [V in T[number]]: V };
type First<T extends readonly unknown[]> = T extends readonly [infer Head, ...unknown[]] ? Head : never;
type Length<T extends readonly unknown[]> = T['length'];
type MyExclude<T, U> = T extends U ? never : T;
type MyAwaited<T> = T extends { then(onfulfilled: infer F, ...rest: infer _): unknown }
  ? F extends (value: infer V, ...rest: infer _) => unknown
    ? MyAwaited<V>
    : never
  : T;
type If<C extends boolean, T, F> = C extends true ? T : F;
type Concat<T extends readonly unknown[], U extends readonly unknown[]> = [...T, ...U];
type Includes<T extends readonly unknown[], U> = T extends readonly [infer Head, ...infer Tail]
  ? Equal<Head, U> extends true ? true : Includes<Tail, U>
  : false;
type Push<T extends readonly unknown[], U> = [...T, U];
type Unshift<T extends readonly unknown[], U> = [U, ...T];
type MyParameters<T extends (...args: never[]) => unknown> = T extends (...args: infer P) => unknown ? P : never;
```

- a) `MyPick` — mapped type по `K`; ограничение `K extends keyof T` делает `MyPick<Order, 'price'>` ошибкой (E1).
- b) `MyReadonly` — homomorphic mapped type с `readonly`.
- c) `TupleToObject` — `T[number]` — union элементов кортежа, каждый становится ключом и значением; `readonly` в ограничении принимает `as const`. E2: `[[1, 2], {}]` — элементы не `PropertyKey`.
- d) `First` — `infer` первого элемента; `[]` не совпадает → `never`. Наивный `T[0]` даёт для `[]` тип `undefined` — тест падает. E3: строка не массив.
- e) `Length` — у кортежа `length` — литерал (`3`, `0`), у массива — `number`.
- f) `MyExclude` — дистрибутивный conditional: каждый член union либо выкидывается (`never`), либо остаётся.
- g) `MyAwaited` — как `Awaited` из `lib`: берём тип колбэка `onfulfilled` у `then`, из него — тип значения, и рекурсивно разворачиваем. Работает с `Promise<Promise<…>>` и с «самодельным» thenable. Вариант через `PromiseLike<infer U>` на тестовом `Thenable` не срабатывает: его `then` возвращает `unknown`, а не `PromiseLike` (проверено).
- h) `If` — `C` ограничен `boolean`.
- i) `Concat` — variadic tuples; `readonly` в ограничении принимает `typeof assets`.
- j) `Includes` — рекурсия по кортежу со **строгим** `Equal`. Наивный `U extends T[number] ? true : false` ошибается трижды: `false extends boolean` → `true`; `{ a: 'A' }` присваивается в `{ readonly a: 'A' }`; `1 | 2` распределяется по членам.
- k) `Push` / `Unshift` — variadic tuples.
- l) `MyParameters` — любая функция присваивается в `(...args: never[]) => unknown`: `never` подходит под любой параметр. `infer P` сохраняет метки и необязательность: `[symbol: string, qty: number, opts?: …]`. E4: строка не функция.

**T24. type-challenges: medium.**

```ts
type MyReturnType<T extends (...args: never[]) => unknown> = T extends (...args: never[]) => infer R ? R : never;
type MyOmit<T, K extends keyof T> = { [P in keyof T as P extends K ? never : P]: T[P] };
type Last<T extends readonly unknown[]> = T extends readonly [...unknown[], infer L] ? L : never;
type Pop<T extends readonly unknown[]> = T extends readonly [...infer Rest, unknown] ? Rest : [];
type TupleToUnion<T extends readonly unknown[]> = T[number];
type Chainable<Acc = {}> = {
  option<K extends string, V>(key: K extends keyof Acc ? never : K, value: V): Chainable<Acc & Record<K, V>>;
  get(): Acc;
};
type Whitespace = ' ' | '\n' | '\t';
type TrimLeft<S extends string> = S extends `${Whitespace}${infer Rest}` ? TrimLeft<Rest> : S;
type TrimRight<S extends string> = S extends `${infer Rest}${Whitespace}` ? TrimRight<Rest> : S;
type Trim<S extends string> = TrimRight<TrimLeft<S>>;
type ReplaceAll<S extends string, From extends string, To extends string> = From extends ''
  ? S
  : S extends `${infer Head}${From}${infer Tail}`
    ? `${Head}${To}${ReplaceAll<Tail, From, To>}`
    : S;
// ★ h)
declare function PromiseAll<T extends readonly unknown[]>(values: readonly [...T]): Promise<{ -readonly [K in keyof T]: Awaited<T[K]> }>;
```

- a) `MyReturnType` — `infer` результата.
- b) `MyOmit` — key remapping: ключ из `K` превращается в `never` и исчезает. Перебор `keyof T` — homomorphic, поэтому `readonly a` и `b?` сохраняются. Без `Omit`, `Pick` и `Exclude`, как требует условие; E5 — из ограничения `K extends keyof T`.
- c) `Last` / `Pop` — `infer` с конца через variadic tuple; `Pop<[]>` попадает в ветку `[]`.
- d) `TupleToUnion` — `T[number]`.
- e) `Chainable` — аккумулятор `Acc` в generic-параметре. Повторный ключ превращает тип параметра `key` в `never` → ошибка компиляции. `V` без ограничения выводится расширенным (`'BTC'` → `string`, `true` → `boolean`), как и ждёт тест; `Alike` «склеивает» пересечение `Acc & Record<K, V>`.
- f) `TrimLeft` / `Trim` — шаблон с union пробельных символов совпадает, если строка начинается (или кончается) любым из них; рекурсия до первого непробельного; `Trim<''>` → `''`.
- g) `ReplaceAll` — проверка `From extends ''` обязательна, иначе пустой шаблон совпадает бесконечно. Рекурсия идёт только по хвосту **после** замены, поэтому вставленный текст не сканируется повторно: `'aaa'` → `'aaaaaa'`.
- h) ★ `readonly [...T]` заставляет вывести кортеж; homomorphic mapped type сохраняет кортеж, `-readonly` снимает `readonly` от `as const`, `Awaited` разворачивает вложенные промисы → `Promise<[1, string, bigint]>`. Тот же приём в перегрузке T9.

**T25. `DeepReadonly` и `DeepPartial`.**

```ts
type AnyFunction = (...args: never[]) => unknown;
export type DeepReadonly<T> = T extends AnyFunction | Date
  ? T
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> } // гомоморфный: массив → readonly-массив, кортеж → readonly-кортеж
    : T;
export type DeepPartial<T> = T extends AnyFunction | Date
  ? T
  : T extends readonly (infer E)[]
    ? DeepPartial<E>[] // элементы массива не делаем необязательными
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T;
```

Порядок веток важен: функции и `Date` — тоже `object`, без ранней проверки mapped type «разобрал» бы их на свойства, и `Equal` с исходным типом не прошёл бы. В `DeepReadonly` массивы и кортежи обрабатывает сама homomorphic-ветка: `readonly { … }[]` и `readonly [1, { readonly a: 2 }]`. В `DeepPartial` массив — отдельная ветка: тест ждёт `{ symbol?: string; alerts?: number[] }[]`, а homomorphic-ветка с `?` дала бы элементы `X | undefined`. Union вроде `'light' | 'dark'` проходит через дистрибутивность без изменений, примитивы — как есть. Ограничение: кортеж в `DeepPartial` превращается в массив — тестом не покрыто. Где пригодится: `DeepPartial<Settings>` — патч настроек; `DeepReadonly<State>` — снимок стора, который нельзя мутировать.

**T26. ★ Типизированные `pipe` и `compose`.**

```ts
export function pipe<A>(value: A): A;
export function pipe<A, B>(value: A, f1: (a: A) => B): B;
export function pipe<A, B, C>(value: A, f1: (a: A) => B, f2: (b: B) => C): C;
export function pipe<A, B, C, D>(value: A, f1: (a: A) => B, f2: (b: B) => C, f3: (c: C) => D): D;
export function pipe<A, B, C, D, E>(value: A, f1: (a: A) => B, f2: (b: B) => C, f3: (c: C) => D, f4: (d: D) => E): E;
export function pipe(value: unknown, ...fns: Array<(x: unknown) => unknown>): unknown {
  return fns.reduce((acc, fn) => fn(acc), value);
}

export function compose<A, B, C>(f2: (b: B) => C, f1: (a: A) => B): (a: A) => C;
export function compose<A, B, C, D>(f3: (c: C) => D, f2: (b: B) => C, f1: (a: A) => B): (a: A) => D;
export function compose(...fns: Array<(x: unknown) => unknown>): (x: unknown) => unknown {
  return (x) => fns.reduceRight((acc, fn) => fn(acc), x);
}
```

В `pipe` вывод идёт слева направо: `A` — из значения, `B` — из результата `f1`, и следующий колбэк получает контекстный тип. Поэтому в `(s) => s.trim()` у `s` тип `string` без аннотации. `Number` подходит как функция `(value?: any) => number` → итог `number`; во время выполнения — `84`. В `compose` функции идут справа налево, контекстного вывода для параметров нет — поэтому в тесте они аннотированы; результат `(a: string) => string`, `toLabel('abcd')` → `'#4'`. Ошибки: `pipe('x', (s: number) => s)` — `string` не `number`; `pipe(1, (n) => n.trim())` — у `number` нет `trim`. Почему перегрузки, а не один variadic-тип: цепочку зависимых типов сложно вывести рекурсивным типом, а перегрузки дают хороший вывод и понятные ошибки. Так типизированы `pipe` в RxJS, fp-ts и Effect.

**T27. ★ Template literal types.**

```ts
export type Handlers<E extends Record<string, unknown[]>> = {
  [K in keyof E & string as `on${Capitalize<K>}`]?: (...args: E[K]) => void;
};
type Segments<S extends string> = S extends `${infer Head}/${infer Tail}` ? Head | Segments<Tail> : S;
type ParamName<Segment extends string> = Segment extends `:${infer Name}` ? Name : never;
export type RouteParams<S extends string> = { [K in ParamName<Segments<S>>]: string };
```

`Handlers`: key remapping с template literal и `Capitalize`; `keyof E & string` отсекает числовые и символьные ключи; `?` делает пропсы необязательными; `(...args: E[K]) => void` сохраняет метки кортежа (`symbol`, `price`). `RouteParams`: `Segments` рекурсивно режет путь по `/` в union сегментов (`'' | 'assets' | ':symbol' | 'orders' | ':orderId'`). `ParamName` оставляет сегменты с `:` и вынимает имя. Mapped type по union имён даёт объект. Нет параметров → `{ [K in never]: string }` = `{}` — тест `'/settings'` проходит. Расширения: необязательный параметр `:id?`, wildcard `*` — новые ветки в `ParamName`.

Дальше: [часть 8 — React и React Native](01-javascript-typescript-answers-part8.md)
