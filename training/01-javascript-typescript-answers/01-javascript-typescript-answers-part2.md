# Тренинг 1: JavaScript и TypeScript — ответы и решения

Обновлено: 2026-10-21 · Тренинг 1 из 6 · ≈ 16 часов · Вакансия: [карточка](../../card.ru.md)

Ответы, часть 2 из 9 · [1](01-javascript-typescript-answers.md) · [3](01-javascript-typescript-answers-part3.md) · [4](01-javascript-typescript-answers-part4.md) · [5](01-javascript-typescript-answers-part5.md) · [6](01-javascript-typescript-answers-part6.md) · [7](01-javascript-typescript-answers-part7.md) · [8](01-javascript-typescript-answers-part8.md) · [9](01-javascript-typescript-answers-part9.md) · вопросы: [часть 2](../01-javascript-typescript/01-javascript-typescript-part2.md)

Как пользоваться и как проверено — в [части 1](01-javascript-typescript-answers.md#как-пользоваться-ответами).

## Блок 2. JS: объекты и данные

### Вопросы Q17–Q35

**Q17. Прототипы.** `[[Prototype]]` — внутренняя ссылка любого объекта на его прототип (читается через `Object.getPrototypeOf`, устаревший вариант — `__proto__`). `F.prototype` — обычное свойство функции: этот объект станет `[[Prototype]]` у экземпляров `new F()`. Чтение свойства: собственные свойства → `[[Prototype]]` → … → `Object.prototype` → `null` → `undefined`. Запись идёт в сам объект и затеняет свойство прототипа (если в цепочке нет сеттера) — так в P6 появляется своё `LimitOrder.count`. `Object.create(null)` — объект без прототипа: безопасный словарь, где ключи `constructor`, `toString`, `__proto__` ничего не наследуют и не ломают поиск (так устроен результат `Object.groupBy`). У такого объекта нет `hasOwnProperty` — используй `Object.hasOwn`. Для динамических ключей часто лучше `Map`.

**Q18. `new` и `instanceof`.** `new F(...args)`: 1) создать объект с `[[Prototype]] = F.prototype` (если это не объект — `Object.prototype`); 2) вызвать `F` с `this` = этот объект; 3) если `F` вернул объект или функцию — результат он, если примитив или ничего — созданный объект (T5). `obj instanceof F` сначала смотрит `F[Symbol.hasInstance]`; если его нет — ищет `F.prototype` в цепочке прототипов `obj`. Для примитивов — `false`. `Symbol.hasInstance` подменяет проверку: `class Even { static [Symbol.hasInstance](n) { return n % 2 === 0; } }` → `2 instanceof Even` → `true`. **Ошибка:** `instanceof Array` между realm-ами (WebView, iframe) — `false`; используй `Array.isArray`.

**Q19. Классы.** Отличия от функций-конструкторов: тело класса всегда в strict mode; вызов без `new` → `TypeError`; объявление класса в TDZ, как `let`; методы неперечисляемые (`Object.keys(C.prototype)` → `[]`). В наследнике `super()` обязателен до первого `this`; `super.method()` вызывает метод родителя. `static` — свойства самого конструктора, наследуются через цепочку конструкторов (P6); `static { … }` — блок инициализации статики; getters / setters — как у объектов. `#x` — настоящая приватность во время выполнения: поля нет в `Object.keys`, `JSON.stringify` и `Reflect.ownKeys`, доступ к `#x` у «чужого» объекта — `TypeError`. `#x in obj` — brand check: создан ли `obj` конструктором этого класса. `private` в TypeScript — только проверка компилятора: в JS это обычное свойство, видно в `Object.keys` и доступно через `obj['x']`.

