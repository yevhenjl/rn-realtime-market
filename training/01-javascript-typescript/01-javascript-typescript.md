# JavaScript и TypeScript: вопросы и задачи

Обновлено: 2026-10-21 · Тренинг 1 из 6 · ≈ 16 часов · Вакансия: [карточка](../../card.ru.md)

Часть 1 из 6 · [часть 2](01-javascript-typescript-part2.md) · [часть 3](01-javascript-typescript-part3.md) · [часть 4](01-javascript-typescript-part4.md) · [часть 5](01-javascript-typescript-part5.md) · [часть 6](01-javascript-typescript-part6.md) · [ответы](../01-javascript-typescript-answers/01-javascript-typescript-answers.md)

## Зачем этот тренинг

Следующий этап в IBIT — техническое интервью с Senior Frontend-разработчиком. Роль — React Native-разработчик в трейдинговой платформе: основное приложение и новые игровые «trading mini-apps» (турниры, челленджи, лояльность, ачивки). Фронтенд-интервьюер почти наверняка проверит JS и TS «под капотом» и даст live coding. На скрининге ты назвал свой уровень JS / TS «довольно высоким» — здесь ты подкрепишь это делом.

- Часть тем ты давно не трогал руками и многое подзабыл. Поэтому идём от основ к уровню senior.
- `Q` — теория, `P` — «что выведет», `T` — задачи на код. ID стабильные: по ним сверяйся с ответами и общайся с AI.
- Ответов здесь нет. Они в файле [01-javascript-typescript-answers.md](../01-javascript-typescript-answers/01-javascript-typescript-answers.md) — он готовится отдельно.
- ★ — по желанию: если блок закончил раньше или хочешь глубже.
- Шпаргалка «ответ за 30 секунд» по этим темам: [JS и TS: вопросы уровня senior](../../../../../interview-prep/technical/javascript-typescript.ru.md).

## План

| # | Блок | Что внутри | Часть | Часы |
|---|---|---|---|---|
| 0 | Старт | песочница, правила работы с AI, диагностика | 1 | 0,5 |
| 1 | JS: основа языка | типы, приведение, scope, hoisting, TDZ, замыкания, `this` · Q1–Q16, P1–P5, T1–T4 | 1 | 2 |
| 2 | JS: объекты и данные | прототипы, классы, модули, итераторы, копирование, память, числа, `Intl` · Q17–Q35, P6–P10, T5–T7 | 2 | 1,5 |
| 3 | Асинхронность | event loop, промисы, async/await, ошибки, отмена · Q36–Q46, P11–P20, T8–T9 | 3 | 2 |
| 4 | Live coding: async | `Promise.race` / `any`, debounce, throttle, retry, пул задач · T10–T15 | 4 | 2 |
| 5 | Live coding: структуры данных | deepEqual, deepClone, EventEmitter, LRU · T16–T19 | 4 | 1,5 |
| 6 | TypeScript: основа | типизация, сужение, generics, типы для React · Q47–Q60, T20–T22 | 5 | 1,5 |
| 7 | TypeScript: type-level | mapped, conditional, `infer`, template literal, type-challenges · Q61–Q66, T23–T27 | 5 | 1,5 |
| 8 | React и React Native | рендер, хуки, мемоизация, конкурентность, New Architecture · Q67–Q80, T28–T31 | 6 | 1,5 |
| 9 | Трейдинг и геймификация | котировки, деньги и P&L, `Intl`, лидерборд · T32–T35 | 6 | 1 |
| 10 | Mock-интервью | AI играет интервьюера, разбор ошибок | 6 | 1 |
| | **Итого** | 80 вопросов, 20 пазлов, 35 задач | | **16** |

Как разложить по дням (пример): день 1 — блоки 0–2 (4 ч); день 2 — блоки 3–4 (4 ч); день 3 — блоки 5–7 (4,5 ч); день 4 — блоки 8–10 (3,5 ч). Между днями повторяй журнал ошибок (ниже).

## Как тренироваться с AI

Главное правило: **сначала сам, потом сверь с AI**. AI — экзаменатор и ревьюер, а не решатель.

