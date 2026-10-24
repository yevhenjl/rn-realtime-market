# Тренинг 1: JavaScript и TypeScript — ответы и решения

Обновлено: 2026-10-21 · Тренинг 1 из 6 · ≈ 16 часов · Вакансия: [карточка](../../card.ru.md)

Ответы, часть 6 из 9 · [1](01-javascript-typescript-answers.md) · [2](01-javascript-typescript-answers-part2.md) · [3](01-javascript-typescript-answers-part3.md) · [4](01-javascript-typescript-answers-part4.md) · [5](01-javascript-typescript-answers-part5.md) · [7](01-javascript-typescript-answers-part7.md) · [8](01-javascript-typescript-answers-part8.md) · [9](01-javascript-typescript-answers-part9.md) · вопросы: [часть 5, блок 6](../01-javascript-typescript/01-javascript-typescript-part5.md)

Как пользоваться и как проверено — в [части 1](01-javascript-typescript-answers.md#как-пользоваться-ответами). Утверждения про поведение `tsc` ниже проверены на TypeScript 7.0.2 с `tsconfig` песочницы.

## Блок 6. TypeScript: основа

### Вопросы Q47–Q60

**Q47. Компиляция и рантайм.** `tsc` проверяет типы переменных, параметров и результатов, совместимость, `null` / `undefined`, исчерпываемость (`never`), лишние свойства, имена полей, ограничения generics, пропсы React. Во время выполнения типов нет: ответы API, данные из MMKV / AsyncStorage, deep links, push, результаты native-модулей, ввод пользователя никто не проверяет, а `as` просто исчезает. Metro собирает через Babel (`@react-native/babel-preset`): типы стираются пофайлово, без информации о типах — быстро, но ошибки типов сборку не роняют. EAS Build `tsc` тоже не запускает. Поэтому `tsc --noEmit` — обязательная проверка в CI на каждый PR, локально — в pre-push и в редакторе. `tsc` работает по всему проекту, поэтому в pre-commit для одних staged-файлов он не подходит. TypeScript 7 примерно в 8–12 раз быстрее — проверку стало проще держать в каждом шаге.

**Q48. Структурная типизация, branded types.** Совместимость определяется формой: объект `{ id, qty }` подходит под `{ id: string }`, имя типа не важно. Excess property check срабатывает только для «свежего» литерала, который сразу присваивается в типизированное место: `const p: Point = { x: 1, y: 2 }` — ошибка; тот же объект через промежуточную переменную проходит (проверено). Branded type:

```ts
type OrderId = string & { readonly __brand: 'OrderId' };
const toOrderId = (raw: string): OrderId => raw as OrderId; // единственное место с as — после проверки
declare function cancelOrder(id: OrderId): void;
cancelOrder(toOrderId('o-1')); // ок; cancelOrder('o-1') и cancelOrder(userId) — ошибки компиляции
```

Зачем: не перепутать `OrderId` с `UserId`, центы с долларами, цену с количеством (`type Cents = bigint & { readonly __brand: 'Cents' }`). Во время выполнения это обычная строка — цена ноль. В Zod есть `.brand<'OrderId'>()`.

**Q49. `type` или `interface`.** Только interface: declaration merging (одноимённые interface сливаются, на этом построен module augmentation). Только `type`: union, mapped и conditional types, кортежи, template literal types, псевдонимы примитивов. `extends` против `&`: `interface B extends A { id: number }` при `A.id: string` — ошибка сразу; `{ id: string } & { id: number }` молча даёт `id: never`, и объект становится непригодным (оба проверены). Interface не подходит под `Record<string, unknown>`: у него нет неявной index signature, потому что его могут расширить позже (он «открытый»); у type alias объектного типа она есть (проверено — см. T18). Handbook: «выбирай по вкусу; если нужна эвристика — interface, пока не понадобятся возможности type». На практике: формы объектов и публичный API — interface, композиция типов — type; важнее единообразие в проекте.

**Q50. `any`, `unknown`, `never`, `void`.** `any` выключает проверку и тихо «заражает» всё, к чему прикасается. `unknown` — безопасный верхний тип: присвоить можно что угодно, использовать — только после сужения; для данных извне и в `catch`. `never` — тип без значений: ветка `default` в исчерпывающей проверке; пересечение несовместимых типов (`string & number` → `never`); функция, которая всегда бросает или не завершается (`function fail(m: string): never`); фильтрация в conditional types (`T extends U ? never : T`). `void` — «результат не используется». Тип `() => void` принимает и функцию, которая что-то возвращает: `const v: () => void = () => 42` компилируется. Поэтому работает `forEach((x) => list.push(x))`.

**Q51. Generics.** Связывают типы входа и выхода, не теряя информацию: `function first<T>(xs: readonly T[]): T | undefined`. Ограничение `<T extends { id: string }>` — что можно делать с `T`; значение по умолчанию `<T = unknown>`; обычно `T` выводится из аргументов. `const` type parameters (TS 5.0) — литеральный вывод без `as const` у вызывающего:

```ts
declare function pickSide<const T extends readonly string[]>(xs: T): T[number];
const side = pickSide(['buy', 'sell']); // 'buy' | 'sell', а не string
declare function withDefault<T extends string>(values: T[], fallback: NoInfer<T>): T;
withDefault(['buy', 'sell'], 'hold'); // ошибка: без NoInfer T стал бы 'buy' | 'sell' | 'hold'
```

`NoInfer<T>` (TS 5.4) запрещает выводить `T` из этой позиции: значение по умолчанию, fallback, начальное состояние должны соответствовать вариантам, а не расширять их. Оба примера проверены `tsc`.

**Q52. Narrowing.** Операторы: `typeof` (примитивы), `instanceof` (классы), `in` (наличие свойства), сравнение (`=== null`, по дискриминанту), truthiness (осторожно с `0` и `''`). Type guard `(x): x is T` — ты сам ручаешься за проверку; ошибка в guard — дыра в типах. Assertion function `asserts x is T` бросает, если не так, — после вызова тип сужен. Inferred type predicates (TS 5.5): `[1, null, 2].filter((x) => x !== null)` → `number[]` (проверено). Когда сужение теряется:

- в колбэке, если `let`-переменная переприсваивается позже: колбэк может выполниться после присваивания. С `const` или `let` без последующих присваиваний сужение сохраняется (TS 5.4+). Оба случая проверены;
- после присваивания переменной или части пути (`order.price = …`);
- обратное тоже важно: после вызова функции TS **не** сбрасывает сужение свойства. `if (order.price !== undefined) { mutate(); order.price.toFixed(2); }` компилируется, хотя `mutate` мог стереть `price` (проверено) — копируй значение в `const` до вызова.

**Q53. Discriminated unions.** Union объектных типов с общим литеральным полем (`status`, `type`, `kind`); `switch` по нему сужает каждую ветку. Исчерпывающая проверка:

```ts
type Req = { status: 'idle' } | { status: 'loading' } | { status: 'success'; data: string[] } | { status: 'error'; error: string };
function assertNever(x: never): never { throw new Error(`unexpected ${JSON.stringify(x)}`); }
function label(r: Req): string {
  switch (r.status) {
    case 'idle': return '';
    case 'loading': return '…';
    case 'success': return r.data.join(', ');
    case 'error': return r.error;
    default: return assertNever(r); // или `return r satisfies never` — только проверка компилятора
  }
}
```

`assertNever` ещё и бросает во время выполнения, если с сервера пришёл неизвестный статус. Почему union лучше набора `isLoading`, `isError`, `data`: флаги допускают невозможные сочетания (загрузка + ошибка + данные), каждый потребитель должен разбирать комбинации, а `data` формально может быть `undefined` даже при успехе. Union делает невозможные состояния непредставимыми: `data` есть только в `success`. Статусы ордера — T22: `id` появляется только после `accepted`, `filledQty` — только у `open` и `cancelled`.

**Q54. Utility types.** `Partial` / `Required` — все поля необязательные / обязательные; `Readonly` — поверхностно readonly; `Pick` / `Omit` — выбрать / убрать ключи; `Record<K, V>` — объект с ключами `K`; `Exclude` / `Extract` — отфильтровать union; `NonNullable` — убрать `null` и `undefined`; `ReturnType` / `Parameters` — из типа функции; `Awaited` — развернуть промис (рекурсивно, с thenable); `InstanceType` — тип экземпляра конструктора. `Omit` на union теряет дискриминант: `keyof (A | B)` — только общие ключи, поэтому `Omit<Shape, 'id'>` даёт `{ kind: 'a' | 'b' }` без полей вариантов. Решение — дистрибутивная версия (обе проверены):

```ts
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
```

**Q55. `enum`, union-литералы, `as const`.** `enum Side { Buy, Sell }` генерирует JS-объект; у числового enum есть reverse mapping: `Side[Side['Buy'] = 0] = 'Buy'`, поэтому `Side[0] === 'Buy'`; у строкового enum обратной карты нет. `const enum` встраивается в код без объекта, но для этого нужна информация о других файлах. Пофайловые транспиляторы (Babel / Metro, esbuild, swc) её не имеют: при `isolatedModules` это ошибка, без него можно получить `undefined` во время выполнения. `erasableSyntaxOnly` (TS 5.8) запрещает синтаксис, который требует генерации JS: `enum`, `namespace` со значениями, parameter properties, `import x = require()`. Так код запускается в Node.js с type stripping. Проверено: `tsc` → TS1294, Node.js 24 → «TypeScript enum is not supported in strip-only mode». Union `type Side = 'buy' | 'sell'` ничего не генерирует и совпадает с JSON API. Если нужны значения во время выполнения — `as const`:

```ts
const SIDES = ['buy', 'sell'] as const;
type Side = (typeof SIDES)[number]; // 'buy' | 'sell'; массив — для z.enum(SIDES) и списка в UI
```

Для `side` выбираю union-литерал (плюс `as const`-массив, если нужен список значений).

**Q56. Declaration merging и module augmentation.** Одноимённые interface сливаются; namespace сливается с функцией, классом или enum (добавляет статические члены). Module augmentation — в файле-модуле (есть `import` / `export`) расширяем типы библиотеки: `declare module 'some-lib' { interface Theme { brand: string } }`. Так типизируют тему, ресурсы i18next, `Register` в TanStack Query. `declare global { … }` добавляет объявления в глобальную область из модуля. ⚠️ уточнение: в вопросе пример — глобальный `RootParamList`. Это паттерн React Navigation 6:

```ts
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
```

В актуальной документации React Navigation 7.x используется augmentation модуля: `declare module '@react-navigation/native' { interface RootNavigator extends RootStackType {} }`, где `RootStackType = typeof RootStack`. Механизм тот же — слияние interface, меняется только место объявления.

**Q57. `tsconfig`.** `strict` включает 9 флагов: `alwaysStrict`, `strictNullChecks`, `strictBindCallApply`, `strictBuiltinIteratorReturn`, `strictFunctionTypes`, `strictPropertyInitialization`, `noImplicitAny`, `noImplicitThis`, `useUnknownInCatchVariables`. Сверх него:

- `noUncheckedIndexedAccess` — `arr[i]` и `record[key]` имеют тип `T | undefined` (котировки по символу может не быть);
- `exactOptionalPropertyTypes` — `venue?: string` значит «нет ключа или строка», явный `undefined` запрещён; важно для PATCH-запросов;
- `noImplicitOverride` — переопределение метода только с `override`; ловит переименования в базовом классе;
- `verbatimModuleSyntax` — импорты остаются как написаны, типы — только через `import type`; безопасно для пофайловых транспиляторов (Metro, type stripping в Node.js);
- `isolatedModules` — каждый файл транспилируется отдельно: нет `const enum` между файлами, типы реэкспортируются через `export type`.

TypeScript 6.0 (2026-03-23): по умолчанию `strict: true`, `types: []` (нужно явно `"types": ["node"]`), `target` — последний стандарт (es2025), `module: esnext`, `rootDir` — папка с `tsconfig.json`, `noUncheckedSideEffectImports: true`. Устарели: `target: es5`, `downlevelIteration`, `moduleResolution` `node` / `node10` / `classic`, `module` `amd` / `umd` / `system` / `none`, `baseUrl`, `outFile`, `esModuleInterop: false`, `alwaysStrict: false`, `asserts` в импортах. TypeScript 7.0 (2026-07-08): компилятор переписан на Go, полная сборка в 8–12 раз быстрее (vscode: 125,7 с → 10,6 с), памяти меньше. Устаревшие опции стали ошибками, программного API в 7.0 нет (новый API — в 7.1, для инструментов есть `@typescript/typescript6`). Вывод template literal types идёт по Unicode code point (Q64). Пример из проверки этих ответов: в TS 7 сборка с `outDir` без явного `rootDir` дала ошибку TS5011 — задавай `rootDir` явно.

**Q58. Типизация компонентов.**

```tsx
type QuoteRowProps = { symbol: string; price: number; onPress?: (symbol: string) => void; children?: React.ReactNode };
function QuoteRow({ symbol, price, onPress, children }: QuoteRowProps) { /* … */ }
```

`children: React.ReactNode` — всё, что можно отрисовать. `React.FC`: плюсы — коротко, проверен тип результата; минусы — неудобно с generics. Неявных `children` у него нет с типов React 18 — это скорее плюс (проверено). Чаще пишут обычную функцию с типизированными props. `ComponentProps<typeof X>` — props существующего компонента для обёрток. В RN готовые типы: `PressableProps`, `TextInputProps`, `ViewProps`, `StyleProp<ViewStyle>`; расширение — `type Props = PressableProps & { title: string }`. Generic-компонент (в `.tsx` стрелке нужен `<T,>`):

```tsx
function List<T>({ items, render, keyOf }: { items: readonly T[]; render: (item: T) => ReactNode; keyOf: (item: T) => string }) {
  return <>{items.map((item) => <Fragment key={keyOf(item)}>{render(item)}</Fragment>)}</>;
}
<List items={[{ id: 'a', n: 1 }]} keyOf={(x) => x.id} render={(x) => x.n.toFixed(1)} />; // T выведен из items
```

React 19: `ref` — обычный prop функционального компонента (`function Input({ ref, ...props }: TextInputProps & { ref?: Ref<TextInput> })`), `forwardRef` не нужен. В RN 0.87+ (Strict TypeScript API) у ref-ов свои типы: `TextInputInstance`, `ViewInstance`.

**Q59. Типизация хуков** (всё проверено на типах React 19.3).

- `useState<User | null>(null)` — union указываем явно, когда старт — `null`.
- `useReducer(orderReducer, initial)` — тип берётся из reducer; `dispatch` имеет тип `ActionDispatch<[event: OrderEvent]>`, неизвестный экшен — ошибка компиляции.
- `useRef<View>(null)` → `RefObject<View | null>`; в типах React 19 аргумент обязателен (`useRef<number>()` — ошибка), `current` изменяемый.
- Кастомный хук с кортежем: `return [on, toggle] as const` → `readonly [boolean, () => void]`, а не `(boolean | (() => void))[]`.
- Контекст с `undefined` по умолчанию и хук-guard:

```tsx
const ThemeContext = createContext<'light' | 'dark' | undefined>(undefined);
export function useTheme() {
  const theme = use(ThemeContext); // или useContext
  if (theme === undefined) throw new Error('useTheme must be used inside ThemeProvider');
  return theme; // 'light' | 'dark'
}
// React 19: <ThemeContext value="dark">…</ThemeContext> — контекст сам работает как провайдер
```

**Q60. Данные из сети.** `(await res.json()) as Quote[]` — обман компилятора: проверки нет. Бэкенд сменил `price` на строку или прислал `null` — ошибка всплывает далеко от места (NaN в UI, падение в `toFixed`, неверная сортировка), а типы дают ложную уверенность. Правильно: на границе — `unknown` и проверка во время выполнения. Zod: `QuoteSchema.safeParse(data)` → `{ success, data }` или `{ success: false, error }`; тип из схемы `type Quote = z.infer<typeof QuoteSchema>` — один источник правды. В Zod 4 `z.object` по умолчанию отбрасывает лишние ключи, `z.number()` не пропускает `Infinity` (проверено на zod 4.6.7). Или свои type guards, как в T21. Типы из OpenAPI (openapi-typescript, orval) — контракт на этапе компиляции, но без проверки во время выполнения; их комбинируют со схемами или доверяют осознанно. Граница доверия — край приложения: HTTP-клиент, обработчик сообщений WebSocket, чтение из хранилища (после обновления приложения форма данных меняется), deep links, push, native-модули. Там проверяем один раз и превращаем DTO в доменную модель (десятичные строки → `bigint`, ISO → `Date`); дальше приложение работает с проверенными типами. Цена: ядро Zod 4 ≈ 5,4 KB gzip, `zod/mini` ≈ 1,9 KB (zod.dev/v4). На горячем пути (сотни тиков в секунду) — лёгкий ручной guard, полные схемы — для REST.

### Задачи T20–T22

**T20. `groupBy` с generics** — O(n).

```ts
export function groupBy<T, K extends PropertyKey>(
  items: Iterable<T>,
  getKey: (item: T, index: number) => K,
): Partial<Record<K, T[]>> {
  const groups: Partial<Record<K, T[]>> = Object.create(null); // как Object.groupBy: без прототипа
  let index = 0;
  for (const item of items) {
    const key = getKey(item, index++);
    (groups[key] ??= []).push(item); // первая встреча ключа создаёт группу — порядок как на входе
  }
  return groups;
}

export function groupByToMap<T, K>(items: Iterable<T>, getKey: (item: T, index: number) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  let index = 0;
  for (const item of items) {
    const key = getKey(item, index++); // ключ любого типа, сравнение SameValueZero
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}
```

Зачем `Partial`: `K` — множество **возможных** ключей (`'buy' | 'sell'`), а группа появляется, только если хоть один элемент дал этот ключ. Нет продаж — нет `sell`; пустой вход → `{}`. `Partial` заставляет писать `bySide.buy?.length`, тип — `Trade[] | undefined`. Встроенный `Object.groupBy` в `lib` типизирован так же. `Object.create(null)` — ключ `'constructor'` или `'__proto__'` не столкнётся с прототипом. `groupByToMap` держит ключи любого типа: `true` / `false`, объекты по ссылке. Результаты совпали с `Object.groupBy` и `Map.groupBy` в Node.js 24, включая порядок ключей `['even', 'odd']`. В Hermes проверь `typeof Object.groupBy`.

**T21. `parseQuote`: от `unknown` к типу** — O(1) на котировку, O(n) на массив.

```ts
export type Quote = { symbol: string; bid: number; ask: number; ts: number; venue?: string };
export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const fail = (error: string) => ({ ok: false, error }) as const; // as const — единственное разрешённое

export function parseQuote(input: unknown): ParseResult<Quote> {
  if (!isRecord(input)) return fail('quote: expected object');
  const { symbol, bid, ask, ts, venue } = input; // все поля — unknown
  if (typeof symbol !== 'string' || symbol.length === 0) return fail('symbol: expected non-empty string');
  if (!isFiniteNumber(bid)) return fail('bid: expected finite number');
  if (!isFiniteNumber(ask)) return fail('ask: expected finite number');
  if (bid > ask) return fail('bid: must be <= ask');
  if (typeof ts !== 'number' || !Number.isInteger(ts) || ts <= 0) return fail('ts: expected positive integer');
  if (venue !== undefined && typeof venue !== 'string') return fail('venue: expected string');
  const quote: Quote = { symbol, bid, ask, ts }; // только известные поля
  if (venue !== undefined) quote.venue = venue; // нет venue — нет и ключа
  return { ok: true, value: quote };
}

export function parseQuotes(json: string): ParseResult<Quote[]> {
  let data: unknown; // JSON.parse возвращает any — сразу «запираем» его в unknown
  try {
    data = JSON.parse(json);
  } catch {
    return fail('json: invalid');
  }
  if (!Array.isArray(data)) return fail('quotes: expected array');
  const quotes: Quote[] = [];
  for (const [index, item] of data.entries()) {
    const result = parseQuote(item);
    if (!result.ok) return fail(`[${index}].${result.error}`);
    quotes.push(result.value);
  }
  return { ok: true, value: quotes };
}
```

`isRecord` — type guard: дальше поля читаются как `unknown`, и каждое сужается своей проверкой. `as const` в `fail` нужен, чтобы `ok` остался литералом `false`, а не `boolean`. Новый объект `quote` отбрасывает `extra`; ключ `venue` появляется, только если он был (`'venue' in value` → `false` — проверено). Ловушка: `Array.isArray(unknown)` сужает до `any[]` — поэтому элементы сразу идут в `parseQuote(input: unknown)`. Как не дать `any` из `JSON.parse` «растечься»: сразу присвоить в `unknown`. ★ Zod 4 (проверено на zod 4.6.7):

```ts
const QuoteSchema = z
  .object({ symbol: z.string().min(1), bid: z.number(), ask: z.number(), ts: z.number().int().positive(), venue: z.string().optional() })
  .refine((q) => q.bid <= q.ask, { message: 'must be <= ask', path: ['bid'] });
type ZodQuote = z.infer<typeof QuoteSchema>;
```

Сравнение: схема короче и сама даёт тип; Zod собирает **все** ошибки (ручной вариант — первую), путь и текст другие (`'ask: Invalid input: expected number, received Infinity'`) — под формат теста нужен свой маппинг `issues`. Лишние ключи отбрасываются по умолчанию. Цена — ≈ 5,4 KB gzip к бандлу (`zod/mini` ≈ 1,9 KB) и скорость на горячем пути.

**T22. Машина состояний ордера** — O(1).

```ts
export function orderReducer(state: OrderState, event: OrderEvent): OrderState {
  switch (state.status) {
    case 'draft':
      return event.type === 'submit' ? { status: 'submitting', symbol: state.symbol, qty: state.qty } : state;
    case 'submitting':
      if (event.type === 'accepted') return { status: 'open', id: event.id, symbol: state.symbol, qty: state.qty, filledQty: 0 };
      if (event.type === 'rejected') return { status: 'rejected', symbol: state.symbol, reason: event.reason };
      return state;
    case 'open': {
      if (event.type === 'cancel') {
        return { status: 'cancelled', id: state.id, symbol: state.symbol, filledQty: state.filledQty, reason: event.reason };
      }
      if (event.type !== 'fill') return state;
      const remaining = state.qty - state.filledQty;
      if (!(event.qty > 0 && event.qty <= remaining)) throw new RangeError(`fill qty must be in (0, ${remaining}], got ${event.qty}`);
      const filledQty = state.filledQty + event.qty;
      return filledQty === state.qty
        ? { status: 'filled', id: state.id, symbol: state.symbol, qty: state.qty }
        : { ...state, filledQty }; // новый объект, вход не мутируем
    }
    case 'filled':
    case 'cancelled':
    case 'rejected':
      return state; // финальные статусы
    default:
      return state satisfies never; // новый статус без case → ошибка компиляции здесь
  }
}
```

`switch` по `state.status` сужает состояние, проверки `event.type` — событие. Условие `!(event.qty > 0 && event.qty <= remaining)` отсекает и `0`, и перебор, и `NaN` (проверено). Неподходящее сочетание возвращает **тот же объект** — для React это значит «не перерисовывать», а тест проверяет `=== s`. Проверка из условия выполнена: статус `expired` в `OrderState` даёт ошибку TS1360 «does not satisfy the expected type 'never'» ровно на строке `default`. `state satisfies never` — только проверка компилятора; `assertNever(state)` (Q53) ещё и бросит, если неизвестный статус придёт с сервера. ★ `useReducer(orderReducer, initial)` → `dispatch: ActionDispatch<[event: OrderEvent]>`, то есть `(event: OrderEvent) => void` (проверено). Важно: React вызывает reducer во время рендера, поэтому `RangeError` из reducer станет ошибкой рендера и уйдёт в error boundary. В UI либо валидируй fill до `dispatch`, либо переводи ошибку в состояние.

Дальше: [часть 7 — TypeScript: type-level](01-javascript-typescript-answers-part7.md)