**Q20. ES modules и CommonJS.** ESM: статические `import` / `export` (анализ при сборке → tree shaking, ошибка «нет такого экспорта» до запуска); live bindings — импортёр видит текущее значение экспортированной переменной, но не может её присвоить; код модуля выполняется один раз, после своих зависимостей; модуль — singleton; strict mode; можно top-level await. CommonJS: `require()` синхронный и динамический (можно в `if`); экспорт — объект `module.exports`, примитивы копируются в момент `require`. Циклические зависимости: в ESM привязки есть, но до инициализации — TDZ (`ReferenceError`), function declaration при этом работают; в CJS приходит недозаполненный `module.exports`. `import()` возвращает промис namespace-объекта — ленивая загрузка и code splitting. `require()` ES-модуля в Node.js: без флага — с 22.12 (и 20.19), без предупреждения — с 22.13, стабильно — с 25.4. Условие — в графе модуля нет top-level await, иначе `ERR_REQUIRE_ASYNC_MODULE`. Результат — namespace-объект (проверено в Node.js 24).

**Q21. Default или named exports, barrel-файлы.** Named: одно имя во всех импортах (переименование и поиск работают, IDE сама импортирует), несколько экспортов на файл. Default: каждый импортёр придумывает своё имя, хуже автоимпорт; но его требуют некоторые API — `React.lazy`, файлы маршрутов в expo-router. Barrel (`index.ts` с реэкспортами): импорт одного символа тянет и выполняет все модули папки. Metro в React Native исторически не делает tree shaking, а RN выполняет код модулей при старте — растут бандл и время старта (TTI). Плюс циклические зависимости и медленные Jest и `tsc`. Что делать: импортировать из конкретных файлов, ESLint-правило против barrel-файлов. Inline requires в Metro смягчают проблему, но не убирают её.

**Q22. Протокол итерации.** Iterable — объект с методом `[Symbol.iterator]()`, который возвращает iterator. Iterator — объект с `next()` → `{ value, done }`; необязательный `return()` вызывается при досрочном выходе (`break`, исключение, деструктуризация части) — место для cleanup; есть ещё `throw()`. Протокол используют `for...of`, spread, деструктуризация массивов, `Array.from`, `new Map(iterable)` / `new Set(iterable)`, `Promise.all` / `race` / `any`, `yield*`. Обычный объект не итерируемый: непонятно, что перебирать (ключи, значения, пары?), а добавить итератор в `Object.prototype` значит сломать старый код. Для объекта есть `Object.entries(obj)`.

**Q23. Генераторы.** `function*` возвращает объект-генератор (iterator и iterable), тело не выполняется до первого `next()`. `yield` ставит на паузу и отдаёт значение. Отсюда ленивые и бесконечные последовательности (T6). `next(value)` продолжает выполнение: `value` становится результатом приостановленного `yield`; аргумент первого `next` теряется (P10). `return(v)` завершает генератор и выполняет `finally`; `throw(err)` бросает ошибку в месте паузы — её можно поймать внутри; `yield*` делегирует другому iterable. Где применялись: redux-saga (эффекты как данные, удобно тестировать шаги), корутины до async/await, ленивые конвейеры, обход деревьев. В обычном коде асинхронность перешла на async/await, ленивые цепочки — на iterator helpers (ES2025). Для своих iterable генератор по-прежнему самый короткий способ.

**Q24. Копирование.** Поверхностная копия — spread, `Object.assign`, `slice`, `Array.from`: копируется только верхний уровень, вложенные объекты общие (P8). `structuredClone` копирует глубоко: объекты, массивы, `Date`, `RegExp`, `Map`, `Set`, typed arrays, ошибки; сохраняет циклы и общие ссылки. Не умеет: функции (`DataCloneError`), прототипы (экземпляр класса станет обычным объектом), геттеры (копируются как значения — проверено), символьные и неперечисляемые ключи. `JSON.parse(JSON.stringify(x))` теряет `undefined` и функции, превращает `Date` в строку, `Map` в `{}`, `NaN` в `null`, на цикле и `BigInt` бросает. В React Native проверь `typeof structuredClone === 'function'` на устройстве (Hermes). Если нет — полифил (`@ungap/structured-clone`) или свой `deepClone` (T17). Для state в React глубокая копия обычно не нужна: хватает иммутабельного обновления по пути изменения (Q26).