1. **Вопрос `Q`.** Ответь вслух за 1–2 минуты, как на интервью. Запиши 3–5 тезисов. Только потом сверяйся с файлом ответов или с AI.
2. **Пазл `P`.** Сначала запиши вывод построчно. Потом запусти `node`. Ошибся — попроси AI разобрать по шагам, почему так.
3. **Задача `T`.** Поставь таймер. Пиши без AI и без inline-подсказок в редакторе: на интервью их не будет. Тесты из условия — критерии приёмки: задача решена, когда они проходят. Потом — ревью у AI.
4. Проси AI **объяснить, а не решить**. Застрял дольше 10 минут — проси одну подсказку, не код.
5. Каждую ошибку — в журнал. Через день и через 3 дня повтори всё, что в него попало.
6. Говори вслух, пока пишешь код: интервьюер оценивает ход мысли, а не только результат.

Готовые промпты для Claude Code, Codex или чата:

```text
Проверка ответа. Ты senior frontend-интервьюер. Вопрос: «<текст Q>». Мой ответ: «<ответ>».
Оцени 1–5 для уровня senior, назови неточности и пропуски. Не пиши правильный ответ целиком —
задай 2 уточняющих вопроса, как на интервью.
```

```text
Ревью кода. Вот условие задачи <ID> и моя реализация. Не переписывай код. Найди баги и
непокрытые крайние случаи, предложи 3 теста, которые упадут, оцени типы и читаемость.
```

```text
Подсказка. Я решаю <ID> и застрял на <месте>. Дай одну подсказку — следующий шаг, без кода.
```

```text
Объяснение. Объясни по шагам, почему код из <ID> выводит именно это. Таблица:
шаг → стек вызовов → очередь микрозадач → очередь задач (таймеры).
```

```text
Ещё варианты. Придумай 3 новые задачи уровня <ID> на ту же тему, без ответов.
Ответы покажи только после того, как я пришлю свои.
```

```text
Тесты вперёд (Claude Code / Codex). Напиши только тесты на node:test по условию <ID>,
без реализации. Реализацию я напишу сам.
```

Журнал ошибок — таблица в песочнице (`mistakes.md`):

| Дата | ID | Что не знал или перепутал | Правильная идея в 1 строку | Повторить |
|---|---|---|---|---|
| YYYY-MM-DD | Q… / P… / T… | … | … | +1 день, +3 дня |

## Что спрашивают чаще всего

Что показали списки вопросов и разборы 2024–2026 годов (английские и русскоязычные):

