# Тренинг 1: JavaScript и TypeScript — ответы и решения

Обновлено: 2026-10-21 · Тренинг 1 из 6 · ≈ 16 часов · Вакансия: [карточка](../../card.ru.md)

Ответы, часть 9 из 9 · [1](01-javascript-typescript-answers.md) · [2](01-javascript-typescript-answers-part2.md) · [3](01-javascript-typescript-answers-part3.md) · [4](01-javascript-typescript-answers-part4.md) · [5](01-javascript-typescript-answers-part5.md) · [6](01-javascript-typescript-answers-part6.md) · [7](01-javascript-typescript-answers-part7.md) · [8](01-javascript-typescript-answers-part8.md) · вопросы: [часть 6, блок 9](../01-javascript-typescript/01-javascript-typescript-part6.md#блок-9-трейдинг-и-геймификация-1-ч)

Как пользоваться и как проверено — в [части 1](01-javascript-typescript-answers.md#как-пользоваться-ответами). T32–T35 прошли тесты из условия (`node --test`, таймеры — `mock.timers`); ожидания T34 сверены в Node.js 24.10 (ICU 77.1).

## Блок 9. Трейдинг и геймификация

**T32. Батчинг котировок** — `push` O(1), `flush` O(символов в пачке).

```ts
export type Tick = { symbol: string; price: number; ts: number };

export function createTickBatcher(onFlush: (batch: Map<string, Tick>) => void, intervalMs: number) {
  let buffer = new Map<string, Tick>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;

  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    if (buffer.size === 0) return; // пустых onFlush нет
    const batch = buffer;
    buffer = new Map(); // новый буфер: подписчик может хранить batch у себя
    onFlush(batch);
  };

  return {
    push(tick: Tick): void {
      if (disposed) return;
      const prev = buffer.get(tick.symbol);
      if (prev && prev.ts > tick.ts) return; // старее того, что уже в буфере, — игнор
      buffer.set(tick.symbol, tick);
      timer ??= setTimeout(flush, intervalMs); // таймер запускает первый push в пустой буфер
    },
    flush,
    dispose(): void {
      disposed = true;
      clearTimeout(timer);
      timer = undefined;
      buffer.clear();
    },
  };
}
```

Как проходит тест: четыре `push` — в буфере `BTC` с `ts 3` (тик с `ts 2` старее и отброшен) и `ETH`; на 99 мс пусто, на 100 — одна пачка `{ BTC: 2, ETH: 10 }`; дальше 500 мс тишины — таймер не перезапускается. `flush()` отдаёт `{ ETH: 11 }` сразу и снимает таймер — повтора через 100 мс нет. После `dispose()` буфер очищен, таймер снят, а `push` игнорируется — `onFlush` больше не вызывается. Буфер заменяется новым `Map`, а не очищается: подписчик может держать ссылку на пачку. Ограничение: «старее» сравнивается только внутри буфера. Тик, который опоздал после flush, отсекают уже в сторе по `ts` (см. ниже). При 500 тиках в секунду и `intervalMs = 100` стор обновляется **не чаще 10 раз в секунду**, независимо от числа тиков, и в каждой пачке не больше одного тика на символ.

★ Zustand (проверено `tsc` на zustand 5.0.15): один `setState` на пачку, строка подписана на свой символ.

```ts
type QuotesState = { bySymbol: Record<string, Tick>; apply: (batch: Map<string, Tick>) => void };

export const useQuotes = create<QuotesState>()((set) => ({
  bySymbol: {},
  apply: (batch) =>
    set((s) => {
      const next = { ...s.bySymbol };
      for (const [symbol, tick] of batch) {
        const prev = next[symbol];
        if (!prev || prev.ts < tick.ts) next[symbol] = tick; // между пачками тоже не откатываемся назад
      }
      return { bySymbol: next }; // один setState на пачку
    }),
}));

export const batcher = createTickBatcher((batch) => useQuotes.getState().apply(batch), 100);
// socket.onTick = (tick) => batcher.push(tick);

export function usePrice(symbol: string): number | undefined {
  return useQuotes((s) => s.bySymbol[symbol]?.price); // строка перерисуется только при смене своей цены
}
```

**T33. Деньги и P&L без float** — `toUnits` / `fromUnits` O(длина строки), `calcPnL` O(сделок + лотов).

```ts
const AMOUNT = /^-?\d+(\.\d+)?$/;

export function toUnits(amount: string, scale: number): bigint {
  if (!AMOUNT.test(amount)) throw new TypeError(`invalid amount: '${amount}'`);
  const negative = amount.startsWith('-');
  const [int = '', frac = ''] = (negative ? amount.slice(1) : amount).split('.');
  if (frac.length > scale) throw new RangeError(`more than ${scale} decimals: '${amount}'`); // не округляем молча
  const units = BigInt(int + frac.padEnd(scale, '0')); // '123.45', 2 → '12345' → 12345n
  return negative ? -units : units;
}

export function fromUnits(units: bigint, scale: number): string {
  const negative = units < 0n;
  const digits = (negative ? -units : units).toString().padStart(scale + 1, '0'); // -5n, 2 → '005'
  const int = digits.slice(0, digits.length - scale);
  const frac = digits.slice(digits.length - scale);
  return (negative ? '-' : '') + (scale > 0 ? `${int}.${frac}` : int);
}

type Fill = { side: 'buy' | 'sell'; qty: number; price: string };
type Lot = { qty: bigint; price: bigint };

export function calcPnL(fills: readonly Fill[], markPrice: string, scale = 2) {
  const lots: Lot[] = []; // открытые лоты в порядке покупки (FIFO)
  let position = 0n;
  let realized = 0n;
  for (const fill of fills) {
    if (!Number.isInteger(fill.qty) || fill.qty <= 0) throw new RangeError(`qty must be a positive integer, got ${fill.qty}`);
    const qty = BigInt(fill.qty);
    const price = toUnits(fill.price, scale);
    if (fill.side === 'buy') {
      lots.push({ qty, price });
      position += qty;
      continue;
    }
    if (qty > position) throw new RangeError(`cannot sell ${qty}, position is ${position}`);
    position -= qty;
    let left = qty;
    while (left > 0n) {
      const lot = lots[0]!; // есть: проверили qty <= position
      const used = left < lot.qty ? left : lot.qty;
      realized += (price - lot.price) * used;
      lot.qty -= used;
      left -= used;
      if (lot.qty === 0n) lots.shift();
    }
  }
  const mark = toUnits(markPrice, scale);
  const unrealized = lots.reduce((sum, lot) => sum + (mark - lot.price) * lot.qty, 0n);
  return { positionQty: Number(position), realized: fromUnits(realized, scale), unrealized: fromUnits(unrealized, scale) };
}
```

Решения по деньгам. Цена приходит строкой и сразу становится целым числом minor units (`'10.5'` при scale 2 → `1050n`). Строгая регулярка отсекает `'1e3'`, `''`, `'1.'`, `'.5'`, `'1,5'`, `' 1'`, `'+1'` — тихого «исправления» ввода нет. Лишние знаки — `RangeError`, а не округление: `'1.005'` при scale 2 — ошибка данных, а не 1,00 или 1,01. `fromUnits` дополняет нулями слева (`padStart(scale + 1)`), поэтому `-5n` → `'-0.05'`, а `0n` → `'0.00'`; при scale 0 точки нет. В `calcPnL` есть только сложение, вычитание и умножение на целое `qty` — scale не меняется и округлять нечего. FIFO: продажа 15 закрывает 10 по 100 и 5 по 110 → `realized = 10·20 + 5·10 = 250.00`, остаток 5 по 110 при mark 105 → `-25.00`. Во float второй тест даёт `0.8999999999999999` вместо `0.90` (проверено). Количество хранится как `bigint`, чтобы произведение цены и количества не смешивало типы. `positionQty` отдаётся как `number` по сигнатуре задачи.

Что меняется для крипты. Количество дробное (8 знаков) — тоже minor units: `qtyUnits` со scale 8. Сумма сделки = `priceUnits × qtyUnits` со scale «цены + количества» (2 + 8 = 10). Чтобы показать её в валюте котировки со scale 2, нужно **одно** явное деление с режимом округления, согласованным с биржей (half-even, или вверх для комиссий). Промежуточные суммы держим в полном scale и округляем один раз в конце. Ещё проверяем кратность шагу цены (tick size) и шагу количества (lot size). Деление с half-even (проверено тестом):

```ts
export function divRoundHalfEven(a: bigint, b: bigint): bigint { // b > 0
  const q = a / b; // усечение к нулю
  const r = a % b; // знак как у a
  const twice = 2n * (r < 0n ? -r : r);
  const away = a < 0n ? -1n : 1n;
  if (twice < b) return q;
  if (twice > b) return q + away;
  return q % 2n === 0n ? q : q + away; // ровно половина → к чётному
}
// 64250.12 USDT × 0.00012345 BTC: divRoundHalfEven(6425012n * 12345n, 10n ** 8n) → 793n = 7.93 USDT
```

**T34. Цены через `Intl.NumberFormat`.**

```ts
const formatters = new Map<string, Intl.NumberFormat>();

function getFormatter(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`; // одинаковые опции → один ключ (порядок полей у нас фиксирован)
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options); // дорого: только при первом вызове
    formatters.set(key, formatter);
  }
  return formatter;
}