**Q25. `freeze`, `seal`, `preventExtensions`.** `preventExtensions` — нельзя добавлять свойства (удалять и менять можно). `seal` — плюс нельзя удалять (свойства non-configurable), менять значения можно. `freeze` — плюс нельзя менять значения. Все три поверхностные: вложенные объекты остаются изменяемыми (P8). Нарушение в strict mode — `TypeError`, в sloppy — тихий игнор. `const` запрещает переприсвоить переменную, но объект менять можно; `freeze` запрещает менять объект, но `let`-переменную можно переприсвоить. `readonly` и `as const` в TypeScript — только проверка компилятора: в JS не попадает никакого `freeze`, и код через `any` или чистый JS спокойно мутирует. Для неизменяемости во время выполнения нужен `Object.freeze` — например, auto-freeze в Immer и Redux Toolkit в dev.

**Q26. Немутирующие методы (ES2023).** `toSorted(cmp)`, `toReversed()`, `toSpliced(start, count, ...items)`, `with(index, value)` возвращают новый массив, исходный не меняется (проверено). Рядом: `at(-1)` (ES2022) и `findLast` / `findLastIndex` (ES2023). `items.sort()` на массиве из state — баг: `sort` мутирует на месте. State изменён в обход `setState`; `setItems(items)` с той же ссылкой — рендера нет; остальные держатели ссылки видят мутацию. В рендере `sort` мутирует на каждом рендере (T31). Правильно: `[...items].sort(cmp)` или `items.toSorted(cmp)` (поддержку в Hermes проверь). Structural sharing: при иммутабельном обновлении копируется только путь до изменённого узла, неизменённые поддеревья переиспользуются по ссылке — копии дешёвые, а `memo` по ссылкам работает. Immer: пишешь «мутации» над draft (`produce(state, (d) => { d.positions[0].qty = 5; })`), Proxy записывает изменения и собирает новый state со structural sharing.

**Q27. `Map` / объект, `Set` / массив.** `Map`: ключи любого типа (объекты, числа остаются числами), порядок вставки, `size` за O(1), быстрые частые вставки и удаления, итерируемый, нет конфликтов с ключами прототипа; в JSON — только через `Object.fromEntries(map)` или `[...map]`. Объект — для записей фиксированной формы и JSON; целочисленные ключи всегда идут первыми по возрастанию. `Set` — уникальные значения, `has` за O(1) против `includes` за O(n) у массива. Методы `Set` (ES2025): `union`, `intersection`, `difference`, `symmetricDifference`, `isSubsetOf`, `isSupersetOf`, `isDisjointFrom`.

```ts
const watchlist = new Set(['AAPL', 'TSLA']);
const portfolio = new Set(['TSLA', 'BTC']);
watchlist.union(portfolio);              // Set { 'AAPL', 'TSLA', 'BTC' }
watchlist.intersection(portfolio);       // Set { 'TSLA' } — в избранном и в портфеле
watchlist.difference(portfolio);         // Set { 'AAPL' } — следим, но не держим
new Set(['TSLA']).isSubsetOf(watchlist); // true
```

**Q28. Сборка мусора и утечки.** Объект жив, пока достижим от корней: глобальный объект, стек вызовов, замыкания достижимых функций, активные таймеры и обработчики, ссылки из нативного кода. Mark-and-sweep: пометить всё достижимое от корней, остальное освободить; циклы не мешают (в отличие от подсчёта ссылок). Поколения: большинство объектов умирают молодыми — молодое поколение собирается часто и дёшево, выжившие переезжают в старое, его собирают реже. Инкрементальная и конкурентная пометка сокращает паузы; в Hermes свой сборщик — Hades. Пять типичных утечек в RN: 1) подписки без отписки — WebSocket, emitter, `AppState`, `Keyboard`, `Dimensions`; 2) `setInterval` / `setTimeout` без `clear`; 3) долгоживущие модули и singleton-сторы держат замыкания с данными закрытых экранов; 4) кэши и массивы без лимита — история котировок, логи, кэш запросов; 5) экраны, которые навигация держит смонтированными, со своими слушателями. Сюда же нативные ресурсы, которые не освобождают (сокеты, плееры).

