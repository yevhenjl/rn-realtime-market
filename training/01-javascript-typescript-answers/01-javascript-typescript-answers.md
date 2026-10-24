# Тренинг 1: JavaScript и TypeScript — ответы и решения

Обновлено: 2026-10-21 · Тренинг 1 из 6 · ≈ 16 часов · Вакансия: [карточка](../../card.ru.md)

Ответы, часть 1 из 9 · [2](01-javascript-typescript-answers-part2.md) · [3](01-javascript-typescript-answers-part3.md) · [4](01-javascript-typescript-answers-part4.md) · [5](01-javascript-typescript-answers-part5.md) · [6](01-javascript-typescript-answers-part6.md) · [7](01-javascript-typescript-answers-part7.md) · [8](01-javascript-typescript-answers-part8.md) · [9](01-javascript-typescript-answers-part9.md) · вопросы: [часть 1](../01-javascript-typescript/01-javascript-typescript.md)

## Как пользоваться ответами

1. **Только после своей попытки.** `Q` — ответил вслух и записал тезисы; `P` — записал вывод построчно; `T` — решил с таймером, тесты из условия прошли (или ты сдался). Без попытки ответ запоминается плохо.
2. **Сравни по пунктам:** что совпало, что пропустил, где ошибся. В `T` твой код может отличаться от эталона — это нормально. Важно, чтобы проходили тесты из условия и были учтены крайние случаи.
3. **Каждую ошибку — в журнал** (`mistakes.md`, таблица из [части 1 вопросов](../01-javascript-typescript/01-javascript-typescript.md#как-тренироваться-с-ai)): дата, ID, что перепутал, правильная идея в 1 строку, повтор через +1 и +3 дня.
4. **С AI — разбор разницы, а не новый ответ.** Промпт: «Вот мой ответ на <ID> и эталон. Объясни по шагам, в чём разница и почему эталон прав. Потом задай 2 контрольных вопроса». Для пазлов проси таблицу «шаг → стек → микрозадачи → задачи».
5. Пометки: **Интервьюер ждёт** — что обязательно прозвучит в ответе; **Ошибка** — частая ловушка; **⚠️ уточнение** — неточность в условии и как её понимать.

Как проверено: вывод всех `P` — запуск в Node.js 24.10 (файл `.mjs`). Решения `T` — `node --test` на тестах из условия и `tsc` 7.0.2 (strict, `tsconfig` песочницы из блока 0). Хуки — Jest 30 + Testing Library с React 19.3. Type-тесты — `tsc`, каждое `@ts-expect-error` действительно ошибка.

## Навигация

| Ответы | Блок | ID | Вопросы |
|---|---|---|---|
| часть 1 (этот файл) | 1. Основа языка | Q1–Q16, P1–P5, T1–T4 | [часть 1](../01-javascript-typescript/01-javascript-typescript.md) |
| [часть 2](01-javascript-typescript-answers-part2.md) | 2. Объекты и данные | Q17–Q35, P6–P10, T5–T7 | [часть 2](../01-javascript-typescript/01-javascript-typescript-part2.md) |
| [часть 3](01-javascript-typescript-answers-part3.md) | 3. Асинхронность | Q36–Q46, P11–P20, T8–T9 | [часть 3](../01-javascript-typescript/01-javascript-typescript-part3.md) |
| [часть 4](01-javascript-typescript-answers-part4.md) | 4. Live coding: async | T10–T15 | [часть 4](../01-javascript-typescript/01-javascript-typescript-part4.md) |
| [часть 5](01-javascript-typescript-answers-part5.md) | 5. Live coding: структуры данных | T16–T19 | [часть 4](../01-javascript-typescript/01-javascript-typescript-part4.md#блок-5-live-coding-структуры-данных-15-ч) |
| [часть 6](01-javascript-typescript-answers-part6.md) | 6. TypeScript: основа | Q47–Q60, T20–T22 | [часть 5](../01-javascript-typescript/01-javascript-typescript-part5.md) |
| [часть 7](01-javascript-typescript-answers-part7.md) | 7. TypeScript: type-level | Q61–Q66, T23–T27 | [часть 5](../01-javascript-typescript/01-javascript-typescript-part5.md#блок-7-typescript-type-level-15-ч) |
| [часть 8](01-javascript-typescript-answers-part8.md) | 8. React и React Native | Q67–Q80, T28–T31 | [часть 6](../01-javascript-typescript/01-javascript-typescript-part6.md) |
| [часть 9](01-javascript-typescript-answers-part9.md) | 9–10. Трейдинг, mock-интервью, источники | T32–T35 | [часть 6](../01-javascript-typescript/01-javascript-typescript-part6.md#блок-9-трейдинг-и-геймификация-1-ч) |

## Блок 1. JS: основа языка

### Вопросы Q1–Q16

**Q1. Типы и `typeof`.** 7 примитивов: `undefined`, `null`, `boolean`, `number`, `bigint`, `string`, `symbol`; восьмой тип — `object` (массивы, функции, `Date`, `Map` — всё это объекты). `typeof null` → `'object'` (историческая ошибка первой версии JS, исправить нельзя), функция → `'function'`, массив → `'object'`, `NaN` → `'number'`, `10n` → `'bigint'`.

```ts
Array.isArray(x); // массив, в том числе из другого realm (iframe, WebView)
x === null;       // null
const isPlainObject = (x: unknown): x is Record<string, unknown> => {
  if (typeof x !== 'object' || x === null) return false;
  const proto = Object.getPrototypeOf(x);
  return proto === Object.prototype || proto === null; // {} или Object.create(null)
};
```

**Ошибка:** `typeof x === 'object'` как проверка «объекта» пропускает `null` и массивы; `instanceof Array` ломается между realm-ами. **Интервьюер ждёт:** 8 типов без запинки, причину `typeof null`, `Array.isArray`.

**Q2. `==`, `===`, `Object.is`.** `===` сравнивает без приведения типов. `==` сначала приводит типы (алгоритм IsLooselyEqual). `Object.is` — как `===`, но `Object.is(NaN, NaN)` → `true` и `Object.is(0, -0)` → `false`. Неожиданный `true` у `==`: `[] == false`, `'' == 0`, `'0' == false`, `[] == ![]`, `[1] == 1`. `x == null` — единственное принятое исключение: `true` ровно для `null` и `undefined`, короче двух проверок. **Интервьюер ждёт:** «пишу `===`, `== null` — осознанно»; React сравнивает state и зависимости через `Object.is`.

**Q3. Объект → примитив.** Операция ToPrimitive с хинтом. Если есть `obj[Symbol.toPrimitive]` — вызывается он. Иначе при хинте `'string'` сначала `toString()`, потом `valueOf()`; при `'number'` и `'default'` — наоборот. Берётся первый примитивный результат, если его нет — `TypeError`. Хинты: `'string'` — шаблонная строка, `String(x)`, ключ свойства; `'number'` — унарный `+`, `*`, `<`; `'default'` — бинарный `+` и `==`.

- `[] + {}`: `[].valueOf()` возвращает сам массив (не примитив) → `[].toString()` → `''`; `{}` → `'[object Object]'`; строка + строка → `'[object Object]'`.
- `+[]`: хинт `'number'` → `valueOf` (массив) → `toString` → `''` → `Number('')` → `0`.
- `Date` — исключение: хинт `'default'` трактует как `'string'`, поэтому `date + 1` — строка.

**Q4. Falsy, `??`, `?.`.** Falsy: `false`, `0`, `-0`, `0n`, `''`, `null`, `undefined`, `NaN`. Всё остальное truthy, в том числе `'0'`, `[]`, `{}`. `a || b` возвращает `b`, если `a` falsy; `a ?? b` — только если `a` равно `null` или `undefined`. `price || 'N/A'` при цене `0` покажет `'N/A'`: нулевая комиссия или P&L пропадут из UI. Правильно — `price ?? 'N/A'`. `?.` — optional chaining: `order?.fills?.[0]?.price`, `onDone?.()` дают `undefined` вместо `TypeError`. Логическое присваивание: `a ??= b` (если `a` nullish), `a ||= b` (если falsy), `a &&= b` (если truthy); если условие не выполнено, присваивания нет. **Ошибка:** смешивать `??` с `||` / `&&` без скобок — `SyntaxError`.

**Q5. Передача аргументов.** JS всегда передаёт по значению. Для объекта значение — ссылка (call by sharing): функция получает копию ссылки на тот же объект. Мутация поля меняет общий объект — видно снаружи. Переприсваивание параметра меняет только локальную копию ссылки — снаружи не видно.

```ts
function f(o: { qty: number }) { o.qty = 5; o = { qty: 99 }; }
const order = { qty: 1 };
f(order); // order.qty → 5
```

Для React: мутация объекта в state не создаёт новую ссылку → `Object.is` говорит «не изменилось» → рендера нет (T31).

**Q6. `null` и `undefined`.** `undefined` — «значения нет»: переменная без значения, отсутствующее свойство, функция без `return`. `null` — «намеренно пусто», его ставит программист или бэкенд. `JSON.stringify`: в объекте свойство с `undefined` (и функции, символы) пропадает — `{"b":null}`; в массиве становится `null` — `[null,null,null]`; `JSON.stringify(undefined)` → `undefined`, а не строка. Значения по умолчанию у параметров и при деструктуризации срабатывают только на `undefined`: `f(null)` → `null`, `const { p = 'x' } = { p: null }` → `null`. **Ошибка:** бэкенд прислал `null`, дефолт не сработал → `null.toFixed()` падает. Используй `??`.

**Q7. `Symbol`.** Уникальный примитив: `Symbol('id') !== Symbol('id')`. Нужен для ключей без конфликтов имён (метаданные в чужом объекте) и для протоколов языка. Well-known: `Symbol.iterator` — объект становится iterable (`for...of`, spread); `Symbol.asyncIterator` — для `for await`; `Symbol.toPrimitive` — управляет приведением (Q3); ещё `Symbol.hasInstance`, `Symbol.dispose`. `Symbol.for('key')` берёт символ из глобального реестра: `Symbol.for('x') === Symbol.for('x')`. Символьные ключи не видны в `Object.keys`, `for...in` и `JSON.stringify`; видны в `Object.getOwnPropertySymbols` и `Reflect.ownKeys`. Это не приватность, а только «скрыто от обычного перебора».

**Q8. Области видимости.** Global (классический скрипт), module (каждый ES-модуль), function, block (`{}` для `let` / `const` / `class`). Lexical environment — таблица «имя → значение» плюс ссылка на внешнее окружение; создаётся при входе в модуль, функцию или блок. Scope chain — поиск имени по этим ссылкам изнутри наружу; цепочка задаётся местом в коде, а не местом вызова. `var` и function declaration на верхнем уровне скрипта попадают в object environment record, который хранится в свойствах глобального объекта, поэтому `var x = 1` даёт `globalThis.x === 1`. Верхний уровень ES-модуля — отдельная module environment, поэтому в `globalThis` ничего не попадает.

**Q9. Hoisting и TDZ.** Объявления регистрируются при входе в область, до выполнения кода. `var` сразу инициализируется `undefined`. Function declaration создаётся сразу с телом: её можно вызвать выше по коду. `let`, `const` и `class` созданы, но не инициализированы: до строки объявления — TDZ (temporal dead zone), обращение даёт `ReferenceError`. Function expression и стрелка — просто значение переменной: при `var` это `undefined`, при `const` — TDZ. `typeof x` в TDZ → `ReferenceError` (P2), для необъявленного имени → `'undefined'`. **Интервьюер ждёт:** TDZ — про время, а не про место: `function f() { return x; } const x = 1; f();` работает, потому что вызов идёт после инициализации.

**Q10. Замыкание.** Функция плюс ссылка на лексическое окружение, где её создали. Окружение живёт, пока на него ссылается достижимая функция: сборщик мусора удаляет только недостижимое (Q28). Применения: 1) инкапсуляция состояния — счётчик из P4, приватные данные модуля; 2) фабрики функций — `makeAdder(n)`, `createTickBatcher` из T32; 3) мемоизация и частичное применение — `memoize` (T3), `curry` (T4), `once` (T1); на замыканиях построены и хуки React. **Ошибка:** думать, что замыкание хранит снимок значения. Оно держит живую привязку: в P4 `getX()` вернёт `2`.

**Q11. `var` в цикле.** `var i` — одна привязка на всю функцию. Три колбэка замыкают одну и ту же `i` и выполняются после цикла, когда `i === 3` → `3 3 3`. `let` в заголовке `for` создаёт новую привязку на каждую итерацию (со значением из прошлой) → `0 1 2`. До ES2015: IIFE `(function (j) { setTimeout(function () { console.log(j); }); })(i)`, `forEach` с параметром, `setTimeout(fn, 0, i)` (лишние аргументы уходят в колбэк), `bind`.

**Q12. Утечка через замыкание.** Долгоживущий объект (сокет, emitter, таймер, глобальный стор) держит колбэк; колбэк держит своё окружение; окружение держит state, props, массивы котировок. Экран закрыт, а память и работа остались; плюс дубли подписок и `setState` в размонтированный компонент.

```ts
useEffect(() => {
  const unsubscribe = socket.subscribe(symbols, onQuote);
  const id = setInterval(refresh, 5_000);
  return () => { unsubscribe(); clearInterval(id); }; // cleanup обязателен
}, [socket, symbolsKey]);
```

Как найти: снимки heap в React Native DevTools до и после «зашёл на экран — вышел» и их сравнение; счётчик слушателей у сокета; логи subscribe / unsubscribe; StrictMode в dev (двойной mount вскрывает отсутствие cleanup). Как не допустить: cleanup у каждой подписки, `AbortController` для `fetch`, ограниченные кэши (LRU из T19), правило `react-hooks/exhaustive-deps`.

**Q13. Strict mode.** `this` в обычной функции при простом вызове — `undefined`, а не `globalThis`. Присваивание необъявленной переменной — `ReferenceError` (нет неявных глобальных). Запись в read-only свойство (frozen-объект, геттер без сеттера) и добавление свойства в non-extensible объект — `TypeError`; без strict это молча игнорируется. `arguments` не связан с параметрами, нет `arguments.callee`; запрещены `with`, литералы вида `010`, одинаковые имена параметров. Включён автоматически в ES-модулях и в теле класса; в CommonJS — нет, если нет `'use strict'`.

**Q14. Правила `this`.** По возрастанию приоритета:

1. default: `f()` → `undefined` (в sloppy mode — `globalThis`);
2. implicit: `obj.f()` → `obj` — важно, что стоит слева от точки в момент вызова;
3. explicit: `f.call(ctx, a)`, `f.apply(ctx, [a])`, `f.bind(ctx)` → `ctx`;
4. `new F()` → новый объект. `new` сильнее `bind`: у `new (F.bind(ctx))()` `this` — новый объект, а bound-аргументы сохраняются.

Стрелки вне правил: берут `this` снаружи. Повторный `bind` не меняет `this`: `f.bind(a).bind(b)()` вызовется с `a` (в P5 — `'b1'`), второй `bind` может только добавить аргументы. `call` / `apply` у bound-функции тоже не меняют `this`.

**Q15. Чего нет у стрелок.** Нет своих `this`, `arguments`, `super`, `new.target`; нет `prototype`; вызов через `new` — `TypeError`; генератором быть не может. Метод объектного литерала стрелкой (`getName: () => this.name`) берёт `this` модуля, а не объекта → `undefined` (P5). Стрелка как class field (`handlePress = () => this.save()`) — частый приём: инициализатор поля выполняется в конструкторе, `this` — экземпляр, ссылку можно отдать как колбэк. Цена: своя функция на каждый экземпляр (P7), её нет в прототипе — не вызовешь через `super.handlePress()`, сложнее подменить в тесте через прототип.

**Q16. Потеря контекста.** Метод отделили от объекта и вызвали как обычную функцию → default binding → `this === undefined`. Примеры: `setTimeout(obj.method)`, `onPress={this.handlePress}`, `const { method } = obj; method()`. Три решения и их цена:

1. `this.handlePress = this.handlePress.bind(this)` в конструкторе — метод остаётся в прототипе (наследование и `super` работают), но это бойлерплейт и копия на экземпляр.
2. Стрелочное поле класса — коротко и ссылка стабильна; но копия на экземпляр и метода нет в прототипе.
3. Обёртка при передаче `onPress={() => this.handlePress()}` — просто, но новая функция на каждый рендер ломает `memo` / `PureComponent` у дочернего компонента.

В функциональных компонентах `this` нет — проблема исчезает, зато появляется stale closure (Q73).

### «Что выведет» P1–P5

**P1.**

```text
"" [object Object] 0 NaN
12 2 12 3
2 1 NaN
true true false true true
false true false true
object number object function bigint
[ 1, 10, 2 ] [ 'C', 'a', 'b' ]
```

1. `[] + []` → `'' + ''` → `''`, а `JSON.stringify('')` → `""`. `[] + {}` и `+[]` — разбор в Q3; `+{}` → `Number('[object Object]')` → `NaN`.
2. `1 + '2'` → `'12'`: есть строка — конкатенация (`console.log` печатает строку без кавычек). `-` и `*` только числовые: `2`, `12`. В `1 + +'2'` сначала унарный плюс → `3`.
3. `true` → `1`, `null` → `0`, `undefined` → `NaN`.
4. `[] == false` → оба к числу: `[]` → `''` → `0`, `false` → `0`. `[0] == false` → `'0'` → `0`. `null == 0` → `false`: при `==` `null` равен только `null` и `undefined`. `null >= 0` → `true`: сравнение `>=` приводит `null` к `0`. Это два разных алгоритма — отсюда разный результат.
5. `NaN` не равен себе; `Object.is` различает `0` и `-0`.
6. `typeof`: см. Q1.
7. `sort()` без компаратора сравнивает строки по UTF-16: `'10' < '2'`, `'C'` (67) < `'a'` (97). Для чисел — `sort((a, b) => a - b)`, для текста — `Intl.Collator`.

**P2.**

```text
function undefined undefined
undefined
ReferenceError
ReferenceError
```

`hoisted` — function declaration, поднята с телом. `expr` — `var`, поднят со значением `undefined`. `notDeclared` — `typeof` не бросает для необъявленных имён. `console.log(v)` — `var` поднят → `undefined`. `l` в TDZ → `ReferenceError` («Cannot access 'l' before initialization»). `typeof tdz` тоже бросает: имя объявлено ниже через `const`, но ещё не инициализировано. «Защита» через `typeof` работает только для необъявленных имён.

**P3.**

```text
[ 0, 1, 2 ]
var 3
var 3
var 3
let 0
let 1
let 2
```

Сначала синхронный код: IIFE `((n) => () => n)(k)` фиксирует текущее `k` в параметре `n` → `[0, 1, 2]`. Потом 6 таймеров в порядке регистрации: три `var` видят одну `i`, равную `3`; три `let` — каждый свою `j`.

**P4.**

```text
2 1
2
[ 11, 12, 13 ]
```

Два вызова `createCounter` — два независимых окружения со своим `count`. `inc` — стрелка без `this`: она держит `count` окружения `c1`, поэтому деструктуризация ей не мешает. Два `inc()` → `2`, один `c2.inc()` → `1`; геттер `value` читает `count` при каждом обращении. `getX` замыкает переменную, а не значение → `2`. `let n` — своя привязка на итерацию → `11, 12, 13`.

**P5.**

```text
main
undefined
undefined
other
b1
[ 'main', undefined ]
```

1. `account.getName()` — implicit binding → `'main'`.
2. `getName()` — оторванный метод в strict mode → `this` = `undefined` → `this?.name` → `undefined` (без `?.` был бы `TypeError`).
3. `getNameArrow` — стрелка, `this` верхнего уровня ES-модуля = `undefined`, поэтому `typeof this` — **строка** `'undefined'`. Без кавычек она выглядит как значение `undefined`.
4. `call` задаёт `this` → `'other'`. 5. Повторный `bind` не меняет `this` → `'b1'`.
6. Стрелка внутри метода берёт `this` метода → `'main'`; обычная функция в `map` вызывается без `thisArg` → `undefined`.

★ В CommonJS третья строка — `object`: `this` модуля — это `module.exports` (проверено запуском как `.cjs`). В классическом `<script>` тоже `object`: `this` — `window`. Там нет strict mode, поэтому меняются и строки 2 и 6: `this` — `window`, а `window.name` по умолчанию пустая строка.

### Задачи T1–T4

**T1. `once`** — O(1) на вызов.

```ts
export function once<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  let done = false;
  let result: R;
  return function (this: unknown, ...args: A): R {
    if (!done) {
      result = fn.apply(this, args); // бросит — done останется false
      done = true;
    }
    return result;
  };
}
```

Почему так: флаг `done`, а не проверка `result === undefined` — иначе `fn`, вернувшая `undefined`, вызывалась бы снова. `done = true` ставится после успешного вызова — ошибка не засчитывается (тест `flaky`: бросил, потом дважды `'ok'`, `attempts === 2`). `function` + `apply` сохраняют `this` (★); со стрелкой `this` потерялся бы. **Ошибка:** ставить `done = true` до вызова. Бонус для интервьюера: после успеха можно обнулить ссылку на `fn`, чтобы сборщик мусора освободил её замыкание.

**T2. `myBind`** — O(n) по числу аргументов.

```ts
export function myBind<T, A extends unknown[], B extends unknown[], R>(
  fn: (this: T, ...args: [...A, ...B]) => R,
  thisArg: T,
  ...bound: A
): (...args: B) => R {
  return (...args: B) => fn.apply(thisArg, [...bound, ...args]);
}

// ★ без call / apply: временное Symbol-свойство на thisArg
export function myBindNoCall<T extends object, A extends unknown[], B extends unknown[], R>(
  fn: (this: T, ...args: [...A, ...B]) => R, thisArg: T, ...bound: A
): (...args: B) => R {
  return (...args: B) => {
    const key = Symbol('fn');
    const ctx: T & { [key]?: typeof fn } = thisArg;
    ctx[key] = fn;
    try {
      return ctx[key](...bound, ...args); // вызов как метода: this === ctx
    } finally {
      delete ctx[key];
    }
  };
}

// ★ поддержка new: thisArg игнорируется, как у нативного bind
export function myBindNew(fn: Function, thisArg: unknown, ...bound: unknown[]) {
  function boundFn(this: unknown, ...args: unknown[]): unknown {
    if (new.target) return Reflect.construct(fn, [...bound, ...args], new.target);
    return fn.apply(thisArg, [...bound, ...args]);
  }
  boundFn.prototype = fn.prototype; // чтобы работал instanceof boundFn
  return boundFn;
}
```

Типы: `[...A, ...B]` — variadic tuple. `A` выводится из `bound`, `B` — «остаток» параметров `fn`. Поэтому `hi(1)` и `hi('!', 'x')` — ошибки компиляции (проверено в TS 7). Повторная привязка: `myBind` возвращает стрелку, которая игнорирует свой `this`, поэтому `myBind(hi, { name: 'Zed' })('.')` → `'Hi, Ann.'`. У версии с `Symbol` есть пределы: frozen-объект не примет свойство (`TypeError`), к `null` / `undefined` его не прикрепить. Поэтому настоящий `bind` хранит цель во внутренних слотах, а не в свойствах объекта.

**T3. `memoize`** — попадание O(1) плюс стоимость `getKey` (`JSON.stringify` — O(размер аргументов)).

```ts
type Memoized<A extends unknown[], R> = ((...args: A) => R) & { cache: Map<string, R>; clear(): void };

export function memoize<A extends unknown[], R>(
  fn: (...args: A) => R,
  options: { getKey?: (...args: A) => string; maxSize?: number } = {},
): Memoized<A, R> {
  const { getKey = (...args: A) => JSON.stringify(args), maxSize = Infinity } = options;
  const cache = new Map<string, R>();
  const memoized = (...args: A): R => {
    const key = getKey(...args);
    if (cache.has(key)) return cache.get(key) as R; // has + get: R сам может включать undefined
    const value = fn(...args);
    cache.set(key, value);
    if (cache.size > maxSize) {
      const oldest = cache.keys().next();
      if (!oldest.done) cache.delete(oldest.value); // Map хранит порядок вставки
    }
    if (value instanceof Promise) {
      // ★ ошибки не кэшируем; удаляем, только если в кэше всё ещё этот промис
      value.catch(() => { if (cache.get(key) === value) cache.delete(key); });
    }
    return value;
  };
  return Object.assign(memoized, { cache, clear: () => cache.clear() });
}
```

Тесты: `square` вызван 2 раза, в кэше 2 ключа; `byId` с `getKey` по `id` вернул `'ANN'` дважды; `maxSize: 2` вытеснил `'[1]'`. ★ Промис кладётся в кэш сразу — два одновременных вызова получают один промис. После reject запись удаляется. Слабости ключа `JSON.stringify`: `[undefined]` и `[null]` дают один ключ `'[null]'` (проверено: мемоизированный `typeof` вернул `'undefined'` для `null`); `NaN` и `Infinity` тоже становятся `null`; `{ a, b }` и `{ b, a }` — разные ключи (промахи); функции → `null`; `Map` и `Set` → `{}` (коллизии); цикл и `BigInt` → `TypeError`.

**T4. `curry`** — каждый вызов O(k) по накопленным аргументам.

```ts
export function curry(fn: (...args: any[]) => unknown): (...args: unknown[]) => unknown {
  const curried = (...args: unknown[]): unknown =>
    args.length >= fn.length
      ? fn(...args)
      : (...more: unknown[]) => curried(...args, ...more); // новый массив на каждый вызов
  return curried;
}

// ★ типизация для 3 аргументов без any
type Curry1<A, R> = { (): Curry1<A, R>; (a: A): R };
type Curry2<A, B, R> = { (): Curry2<A, B, R>; (a: A): Curry1<B, R>; (a: A, b: B): R };
type Curry3<A, B, C, R> = {
  (): Curry3<A, B, C, R>;
  (a: A): Curry2<B, C, R>;
  (a: A, b: B): Curry1<C, R>;
  (a: A, b: B, c: C): R;
};
export function curry3<A, B, C, R>(fn: (a: A, b: B, c: C) => R): Curry3<A, B, C, R> {
  return curry(fn) as Curry3<A, B, C, R>; // одно приведение в реализации, снаружи всё типизировано
}
```

Частичные применения независимы: `[...args, ...more]` создаёт новый массив, поэтому `add1(2)(3)` и `add1(10)(20)` не мешают друг другу (6 и 31). **Ошибка:** копить аргументы в общем массиве через `push` — второй вызов `add1` увидит аргументы первого. Пустой вызов `add3()` просто возвращает функцию с теми же аргументами. Лишние аргументы уходят в `fn` целиком. Ловушки `fn.length`: параметры со значением по умолчанию и rest не считаются — у `(a, b = 1) => …` длина 1, у `(...xs) => …` — 0. `any[]` в сигнатуре нужен, чтобы принять любую функцию: из-за контравариантности параметров `(a: number) => …` не присваивается к `(...args: unknown[]) => unknown`.

Дальше: [часть 2 — объекты и данные](01-javascript-typescript-answers-part2.md)