export function formatPrice(value: number, currency: string, fractionDigits: number, locale = 'en-US'): string {
  return getFormatter(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatChangePercent(ratio: number, locale = 'en-US'): string {
  return getFormatter(locale, {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'exceptZero', // '+' у положительных, у нуля (и у «округлилось до нуля») знака нет
  }).format(ratio);
}

export function formatVolume(value: number, locale = 'en-US'): string {
  return getFormatter(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}
```

Все 12 ожиданий совпали в Node.js 24.10, включая неразрывные пробелы U+00A0 в `'1.234,50 €'` и `'1,5 тыс.'` — в тесте они записаны как ` `. `formatChangePercent(-0.00001)` → `'0.00%'`: `exceptZero` смотрит на **округлённое** значение, поэтому «−0.00%» не появится. Кэш: 1000 вызовов `formatPrice` с одними параметрами не добавили ни одного форматтера (проверено). Ключ кэша из `JSON.stringify` зависит от порядка полей — у нас он фиксирован в коде; для общего кэша нормализуй ключ. Hermes: по документации на iOS у `NumberFormat` нет `signDisplay` и `notation: 'compact'`. Значит, `formatChangePercent` и `formatVolume` нужно проверить на iPhone, а запасной вариант — знак вручную (`+`, если округлённое значение > 0) и свои пороги K / M / B, или полифил `@formatjs/intl-numberformat`. ★ `(1.005).toFixed(2)` → `'1.00'`, а `Intl` с `maximumFractionDigits: 2` → `'1.01'` (проверено; так же `1.255` → `'1.25'` и `'1.26'`). Причина: `toFixed` округляет точное двоичное значение `1.00499999999999989…`. ECMA-402 сначала переводит число в кратчайшую десятичную запись через `Number::toString` (`'1.005'`, как печатает `String(1.005)`), и округляет уже её (по умолчанию `halfExpand`). С `roundingMode: 'halfEven'` `2.345` → `'2.34'`. Вывод: `Intl` округляет «по-человечески», но это только отображение — считать всё равно в `bigint`.

**T35. Лидерборд турнира** — `submit` O(1), `top` O(P log P).

```ts
type ScoreEvent = { playerId: string; score: number; ts: number };
type Row = { rank: number; playerId: string; score: number };

export function createLeaderboard() {
  const best = new Map<string, { score: number; ts: number }>(); // лучший результат игрока

  const compare = (a: ScoreEvent, b: ScoreEvent) =>
    b.score - a.score || // очки по убыванию
    a.ts - b.ts || // раньше набрал — выше
    (a.playerId < b.playerId ? -1 : a.playerId > b.playerId ? 1 : 0); // детерминированно, без локали

  return {
    submit(event: ScoreEvent): void {
      const prev = best.get(event.playerId);
      if (!prev || event.score > prev.score) best.set(event.playerId, { score: event.score, ts: event.ts }); // строго больше
    },
    top(n: number): Row[] {
      if (n <= 0) return [];
      const sorted = Array.from(best, ([playerId, { score, ts }]) => ({ playerId, score, ts })).sort(compare);
      const rows: Row[] = [];
      for (const [i, { playerId, score }] of sorted.slice(0, n).entries()) {
        const prev = rows[i - 1];
        const rank = prev && prev.score === score ? prev.rank : i + 1; // «1224»: равные очки — общий ранг
        rows.push({ rank, playerId, score });
      }
      return rows;
    },
  };
}
```

Только **строго больший** результат обновляет запись. Равный результат не меняет `ts`, поэтому `cid` со 120 на `ts 7` остаётся с `ts 3`, а `eve` (120, `ts 2`) встаёт между `ann` и `cid`. Ранг «1224»: при равных очках ранг предыдущей строки, иначе позиция + 1 — после двух вторых мест идёт четвёртое. `top(0)` → `[]`, `n` больше числа игроков — `slice` отдаёт всех. `playerId` сравниваем по кодам символов, а не через `localeCompare`: результат не зависит от локали устройства и одинаков на клиенте и сервере. Обсуждение масштаба: при 100 000 игроков `top(100)` раз в секунду полная сортировка — это около 1,7 млн сравнений в секунду на JS-потоке телефона, заметные подтормаживания. Лучше поддерживать порядок постепенно: отсортированный массив с бинарным поиском места (O(log P) поиск, `splice` O(P), но быстрый) или дерево / skip list; `top(n)` тогда — срез за O(n). Где считать рейтинг: на сервере. Клиенту нельзя доверять очки и ранги (античит); сервер держит, например, Redis sorted set и присылает top-100 плюс ранг самого игрока. Ранг вне top-100: «1224»-ранг = 1 + число игроков со строго большим счётом (в Redis — `ZCOUNT` по диапазону выше счёта игрока). Свой пример — механики HabitHero (лиги, очки, стрики).

## Блок 10. Mock-интервью

ID в этом блоке нет. После прогона сверяй каждую ошибку по ID в этих ответах. В журнал записывай не «ошибся в P14», а правильную идею в одну строку: «`return promise` из `then` — +2 тика». Если AI-интервьюер дал задачу не из тренинга, после интервью попроси его показать, какие ID из этого тренинга она проверяла — и повтори их.

## Источники

Проверка кода и вывода — локально в Node.js 24.10 (V8 13.6, ICU 77.1), TypeScript 7.0.2 и 6.0.3, Jest 30, `@testing-library/react` 16.3, `@testing-library/react-native` 14.1, React 19.3, React Native 0.88, zod 4.6.7, zustand 5.0.15.

- TC39: finished proposals (годы ES2023–ES2027) — https://github.com/tc39/proposals/blob/main/finished-proposals.md · проверено 2026-10-21
- ECMA-402: ToIntlMathematicalValue (Number → `Number::toString`) — https://tc39.es/ecma402/#sec-tointlmathematicalvalue · проверено 2026-10-21
- Node.js: `require()` ES-модулей, история версий — https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require · проверено 2026-10-21
- TypeScript 6.0 — https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/; TypeScript 7.0 — https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/ · проверено 2026-10-21
- TSConfig: `strict` — https://www.typescriptlang.org/tsconfig/#strict · проверено 2026-10-21
- React Native 0.84 (Hermes V1) — https://reactnative.dev/blog/2026/02/11/react-native-0.84; 0.87 — https://reactnative.dev/blog/2026/08/11/react-native-0.87; 0.88 — https://reactnative.dev/blog/2026/10/19/react-native-0.88 · проверено 2026-10-21
- RFC 0744: well-defined event loop — https://github.com/react-native-community/discussions-and-proposals/blob/main/proposals/0744-well-defined-event-loop.md · проверено 2026-10-21
- React Native DevTools (панель Performance с 0.83) — https://reactnative.dev/docs/react-native-devtools · проверено 2026-10-21
- Hermes: Intl APIs — https://github.com/facebook/hermes/blob/main/doc/IntlAPIs.md · проверено 2026-10-21
- react-native-worklets: `runOnJS` (устарел) — https://docs.swmansion.com/react-native-worklets/docs/threading/runOnJS; `scheduleOnRN` — https://docs.swmansion.com/react-native-worklets/docs/threading/scheduleOnRN; `createWorkletRuntime` — https://docs.swmansion.com/react-native-worklets/docs/threading/createWorkletRuntime · проверено 2026-10-21
- react.dev: React Compiler — https://react.dev/learn/react-compiler/introduction; `useEffectEvent` — https://react.dev/reference/react/useEffectEvent; `use` — https://react.dev/reference/react/use; eslint-plugin-react-hooks — https://react.dev/reference/eslint-plugin-react-hooks · проверено 2026-10-21
- React Navigation 7.x: TypeScript — https://reactnavigation.org/docs/typescript/ · проверено 2026-10-21
- React Native Testing Library 14: `renderHook` — https://oss.callstack.com/react-native-testing-library/docs/api/misc/render-hook · проверено 2026-10-21
- FlashList v2: README пакета `@shopify/flash-list` 2.3.3 — https://github.com/Shopify/flash-list · проверено 2026-10-21
- Zod 4: размеры бандла — https://zod.dev/v4 · проверено 2026-10-21
- AWS: Exponential Backoff And Jitter — https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/ · проверено 2026-10-21
- Binance Spot API: `newClientOrderId` — https://raw.githubusercontent.com/binance/binance-spot-api-docs/master/rest-api.md · проверено 2026-10-21