**Q29. `WeakMap`, `WeakSet`, `WeakRef`, `FinalizationRegistry`.** `WeakMap`: ключ — объект (или незарегистрированный символ). Запись не держит ключ: ключ стал недостижим — запись исчезла. Применения: метаданные к чужим объектам, кэш результата по ссылке на объект (`WeakMap<Order, Summary>`), карта «оригинал → копия» в `deepClone` / `deepEqual` — она не продлевает жизнь графа, даже если переживёт вызов. `WeakSet` — пометки «уже обработан». `WeakRef` — ссылка, которая не мешает сборке; `deref()` может вернуть `undefined` — для кэша больших пересчитываемых данных. `FinalizationRegistry` — колбэк после сборки объекта для освобождения внешних ресурсов; ни время, ни сам вызов не гарантированы — для бизнес-логики не годится. Перебирать `WeakMap` и узнать размер нельзя: содержимое зависит от того, когда прошёл GC. Это недетерминизм, и он раскрывал бы поведение сборщика.

**Q30. `0.1 + 0.2`.** `number` — IEEE 754 binary64: 53 бита точности. `0.1`, `0.2` и `0.3` в двоичном виде — бесконечные дроби, каждая округлена до ближайшего double; ошибки не взаимоуничтожаются → `0.30000000000000004` (P9). `Number.EPSILON` = 2⁻⁵² ≈ 2.22e-16 — расстояние от 1 до следующего double; его используют для сравнения с допуском, но не для денег. `Number.MAX_SAFE_INTEGER` = 2⁵³ − 1 = 9007199254740991; выше не каждое целое представимо (P9). `Number.isSafeInteger(x)` — целое и не больше этого предела по модулю. Идентификаторы int64 (ордера, Snowflake, наносекундные метки времени) больше 2⁵³: `JSON.parse('{"id": 9007199254740993}').id` → `9007199254740992` (проверено) — ордер «тихо» сменил номер. Поэтому их передают строкой и хранят строкой или `BigInt`.

**Q31. Деньги.** Варианты: 1) целые minor units (центы) в `number` — точно до 2⁵³, для фиата хватает, для крипты с 8–18 знаками нет; 2) `bigint` в minor units с явным scale — точно и без ограничения размера, деление и проценты требуют явного округления; 3) decimal-библиотеки (decimal.js, big.js, dinero.js) — десятичная арифметика с настройкой точности, но вес бандла и скорость. Ловушки: `toFixed` работает с двоичным значением → `(1.005).toFixed(2)` → `'1.00'` (P9); `Math.round` округляет .5 вверх → `Math.round(-2.5)` → `-2`, а `Math.round(2.5)` → `3`, несимметрично для убытков и возвратов; `1.005 * 100` = `100.49999999999999`. Banker's rounding (`halfEven`) отправляет «ровно половину» к чётной цифре и убирает систематический сдвиг вверх в суммах. `Intl.NumberFormat` умеет `roundingMode`, но только для показа. Для трейдинга: источник правды — сервер; цены и суммы приходят десятичными строками, их парсим в `bigint` с scale инструмента (T33). Считаем превью в `bigint`, а если нужно деление — в decimal-библиотеке. Округляем в оговорённых местах тем же режимом, что бэкенд или биржа, форматируем в самом конце (T34). **Интервьюер ждёт:** «никакого `parseFloat` и сумм во float».