- **Основа JS — в каждом списке:** типы и приведение, `==` и `===`, `null` и `undefined`, `var` / `let` / `const`, hoisting и TDZ, замыкания, `this` и `call` / `apply` / `bind`, прототипы и классы, event loop, промисы и async/await, `Map` / `Set` и `WeakMap` / `WeakSet`, сборщик мусора. Источники: top-50 у [yangshun/top-javascript-interview-questions](https://github.com/yangshun/top-javascript-interview-questions) (GreatFrontEnd, «updated for 2026»), [Хабр, 2024-01-04](https://habr.com/ru/articles/784548/), [DOU: 300+ вопросов по JavaScript](https://dou.ua/lenta/articles/interview-questions-javascript-developer/) (2020).
- **Для senior добавляют:** микрозадачи, подводные камни замыканий и hoisting, итераторы и генераторы, Web Workers, мемоизацию, tree shaking, узкие места производительности, утечки памяти — [GreatFrontEnd: 20 advanced-вопросов](https://www.greatfrontend.com/blog/advanced-javascript-interviews-questions-for-10-years-experience) (2025-04-26); в списке DOU для senior: «Є проєкт з джерелами витоку пам’яті, як їх виявити, усунути та запобігти цьому в майбутньому?».
- **«Что выведет»** — почти на каждом интервью: порядок промисов и таймеров, executor промиса, `this`, hoisting, приведение типов. Первые же квизы [BFE.dev](https://bigfrontend.dev/quiz) — Promise order, Promise executor, Implicit Coercion, Hoisting, `this`; [sprintcode.pro](https://sprintcode.pro/ru/blog/frontend-interview-javascript-questions) называет такие задачи на промисах и таймерах «почти всегда».
- **Live coding:** debounce, throttle, `Promise.all` (и `allSettled` / `race` / `any`), curry, flatten, deep clone, EventEmitter, memo, pipe, свой `new`, `once`, `promisify`. [GreatFrontEnd «start here»](https://www.greatfrontend.com/front-end-interview-playbook/javascript): Debounce, Throttle, `Array.prototype.filter`, `Promise.all`, Curry, Flatten, Deep Clone; [BFE.dev, задачи 1–60](https://bigfrontend.dev/problem) — тот же набор.
- **Русскоязычные live coding:** [задачи с реальных собеседований Middle / Senior](https://github.com/a-khramtsov/frontend-livecoding-practice) помечают как «очень часто» React («найди ошибки в компоненте»: эффекты, `key`, cleanup, лишние рендеры), event loop, промисы, контекст и классы; TypeScript в live coding — «редко»; в задачах на промисы — `delay`, свои `Promise.all` / `allSettled`, повтор запроса при ошибке.
- **TypeScript:** narrowing, `unknown` vs `any`, discriminated unions, generics ([itcodik, 2026-01-20, обновлено 2026-08-14](https://itcodik.com/article/frontend-interview-questions-2026-guide)); на senior — conditional и mapped types, `infer`, `satisfies`; для практики type-level стандарт — [type-challenges](https://github.com/type-challenges/type-challenges).
- **React:** `key` и индексы, правила хуков, `useEffect` vs `useLayoutEffect`, зависимости, мемоизация, лишние рендеры, подводные камни контекста, сброс состояния, error boundaries — [yangshun/top-reactjs-interview-questions](https://github.com/yangshun/top-reactjs-interview-questions), itcodik.
- **Тренд 2025–2026:** отмена запросов (`AbortController`), гонки при поиске, вопросы про AI-инструменты (itcodik); «последовательно вместо параллельно» — любимое замечание на ревью (sprintcode).

Вывод (оценка): у senior-фронтендера интервью обычно идёт так — 2–3 вопроса по основе → 1–2 «что выведет» → live coding на 20–30 минут (задача из списка выше, затем крайние случаи и типы) → «что не так в этом компоненте» → TypeScript с углублением. Эти блоки и тренируем.

## Блок 0. Старт (0,5 ч)

**Цель:** песочница готова, правила работы с AI понятны, слабые места видны.

**Что повторить:** [Node.js: TypeScript без сборки (type stripping)](https://nodejs.org/api/typescript.html), [Node.js: test runner и MockTimers](https://nodejs.org/api/test.html#class-mocktimers).

**Практика**

1. Песочница вне дневника (≈ 10 мин). Проверено на Node.js 24 и TypeScript 7.0:

```bash
mkdir -p ~/apps/js-ts-drills && cd ~/apps/js-ts-drills
npm init -y && npm pkg set type=module
npm i -D typescript @types/node@24
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "es2025",
    "lib": ["esnext"],
    "module": "nodenext",
    "strict": true,
    "noEmit": true,
    "types": ["node"],
    "allowImportingTsExtensions": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "noUncheckedIndexedAccess": true
  }
}
```

2. Запуск (≈ 5 мин). `node --test` сам находит `*.test.ts`: Node.js 24 стирает типы без сборки — но только «стираемый» синтаксис, без `enum`, `namespace` и parameter properties (`constructor(public x: number)`); флаг `erasableSyntaxOnly` ловит это заранее. Типы проверяет `npx tsc`. Таймеры в тестах — `mock.timers` из `node:test`. Хуки (блок 8) — Jest + `@testing-library/react-native` в любом твоём RN-проекте: `renderHook`, `act`, `jest.useFakeTimers()`.

```ts
// once.test.ts — шаблон теста
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from './once.ts';

test('once: fn вызывается один раз', () => {
  let calls = 0;
  const init = once(() => ++calls);
  init();
  init();
  assert.equal(calls, 1);
});
```

3. Диагностика (≈ 15 мин, без AI и поиска). Письменно ответь на Q2, Q9, Q14, Q36, Q40, Q42, Q50, Q53, Q67, Q73 и реши P11 и P14 (вопросы и пазлы — в блоках ниже и в следующих частях). Оцени каждый ответ: 0 — не знаю, 1 — плаваю, 2 — уверенно. Где много нулей — иди медленнее и делай ★.
4. Заведи `mistakes.md` с таблицей журнала ошибок.

**Самопроверка**

- Как запустить один тест по имени (`node --test --test-name-pattern="once"`)?
- Почему `enum` в песочнице — ошибка `tsc`, а `type Side = 'buy' | 'sell'` — нет?

**Готово, когда:** `node --test` и `npx tsc` проходят на шаблоне; есть список из 3–5 слабых тем.

## Блок 1. JS: основа языка (2 ч)

**Цель:** уверенно объяснять типы, приведение, области видимости, замыкания и `this` — и применять это в коде.

**Что повторить**

- Типы и приведение: 7 примитивов и `object`; объект в примитив — `Symbol.toPrimitive`, потом `valueOf` / `toString`; `==` приводит типы, `===` нет, `Object.is` различает `NaN` и `-0`. Читать: [типы данных](https://learn.javascript.ru/types), [преобразование типов](https://learn.javascript.ru/type-conversions), [объект в примитив](https://learn.javascript.ru/object-toprimitive), [сравнения](https://learn.javascript.ru/comparison).
- Scope, hoisting, TDZ: `var` живёт в функции, `let` / `const` — в блоке и до объявления недоступны; function declaration поднимается целиком — [устаревшее ключевое слово «var»](https://learn.javascript.ru/var).
- Замыкание: функция плюс ссылка на лексическое окружение, где её создали — [замыкание](https://learn.javascript.ru/closure).
- `this` зависит от способа вызова; у стрелок своего `this` нет — [методы и this](https://learn.javascript.ru/object-methods), [привязка контекста](https://learn.javascript.ru/bind), [MDN: this](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this), [strict mode](https://learn.javascript.ru/strict-mode).

**Практика 1. Вопросы** (≈ 40 мин)

- **Q1.** Перечисли 8 типов данных JS (7 примитивов и `object`). Что вернёт `typeof` для `null`, функции, массива, `NaN`, `10n`? Как надёжно проверить массив, `null` и «plain object»?
- **Q2.** Чем отличаются `==`, `===` и `Object.is`? Приведи пример, где `===` и `Object.is` расходятся, и пример, где `==` неожиданно даёт `true`. Когда `x == null` допустимо?
- **Q3.** Как объект приводится к примитиву: `Symbol.toPrimitive`, `valueOf`, `toString`, хинты `'number'`, `'string'`, `'default'`? Разбери по шагам `[] + {}` и `+[]`.
- **Q4.** Перечисли все falsy-значения. Чем `??` отличается от `||`? Почему `price || 'N/A'` — баг для цены `0`? Что делают `?.`, `??=`, `||=`, `&&=`?
- **Q5.** Что значит «передача по значению» для примитивов и «передача ссылки по значению» (call by sharing) для объектов? Почему изменение поля объекта внутри функции видно снаружи, а переприсваивание параметра — нет?
- **Q6.** `null` и `undefined`: в чём смысловая разница? Что с ними делают `JSON.stringify` (в объекте и в массиве), параметры по умолчанию и деструктуризация с дефолтами?
- **Q7.** Что такое `Symbol` и зачем он нужен? Well-known symbols (`Symbol.iterator`, `Symbol.asyncIterator`, `Symbol.toPrimitive`), `Symbol.for`. Видны ли символьные ключи в `Object.keys`, `for...in` и `JSON.stringify`?
- **Q8.** Какие бывают области видимости (global, module, function, block)? Что такое lexical environment и scope chain? Почему `var` на верхнем уровне обычного скрипта создаёт свойство `globalThis`, а в ES module — нет?
- **Q9.** Hoisting: что именно поднимается у `var`, `let` / `const`, `class`, function declaration и function expression? Что такое TDZ? Что вернёт `typeof x` внутри TDZ и для необъявленной переменной?
- **Q10.** Что такое замыкание? Почему лексическое окружение «живёт» после выхода из функции? Назови 3 практических применения (инкапсуляция состояния, фабрики функций, мемоизация или частичное применение).
- **Q11.** Почему `for (var i = 0; i < 3; i++) setTimeout(() => console.log(i))` выводит три одинаковых числа, а с `let` — разные? Как это решали до ES2015?
- **Q12.** Как замыкание приводит к утечке памяти? Пример: подписка на WebSocket или `setInterval` в компоненте React Native без отписки. Как найти и исправить?
- **Q13.** Что меняет strict mode (`this` в обычных функциях, неявные глобальные переменные, запись в read-only свойство, `arguments`)? Где он включён автоматически?
- **Q14.** Четыре правила `this` (default, implicit, explicit через `call` / `apply` / `bind`, `new`) и их приоритет. Что будет при повторном `bind` уже привязанной функции?
- **Q15.** Чего нет у стрелочных функций (`this`, `arguments`, `prototype`, `super`, вызов через `new`)? Почему стрелка как метод объектного литерала — обычно ошибка, а стрелка как class field — частый приём?
- **Q16.** Потеря контекста: `setTimeout(obj.method)`, `onPress={this.handlePress}`, деструктуризация метода. Три способа решения и цена каждого (`bind` в конструкторе, стрелочное поле класса, обёртка-стрелка при передаче).

**Практика 2. «Что выведет»** (≈ 20 мин). Среда для всех `P`: Node.js 24, файл — ES module (`.mjs`, strict mode). Запиши вывод построчно, потом проверь `node file.mjs`.

**P1.** Приведение типов. Что выведет каждая строка? Почему `null == 0` и `null >= 0` дают разный результат?

```js
console.log(JSON.stringify([] + []), [] + {}, +[], +{});
console.log(1 + '2', '3' - 1, '3' * '4', 1 + +'2');
console.log(true + 1, null + 1, undefined + 1);
console.log([] == false, [0] == false, null == 0, null >= 0, null == undefined);
console.log(NaN === NaN, Object.is(NaN, NaN), Object.is(0, -0), 0 === -0);
console.log(typeof null, typeof NaN, typeof [], typeof (() => {}), typeof 10n);
console.log([10, 1, 2].sort(), ['b', 'a', 'C'].sort());
```

**P2.** Hoisting и TDZ. Что выведет? Почему `typeof` не спасает в TDZ?

```js
console.log(typeof hoisted, typeof expr, typeof notDeclared);
function hoisted() { return 'ok'; }
var expr = function () {};
console.log(v);
var v = 1;
try {
  console.log(l);
} catch (e) {
  console.log(e.constructor.name);
}
let l = 2;
try {
  console.log(typeof tdz);
} catch (e) {
  console.log(e.constructor.name);
}
const tdz = 3;
```

**P3.** Замыкания в цикле. Что и в каком порядке выведется?

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log('var', i), 0);
}
for (let j = 0; j < 3; j++) {
  setTimeout(() => console.log('let', j), 0);
}
const fns = [];
for (var k = 0; k < 3; k++) {
  fns.push(((n) => () => n)(k));
}
console.log(fns.map((f) => f()));
```

**P4.** Замыкания и живые привязки. Что выведет? Почему деструктурированный `inc` работает, хотя «оторван» от объекта?

```js
function createCounter() {
  let count = 0;
  return {
    inc: () => ++count,
    get value() { return count; },
  };
}
const c1 = createCounter();
const c2 = createCounter();
const { inc } = c1;
inc(); inc(); c2.inc();
console.log(c1.value, c2.value);

let x = 1;
const getX = () => x;
x = 2;
console.log(getX());

function makeAdders() {
  const adders = [];
  for (let n = 1; n <= 3; n++) adders.push((y) => y + n);
  return adders;
}
console.log(makeAdders().map((add) => add(10)));
```

**P5.** `this`. Что выведет каждая строка? ★ Как изменится третья строка вывода в CommonJS-модуле и в обычном `<script>` в браузере?

```js
const account = {
  name: 'main',
  getName() { return this?.name; },
  getNameArrow: () => typeof this,
  getNames() {
    const viaArrow = [1].map(() => this.name);
    const viaFunction = [1].map(function () { return this?.name; });
    return [viaArrow[0], viaFunction[0]];
  },
};
const { getName } = account;
console.log(account.getName());
console.log(getName());
console.log(account.getNameArrow());
console.log(getName.call({ name: 'other' }));
console.log(getName.bind({ name: 'b1' }).bind({ name: 'b2' })());
console.log(account.getNames());
```

**Практика 3. Задачи** (≈ 60 мин). Пиши в песочнице: `t1-once.ts` и `t1-once.test.ts`; тесты — из условия.

**T1. `once`** · лёгкая · ⏱ 10 мин

```ts
function once<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R;
```

- Первый вызов вызывает `fn` и запоминает результат; следующие возвращают его и `fn` не вызывают.
- Если первый вызов бросил ошибку, попытка не засчитана: следующий вызов снова вызывает `fn`.
- ★ Сохрани `this` вызова (как у обычной функции).

```ts
let calls = 0;
const init = once((x: number) => { calls++; return x * 2; });
init(2); // 4
init(5); // 4 — fn не вызывается
calls;   // 1
let attempts = 0;
const flaky = once(() => { attempts++; if (attempts === 1) throw new Error('fail'); return 'ok'; });
flaky(); // бросает Error('fail')
flaky(); // 'ok'
flaky(); // 'ok'
attempts; // 2
```

**T2. `myBind`** · лёгкая–средняя · ⏱ 15 мин

```ts
function myBind<T, A extends unknown[], B extends unknown[], R>(
  fn: (this: T, ...args: [...A, ...B]) => R,
  thisArg: T,
  ...bound: A
): (...args: B) => R;
```

- Без `Function.prototype.bind`. Сначала через `call` / `apply`. ★ Затем без них: через временное `Symbol`-свойство на `thisArg`.
- Частичное применение: `bound` идут перед аргументами вызова.
- Сигнатура проверена в TypeScript 7: для `hi` из теста ниже вызовы `hi(1)` и `hi('!', 'x')` — ошибки компиляции.
- ★ Поддержи вызов через `new` (как у нативного `bind`: `thisArg` игнорируется).

```ts
function greet(this: { name: string }, greeting: string, punct: string) {
  return `${greeting}, ${this.name}${punct}`;
}
const hi = myBind(greet, { name: 'Ann' }, 'Hi');
hi('!');                                      // 'Hi, Ann!'
myBind(greet, { name: 'Bob' })('Hello', '?'); // 'Hello, Bob?'
myBind(hi, { name: 'Zed' })('.');             // 'Hi, Ann.' — повторная привязка не меняет this
```

**T3. `memoize`** · средняя · ⏱ 20 мин

```ts
type Memoized<A extends unknown[], R> = ((...args: A) => R) & { cache: Map<string, R>; clear(): void };
function memoize<A extends unknown[], R>(
  fn: (...args: A) => R,
  options?: { getKey?: (...args: A) => string; maxSize?: number },
): Memoized<A, R>;
```

- Ключ по умолчанию — `JSON.stringify(args)`; `getKey` его заменяет.
- `maxSize`: при переполнении удаляется самая старая по вставке запись.
- ★ Если `fn` вернул промис и он отклонился — запись удаляется (ошибки не кэшируем), а два одновременных вызова получают один и тот же промис.

```ts
let calls = 0;
const square = memoize((n: number) => { calls++; return n * n; });
square(4); square(4); square(5);
calls;              // 2
square.cache.size;  // 2
const byId = memoize((u: { id: number; name: string }) => u.name.toUpperCase(), { getKey: (u) => String(u.id) });
byId({ id: 1, name: 'ann' });     // 'ANN'
byId({ id: 1, name: 'changed' }); // 'ANN' — ключ тот же
const limited = memoize((n: number) => n + 1, { maxSize: 2 });
limited(1); limited(2); limited(3);
[...limited.cache.keys()];        // ['[2]', '[3]']
```

Обсуди: почему `JSON.stringify` — слабый ключ по умолчанию (`undefined` и `null`, порядок ключей объектов, функции, циклы, `BigInt`)?

**T4. `curry`** · средняя · ⏱ 15 мин

```ts
function curry(fn: (...args: any[]) => unknown): (...args: unknown[]) => unknown;
```

- Число аргументов берётся из `fn.length`. Аргументы можно передавать любыми группами; лишние передаются в `fn`.
- Частичные применения независимы: общий массив аргументов между вызовами — баг.
- ★ Типизируй для функции из 3 аргументов без `any`.

```ts
const add3 = curry((a: number, b: number, c: number) => a + b + c) as any;
add3(1)(2)(3);     // 6
add3(1, 2)(3);     // 6
add3(1)(2, 3);     // 6
add3(1, 2, 3);     // 6
const add1 = add3(1);
add1(2)(3);        // 6
add1(10)(20);      // 31
add3()(1)()(2, 3); // 6 — пустой вызов ничего не меняет
```

**Самопроверка**

- Объясни за 30 секунд разницу `var` / `let` / `const` так, чтобы прозвучали scope, hoisting и TDZ.
- Почему `[] == false` — `true`, а `[] ? 'yes' : 'no'` — `'yes'`?
- Почему в функциональных компонентах проблемы `this` нет вовсе, а stale closure — есть?
- Где в твоём коде (Hotline.Finance, Siimply Trade) замыкание держало лишнее: подписку, таймер, большой объект?

**Готово, когда:** P1–P5 решены, ошибки разобраны и записаны в журнал; T1–T4 проходят тесты; на Q1–Q16 отвечаешь вслух без долгих пауз.

Дальше: [часть 2 — объекты и данные](01-javascript-typescript-part2.md)