**Q32. `BigInt`.** Литерал `10n`, `BigInt('123')`; `typeof 10n` → `'bigint'`. Деление отбрасывает дробную часть к нулю: `7n / 2n` → `3n`, `-7n / 2n` → `-3n`. Смешивать с `number` нельзя: `1n + 1` → `TypeError`; сравнивать можно: `1n < 2` → `true`, `1n == 1` → `true`, `1n === 1` → `false`. `+1n` → `TypeError`, `BigInt(1.5)` → `RangeError`, `Math.*` не принимает `bigint`. `JSON.stringify({ a: 1n })` → `TypeError: Do not know how to serialize a BigInt`. Через JSON — строкой: replacer `(k, v) => (typeof v === 'bigint' ? v.toString() : v)` и обратно по схеме (`BigInt(dto.amount)` после проверки регуляркой, или Zod `.transform(BigInt)`). Патчить `BigInt.prototype.toJSON` глобально не стоит. В React Native проверь `typeof 10n` в своём приложении.

**Q33. Парсинг чисел** (проверено в Node.js 24):

| Вход | `Number()` | `parseInt()` | `parseFloat()` | `+` |
|---|---|---|---|---|
| `'08'` | 8 | 8 | 8 | 8 |
| `'1e3'` | 1000 | 1 | 1000 | 1000 |
| `''` | 0 | NaN | NaN | 0 |
| `' 42 '` | 42 | 42 | 42 | 42 |
| `'42px'` | NaN | 42 | 42 | NaN |
| `null` | 0 | NaN | NaN | 0 |

`Number` и `+` разбирают всю строку (пробелы по краям обрезают, пустая строка → 0, мусор → `NaN`). `parseInt` / `parseFloat` берут префикс и останавливаются на первом лишнем символе; `parseInt` не знает экспоненты; `parseInt(null)` разбирает строку `'null'`. Radix передавай всегда (`parseInt(s, 10)`): без него `'0x1A'` → 26, старые движки читали ведущий `0` как восьмеричную запись; `parseInt(0.0000005)` → 5, потому что `String(5e-7)` = `'5e-7'`. `Number.isNaN(x)` — `true` только для значения `NaN`; глобальный `isNaN` сначала приводит: `isNaN('abc')` → `true`, `isNaN('')` → `false`. Для ввода сумм — строгая регулярка (T33), а не `parseFloat`.

**Q34. `Intl`.** `NumberFormat`: `style: 'currency'` (плюс `currency`, `currencySign: 'accounting'`), `'percent'` (умножает на 100), `notation: 'compact'` (`1.2M`, `1,2 млн`), `signDisplay: 'exceptZero'` (`+1.23%`), `roundingMode` (`halfEven` и др.), `formatToParts` — части строки по отдельности (знак, валюта, дробная часть), чтобы оформить их по-разному. `DateTimeFormat` с `timeZone: 'Asia/Nicosia'` показывает время в нужной зоне. `RelativeTimeFormat('ru', { numeric: 'auto' })`: `format(-2, 'minute')` → «2 минуты назад», `format(-1, 'day')` → «вчера». `PluralRules('ru')`: 1 → `one`, 2 → `few`, 5 → `many`, 21 → `one`, 1.5 → `other` → «1 очко, 2 очка, 5 очков». `Collator` — сортировка по правилам языка (`numeric: true` даёт `'A2' < 'A10'`); обычный `sort()` ставит заглавные перед строчными и `ё` после `я`. Форматтер создают один раз: конструктор дорогой (выбор локали, загрузка данных ICU), а `format` дешёвый; `toLocaleString()` внутри создаёт форматтер заново. В Hermes `Intl` работает поверх API платформы (Android — ICU4J), и результат может отличаться от браузера. По документации Hermes на iOS у `NumberFormat` нет `notation: 'compact'`, `compactDisplay`, `signDisplay`, а `formatToParts` есть только на Android. Значит: тест на обоих устройствах, запасной вариант или полифил (`@formatjs/intl-numberformat`); что изменил Hermes V1 — проверь на устройстве.

**Q35. Что нового в ES2023–ES2026.** Шесть полезных вещей:

- `Object.groupBy` / `Map.groupBy` (ES2024) — группировка сделок по стороне (T20);
- `Promise.withResolvers` (ES2024) — «отложенный» промис: `const { promise, resolve } = Promise.withResolvers<void>(); ws.onopen = () => resolve();`;
- iterator helpers (ES2025) — ленивые `.filter().map().take()` без промежуточных массивов (T6 ★);
- методы `Set` (ES2025) — объединение и пересечение списков (Q27);
- `Promise.try` (ES2025) — синхронное исключение тоже становится rejection: `Promise.try(() => parseConfig(raw))`;
- `Array.fromAsync` и `Error.isError` (ES2026) — собрать страницы из async-генератора (Q45); надёжная проверка ошибки в `catch (e: unknown)`, в том числе из другого realm.

В пути (ES2027): Temporal — даты и часовые пояса вместо `Date` и moment; `using` — explicit resource management: `using sub = …` вызывает `[Symbol.dispose]()` в конце блока; `Map.prototype.getOrInsert`. Спецификация ≠ рантайм. В Node.js 24.10 есть `using`, `RegExp.escape`, `Error.isError`, но нет `Math.sumPrecise`, `Uint8Array.fromBase64`, `Iterator.concat` и Temporal (проверено). Как проверить Hermes: feature detection на устройстве (`typeof Promise.try`, `'union' in Set.prototype`, `typeof Iterator?.from`) и release notes RN / Hermes. Синтаксис зависит и от Babel-пресета Metro, и от движка. Встроенные методы Babel не добавляет — нужен полифил (core-js) или проверка перед вызовом.

### «Что выведет» P6–P10

**P6.**

```text
Order AAPL @ 190
1 1
1 2
true true
true
false true [ 'symbol', 'price' ]
6 function
```

1. `describe` из `LimitOrder` вызывает `super.describe()` → `'Order AAPL'` + `' @ 190'`.
2. `count` — собственное статическое свойство `Order`. `LimitOrder` своего не имеет, но `Object.getPrototypeOf(LimitOrder) === Order`, поэтому чтение находит `Order.count` → `1 1`.
3. `LimitOrder.count++` читает унаследованное `1` и **записывает** `2` как собственное свойство `LimitOrder` (запись затеняет, Q17). `Order.count` остаётся `1` → `1 2`.
4. Прототип `o` — `LimitOrder.prototype`, `Order.prototype` выше по цепочке → `true true`; статическое наследование → `true`.
5. `describe` живёт в прототипе, а не в объекте → `false true`; `#secret` — не свойство, поэтому в `Object.keys` только `symbol` и `price`.
6. Геттер читает `#secret` (`'hidden'`) → `6`; класс — это функция → `function`.

**P7.**

```text
undefined BTC
2
true false
true false
```

`print` — метод прототипа; оторванный от объекта, он вызывается с `this = undefined` (тело класса в strict mode) → `this?.symbol` → `undefined`, шаблон превращает его в `'undefined'`. `printArrow` — стрелка-поле: создаётся в конструкторе и навсегда держит `this` экземпляра → `'BTC'`. `update` возвращает `this` → цепочка → `2`. Поле — собственное свойство экземпляра, метод — нет. `print` один на всех (в прототипе), `printArrow` у каждого экземпляра свой. При 1000 экземплярах: `print` — 1 функция, `printArrow` — 1000 функций-объектов (код общий, но объекты замыканий разные).

**P8.**

```text
2 [ 'spot', 'margin' ]
[ 'spot', 'margin', 'futures' ]
2 TypeError
```

`shallow.qty = 5` меняет только копию (примитив скопирован) → у `position` осталось `2`. `shallow.meta` — та же ссылка, `push('margin')` меняет общий массив. `structuredClone` вызван **после** этого push, поэтому `deep` начинается с `['spot', 'margin']`, и его `push` на `position` не влияет. Ловушка: многие ждут `['spot', 'futures']`. `freeze` поверхностный: `frozen.inner.value = 2` сработало; `frozen.inner = null` в ES-модуле (strict mode) → `TypeError`.

**P9.**

```text
false 0.30000000000000004
0.30 1.00 1.25
1 -2 3
true
9007199254740994n 3n bigint
0.30000000000000004 Infinity -Infinity NaN
8 1 1000 0 0 NaN
false true
```

1. IEEE 754 (Q30). 2. `toFixed(2)` у суммы → `'0.30'`; `1.005` на самом деле `1.00499999999999989…` → `'1.00'`; `1.255` ≈ `1.25499999999999989…` → `'1.25'`. 3. `1.005 * 100` = `100.49999999999999` → `Math.round` → `100` → `1`; `Math.round` округляет .5 вверх: `-2.5` → `-2`, `2.5` → `3`. 4. `2⁵³ + 1` непредставимо и округляется до `2⁵³` → `true`. 5. `bigint` точен; `7n / 2n` отбрасывает дробь → `3n`. 6. Ошибка накапливается и при умножении; деление на 0 даёт `±Infinity`, `0 / 0` → `NaN`. 7. См. Q33. 8. `Number.isNaN` не приводит тип, `isNaN` приводит.

Реальные баги в деньгах: строки 1, 2, 3 (сравнение и округление во float — клиент теряет цент, убытки округляются иначе, чем прибыль), 4 (int64 ID и суммы в сатоши больше 2⁵³), 6 (накопление ошибки) и 7 (`parseInt('1e3')` → 1; `Number('')` → 0 — пустое поле стало нулевой суммой). Строка 5 тоже ловушка: `bigint`-деление молча отбрасывает остаток — округление нужно делать явно.

**P10.**

```text
1
got hello
2
cleanup
{ value: 42, done: true }
{ value: undefined, done: true }
got undefined
cleanup
[ 1, 2, 3 ]
```

1. Первый `next('ignored')` запускает тело до `yield 1`; его аргумент некому принять — он теряется.
2. `next('hello')`: `x = 'hello'`, печать `got hello`, вход в `try`, пауза на `yield 2`.
3. `return(42)` при паузе внутри `try` выполняет `finally` (`cleanup`) и завершает генератор → `{ value: 42, done: true }`.
4. Завершённый генератор → `{ value: undefined, done: true }`.
5. `[...gen()]` — новый генератор; spread вызывает `next()` без аргументов → `got undefined`; `try` завершается нормально → `cleanup`; затем `yield 3`. Логи печатаются до массива: spread сначала забирает всё, и только потом вызывается `console.log`.

`finally` в генераторе срабатывает, когда `try` завершился нормально или ошибкой, а также при `return()` (в том числе неявном — `break` в `for...of`), если генератор стоит на паузе внутри этого `try`. Если пауза была до входа в `try`, этот `finally` не выполнится.

### Задачи T5–T7

**T5. `myNew` и `myInstanceOf`** — O(1) и O(глубина цепочки).

```ts
export function myNew(Ctor: Function, ...args: unknown[]): object {
  const proto: unknown = Ctor.prototype;
  // 1. новый объект с [[Prototype]] = Ctor.prototype (если это не объект — Object.prototype, как у new)
  const obj: object = Object.create(typeof proto === 'object' && proto !== null ? proto : Object.prototype);
  // 2. вызвать конструктор с this = obj (класс без new бросит TypeError)
  const result: unknown = Ctor.apply(obj, args);
  // 3. конструктор вернул объект (или функцию) — он и результат; примитив игнорируется
  return (typeof result === 'object' && result !== null) || typeof result === 'function' ? result : obj;
}

export function myInstanceOf(value: unknown, Ctor: Function): boolean {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return false; // примитивы
  const target: unknown = Ctor.prototype;
  for (let proto = Object.getPrototypeOf(value); proto !== null; proto = Object.getPrototypeOf(proto)) {
    if (proto === target) return true;
  }
  return false;
}
```

`ReturnsObject` вернул `{ y: 2 }` — результат он; `ReturnsPrimitive` вернул `42` — результат созданный объект `{ x: 1 }` с нужным прототипом. `myNew(class Foo {})` бросает `TypeError` («Class constructor Foo cannot be invoked without 'new'»): конструктор класса нельзя вызвать как функцию, а `apply` — это вызов. Поэтому в задаче и запрещён `Reflect.construct`: он бы это обошёл. `Object.create(null)` → `false` (цепочка пустая), `1` → `false` (примитив). Не учтено, как и требует условие: `Symbol.hasInstance` и bound-функции (нативный `instanceof` берёт их целевую функцию). **Ошибка:** забыть ветку «конструктор вернул объект» или не отсечь `null` (`typeof null === 'object'`).

**T6. `range` и `take`** — O(1) памяти, O(n) на перебор.

```ts
export function range(start: number, end: number, step = 1): Iterable<number> {
  if (step === 0) throw new RangeError('step must not be 0'); // сразу, а не при первом next()
  return {
    *[Symbol.iterator]() { // каждый for...of получает новый генератор → повторно итерируемый
      for (let x = start; step > 0 ? x < end : x > end; x += step) yield x;
    },
  };
}

export function* take<T>(iterable: Iterable<T>, n: number): Generator<T> {
  if (n <= 0) return;
  let count = 0;
  for (const item of iterable) {
    yield item;
    if (++count >= n) return; // выходим ДО следующего next() источника; for...of вызовет его return()
  }
}
```

Почему `range` — объект, а не `function*`: тело генератора ленивое, и `RangeError` при `step === 0` вылетел бы только при переборе. Генератор одноразовый: второй `[...r]` дал бы `[]` (оба факта проверены). `take`: проверка счётчика стоит **после** `yield`, поэтому после n-го элемента мы выходим, не запрашивая следующий (`pulled === 3`). Наивный порядок «проверить → `yield`» берёт лишний элемент (`pulled === 4` — проверено). Выход из `for...of` вызывает `return()` источника — его `finally` отработает. ★ `Iterator.from(range(0, Infinity)).filter((x) => x % 2 === 0).take(3).toArray()` → `[0, 2, 4]` (Node.js 24, `tsc` 7 с `target: es2025`).

**T7. `flatten`** — O(n) по общему числу элементов.

```ts
export function flatten(arr: readonly unknown[], depth = 1): unknown[] {
  const out: unknown[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (!(i in arr)) continue; // дырка разреженного массива — пропускаем, как flat
    const item = arr[i];
    if (Array.isArray(item) && depth > 0) {
      for (const x of flatten(item, depth - 1)) out.push(x); // без push(...spread): нет лимита аргументов
    } else {
      out.push(item);
    }
  }
  return out;
}

// ★ итеративно: стек «кадров» {массив, позиция, глубина} — порядок как у рекурсии
export function flattenIterative(arr: readonly unknown[], depth = 1): unknown[] {
  const out: unknown[] = [];
  const stack = [{ items: arr, i: 0, depth }];
  while (stack.length > 0) {
    const frame = stack[stack.length - 1]!;
    if (frame.i >= frame.items.length) { stack.pop(); continue; }
    const index = frame.i++;
    if (!(index in frame.items)) continue;
    const item = frame.items[index];
    if (Array.isArray(item) && frame.depth > 0) stack.push({ items: item, i: 0, depth: frame.depth - 1 });
    else out.push(item);
  }
  return out;
}
```

`Infinity - 1` = `Infinity`, поэтому `depth: Infinity` работает без особого случая; отрицательная глубина ведёт себя как 0, как у `flat` (проверено). Дырки: `i in arr` — `false` для пропуска. **Ошибка:** `for...of` не пропускает дырки (отдаёт `undefined`), а `forEach` пропускает — с `for...of` тест `[1, , 3]` упадёт. `out.push(...flatten(item))` падает с `RangeError` на очень больших массивах (лимит аргументов) — поэтому цикл. Итеративная версия держит в стеке позицию в каждом массиве — порядок тот же, что у рекурсии; обе версии сверены с `Array.prototype.flat` на одних данных.

Дальше: [часть 3 — асинхронность](01-javascript-typescript-answers-part3.md)
