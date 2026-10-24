# Управление состоянием: одна задача — два решения (Zustand и MobX)

Обновлено: 2026-10-21 · Тренинг 5 из 6 · ≈ 16 часов · Вакансия: [карточка](../../card.ru.md)

Часть 1 из 7 · [2](05-state-management-zustand-mobx-part2.md) · [3](05-state-management-zustand-mobx-part3.md) · [4](05-state-management-zustand-mobx-part4.md) · [5](05-state-management-zustand-mobx-part5.md) · [6](05-state-management-zustand-mobx-part6.md) · [7](05-state-management-zustand-mobx-part7.md)

## Зачем этот тренинг

Следующий этап в IBIT (вероятный работодатель) — техническое интервью с Senior Frontend-разработчиком ([интервью](../../interviews.ru.md)). Роль — React Native-разработчик в трейдинговой платформе: основное приложение и новые геймифицированные «trading mini-apps» — турниры, челленджи, лояльность, ачивки. В вакансии прямо написано: «Понимание client state management: Zustand, Redux Toolkit, React Query или аналоги» ([вакансия](../../job-description.ru.md)).

Senior Frontend почти наверняка спросит «почему Zustand, а не Redux или MobX?» и «как не перерисовать весь список на каждый тик?». Сильный ответ — понимать обе модели изнутри. Поэтому здесь 10 задач, и **каждая решена дважды**: на Zustand и на MobX, с общим тестом и сравнением.

На что опираться — только факты из резюме:

- **Hotline.Finance** (2020–2025, тимлид React Native): fintech-приложение, 100+ → 100k+ MAU; переход на New Architecture (Fabric); **MobX-State-Tree → Zustand**; валидация на Zod; тесты Jest + Maestro.
- **Siimply Trade** (2025–2026): трейдинговое приложение на Expo с нуля — 60+ экранов, 85% покрытия тестами.
- **HabitHero**: геймификация — лиги, очки, уровни, стрики, награды, челленджи; мобильная часть и бэкенд. **My Way Club**: рефералы, бонусы, кэшбек.
- В резюме: Zustand, Redux, MobX-State-Tree, React Hook Form, Zod, TanStack Query, TypeScript, Jest.
- **Пробел**: WebSocket почти не делал → задача 4 здесь и демо в [тренинге 6](../06-websocket-demo-binance/06-websocket-demo-binance.md).

С этими библиотеками ты плотно работал около 2 лет назад, многое забылось. Тренинг идёт от основ до вопросов senior-уровня. А MobX за это время сменил мажорную версию — смотри «Что изменилось».

## Как заниматься с AI

Ты учишься вместе с Claude Code / Codex, но думаешь и пишешь сам ([тренинг 3](../03-ai-tools-claude-code-codex/03-ai-tools-claude-code-codex.md)).

1. **Сначала сам, потом сверь с AI.** В каждой задаче есть «Попробуй сам» — 25–35 минут без AI. Только потом открывай решения и зови AI на ревью.
2. **Попроси AI объяснить, а не решить.** «Почему этот компонент перерисовывается?» — да. «Напиши стор» — нет.
3. **Проверяй AI по версиям.** MobX 7 вышел 2026-07-30, и модели часто пишут код MobX 6. Таблица ниже.
4. **Тесты — арбитр.** Каждое решение здесь проверено `tsc` и Jest. Твоё должно проходить те же тесты.

| Зачем | Промпт |
|---|---|
| Ревью решения | «Вот моя реализация задачи N на Zustand и на MobX. Сделай ревью как senior React Native: ре-рендеры, гонки, утечки, типы, тестируемость. Только замечания с приоритетом, без исправленного кода.» |
| Сравнение с эталоном | «Сравни мою версию с этой: [решение]. Где моя хуже или лучше и почему? Не переписывай.» |
| Объяснение | «Объясни на примере котировок, почему этот компонент перерисовывается: [код]. Потом задай мне 2 вопроса и не отвечай за меня.» |
| Третий вариант | «Как эту задачу решили бы на Redux Toolkit? Только идея и trade-offs, 5 пунктов, без кода.» |
| Проверка версий | «Сверь мой код с MobX 7.1 и Zustand 5.0 по документации [ссылка]. Что устарело?» |

## Что изменилось к 2026-10 — где AI часто ошибается

| Тема | Как правильно сейчас | Где в тренинге |
|---|---|---|
| MobX 7 (2026-07-30): API | `observableRef`, `observableShallow`, `observableStruct`, `computedStruct`, `actionBound`, `flowBound`, `compareStructural` вместо `observable.ref`, `computed.struct`, `action.bound`, `comparer.*`; только Proxy; декораторы — только Stage 3 (`@observable accessor`) | задачи 2, 4; часть страниц доки ещё показывает старые имена — сверяйся с migration guide |
| MobX 7: отладка | `trace` удалён → `getDependencyTree`, `spy`, `mobx-log` | задача 10 |
| mobx-react-lite 5, mobx-react 10 | остались `observer`, `Observer`, `useLocalObservable`, `enableStaticRendering`; удалены `useLocalStore`, `useObserver`, batching-импорт для RN, `Provider` и `inject` → обычный React context | задача 9 |
| `mobx-utils` | 6.1.1 объявляет peer `mobx ^6`: с MobX 7 `npm install` падает с ERESOLVE (проверено) | не тащи `computedFn` по привычке |
| Zustand 5: селекторы | селектор, который возвращает новый объект или массив, даёт `Maximum update depth exceeded` (проверено тестом); лечится `useShallow` из `zustand/react/shallow` | задача 5 |
| Zustand `devtools` | работает через Redux DevTools Extension — в React Native её нет | задача 10 |
| MMKV 4 | `createMMKV()` вместо `new MMKV()`, `remove()` вместо `delete()`; нужен `react-native-nitro-modules`; в Jest мокаем Nitro | блок 0, задача 6 |
| RNTL 14 | `render`, `fireEvent`, `act`, `renderHook` асинхронные — всегда `await`; peer — `test-renderer` | задача 9 |
| Babel в RN и Expo | поле класса без инициализатора (`price: number \| undefined;`) вырезается → MobX его не видит (проверено на `@react-native/babel-preset` 0.88 и `babel-preset-expo` 58) | инициализируй все поля стора |
| React Compiler + MobX | по документации React, `observer` ломает предположения мемоизации; если компонент перестал обновляться — `"use no memo"` | задача 5 |
| Пакеты «по совету AI» | `reactotron-mobx` на npm — security holding package (0.0.1-security) | `npm view <пакет>` перед установкой |

## Версии на 2026-10-21 (npm)

| Пакет | Версия | Релиз |
|---|---|---|
| zustand | 5.0.15 | 2026-08-13 |
| mobx · mobx-react-lite | 7.1.0 · 5.1.0 | 2026-10-20 · 2026-09-24 |
| mobx-state-tree | 8.0.0 (требует MobX 7) | 2026-09-02 |
| @reduxjs/toolkit · react-redux | 2.13.0 · 9.3.0 | 2026-09-29 · 2026-05-15 |
| @tanstack/react-query | 5.104.5 | 2026-10-19 |
| react-native-mmkv · react-native-nitro-modules | 4.3.2 · 0.37.1 | 2026-06-22 · 2026-08-27 |
| immer · decimal.js · zod | 11.2.7 · 10.6.0 · 4.6.7 | 2026-10-21 · 2025-07-06 · 2026-10-12 |
| react · react-native | 19.3.1 · 0.88.0 | 2026-10-14 · 2026-10-15 |
| jest · @testing-library/react-native | 30.5.2 · 14.1.0 | 2026-09-18 · 2026-10-08 |
| typescript | 6.0.3 и 7.0.2 — код проверен обоими | 2026-04-16 · 2026-07-08 |

## Как устроена каждая задача

Условие → **Попробуй сам** (время и критерии, без AI) → ⛔ → решение на Zustand → решение на MobX → тест, общий для обеих реализаций → сравнение (ре-рендеры, boilerplate, тестируемость, ловушки) → ещё практика → самопроверка → «готово, когда…».

Практика задачи — это «Попробуй сам» (главное упражнение) и «Ещё практика» (расширения, часто с AI). Код лежит в файлах `src/<тема>/…`, путь — в первой строке каждого блока. Все решения собраны в песочнице из блока 0 и проверены: `tsc` (TypeScript 6.0.3 и 7.0.2) и Jest (46 тестов).

## План на 16 часов

| # | Блок | Часы | Где |
|---|---|---|---|
| 0 | Песочница: Jest с пресетом RN, TypeScript, мок MMKV | 0,5 | часть 1 |
| 1 | Теория: виды состояния, две модели, Redux Toolkit, MobX-State-Tree | 1,5 | часть 1 |
| 2 | Задача 1. Watchlist: добавить, удалить, переставить | 1 | [часть 2](05-state-management-zustand-mobx-part2.md) |
| 3 | Задача 2. Портфель и P&L: производные значения и деньги | 1,5 | часть 2 |
| 4 | Задача 3. Загрузка, ошибки, отмена устаревших запросов | 1,5 | [часть 3](05-state-management-zustand-mobx-part3.md) |
| 5 | Задача 4. Котировки в реальном времени: пачки и conflation | 1,5 | [часть 4](05-state-management-zustand-mobx-part4.md) |
| 6 | Задача 5. Контроль ре-рендеров и замеры | 1,5 | часть 4 |
| 7 | Задача 6. Persistence в React Native: MMKV и миграции | 1,5 | [часть 5](05-state-management-zustand-mobx-part5.md) |
| 8 | Задача 7. Оптимистичный ордер с откатом | 1 | часть 5 |
| 9 | Задача 8. Геймификация: челленджи, стрики, ачивки | 1,5 | [часть 6](05-state-management-zustand-mobx-part6.md) |
| 10 | Задача 9. Тесты: сторы без React и экраны с React | 1 | часть 6 |
| 11 | Задача 10. Отладка: devtools в React Native | 0,5 | [часть 7](05-state-management-zustand-mobx-part7.md) |
| 12 | Вопросы интервью и мок-интервью с AI | 1,5 | часть 7 |
| | **Итого** | **16** | |

Ритм: 4 сессии — блоки 0–1 и задачи 1–2 (4,5 ч), задачи 3–5 (4,5 ч), задачи 6–8 (4 ч), задачи 9–10 и мок-интервью (3 ч).

## Блок 0. Песочница (0,5 ч)

**Цель.** Один проект на все 10 задач: TypeScript, Jest с пресетом React Native, Zustand, MobX и мок MMKV.

**Что повторить**

- В `react-native` 0.88 своего `jest-preset` нет — подключай пакет `@react-native/jest-preset`.
- `transformIgnorePatterns`: mobx, immer, react-redux, Redux Toolkit и MMKV для условия `react-native` отдают ESM — Jest должен прогнать их через Babel.
- MMKV в Jest сам подставляет in-memory хранилище (`createMMKV()` проверяет `JEST_WORKER_ID`), но модуль Nitro грузится при импорте — его мокаем.
- `noUncheckedIndexedAccess`: `bySymbol[symbol]` типизируется как `Quote | undefined` — честно для словарей котировок.

**Практика** (20 мин; ещё 10 — на «Что повторить»)

1. **Собери песочницу** (15 мин). Команды и файлы ниже. *Критерий:* `npm run typecheck` без ошибок; после блока 1 `npm test` — 3 зелёных теста.

```bash
mkdir state-lab && cd state-lab && npm init -y
npm i zustand@5.0.15 mobx@7.1.0 mobx-react-lite@5.1.0 mobx-state-tree@8.0.0 immer@11.2.7 \
  @reduxjs/toolkit@2.13.0 react-redux@9.3.0 @tanstack/react-query@5.104.5 \
  decimal.js@10.6.0 zod@4.6.7 react@19.3.1 react-native@0.88.0 \
  react-native-mmkv@4.3.2 react-native-nitro-modules@0.37.1
npm i -D typescript@6.0.3 jest@30.5.2 babel-jest@30.5.2 @types/jest@30.0.0 @types/react@19.3.0 \
  @react-native/babel-preset@0.88.0 @react-native/jest-preset@0.88.0 \
  @react-native/typescript-config@0.88.0 @testing-library/react-native@14.1.0 test-renderer@1.3.1
npm pkg set scripts.typecheck="tsc -p . --noEmit" scripts.test="jest"
# по желанию — проверка TypeScript 7: npx -p typescript@7.0.2 tsc -p . --noEmit
```

```js
// babel.config.js
module.exports = { presets: ['module:@react-native/babel-preset'] };
```

```js
// jest.config.js
module.exports = {
  preset: '@react-native/jest-preset',
  // эти пакеты для условия react-native отдают ESM — пусть Babel их тоже трансформирует
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|react-native-mmkv|react-native-nitro-modules|mobx|mobx-react-lite|mobx-state-tree|immer|react-redux|@reduxjs/toolkit)/)',
  ],
  testTimeout: 30000, // первый прогон медленный: Babel трансформирует модули RN
};
```

```jsonc
// tsconfig.json
{
  "extends": "@react-native/typescript-config",
  "compilerOptions": { "noUncheckedIndexedAccess": true },
  "include": ["src"]
}
```

```js
// __mocks__/react-native-nitro-modules.js — так же сделано в репозитории react-native-mmkv
// В Jest createMMKV() сам возвращает in-memory мок, но Nitro импортируется при загрузке модуля
module.exports = {
  NitroModules: { createHybridObject: jest.fn(() => ({})) },
};
```

```ts
// src/rn-env.d.ts — в песочнице нет App.tsx: глобальные типы RN (fetch, AbortController, WebSocket) подключаем явно
/// <reference types="react-native" />
```

2. **Разбери конфиг с AI** (5 мин). «Объясни каждую строку `jest.config.js`. Что сломается без мока Nitro?» Сверь ответ с README `@react-native/jest-preset`. *Критерий:* объясняешь своими словами, зачем каждый пункт.

**Готово, когда…** песочница собрана, `npm run typecheck` проходит.

## Блок 1. Освежить теорию (1,5 ч)

**Цель.** За 2 минуты объяснить, что где хранить и почему компонент перерисовывается — в Zustand и в MobX.

**Что повторить**

**1. Какое бывает состояние и где его держать**

| Вид | Пример в трейдинге | Где держать |
|---|---|---|
| Server state | позиции, история ордеров, профиль, лидерборд | TanStack Query: кэш, повторы, инвалидация |
| Realtime | котировки, стакан | стор вне React (Zustand / MobX), обновления пачками |
| Client state | черновик тикета, фильтры, таймфрейм графика | Zustand / MobX; локальное для экрана — `useState` |
| Derived | стоимость портфеля, P&L, прогресс челленджа | не хранить: селектор или `computed` |
| Persisted | watchlist, настройки | MMKV через `persist` или `reaction` |
| Secret | токены | SecureStore — не стор и не MMKV |

Главное правило: серверные данные живут в TanStack Query, в стор их не копируют. Иначе получаешь два источника правды, а кэш, устаревание, повторы и инвалидацию пишешь руками. Документация TanStack Query: после переноса серверных данных глобального клиентского состояния обычно остаётся мало, но Query — не замена клиентскому стору. Исключение — высокочастотные потоки вроде котировок: десятки `setQueryData` в секунду — лишняя работа на JS-потоке ([тренинг 2](../02-trading-app-architecture/02-trading-app-architecture.md)). Слой API — в [api-layer](../../../../../interview-prep/technical/api-layer.ru.md).

**2. Производное состояние**

Не храни то, что можно вычислить. Храни источники (позиции, цены, статистику), а стоимость, P&L и прогресс считай:

- Zustand — в селекторе; тяжёлое или возвращающее объект — с мемоизацией по ссылкам входов.
- MobX — в `computed`: результат кэшируется, пока за ним кто-то наблюдает, и пересчитывается только при изменении прочитанных observable. Вне реактивного контекста (без `observer` или `reaction`) `computed` пересчитывается на каждое чтение.

**3. Две модели**

- **Zustand — иммутабельные снимки.** `set` создаёт новый объект состояния (поверхностное слияние верхнего уровня). Компонент подписан через `useSyncExternalStore`: после каждого `set` React вызывает селектор и сравнивает результат с прошлым через `Object.is`. Другой результат — ре-рендер. Если updater вернул тот же объект, подписчиков не будят вообще.
- **MobX — изменяемые observable и автоматическое отслеживание.** `observer` запоминает, какие observable компонент прочитал во время рендера, и перерисовывает его, только когда меняются именно они. `action` группирует изменения: реакции запускаются один раз в конце. `computed` кэширует производное.

| | Zustand | MobX |
|---|---|---|
| Модель | иммутабельный снимок | изменяемые observable |
| Подписка | явная: селектор | автоматическая: что прочитал `observer` |
| Решение о ре-рендере | `Object.is` результата селектора; `useShallow` — поверхностно | изменилось ли прочитанное observable |
| Обновление | `set(partial)` / `set(fn)`, новые ссылки | мутация внутри `action` |
| Производное | селектор + мемоизация | `computed` |
| Типичная ошибка | селектор вернул новый объект; мутация без новой ссылки | чтение вне `observer`; observable в не-observer компоненте |
| API | маленький, хуки | больше: аннотации, reactions, `configure` |

Ловушка именно React Native: Babel (`@react-native/babel-preset` и `babel-preset-expo`) вырезает поля класса без инициализатора, и `makeAutoObservable` их просто не видит. Правило: каждое поле стора — с начальным значением. Проверь сам:

```ts
// src/theory/class-fields.test.ts — ловушка RN: Babel вырезает поля класса без инициализатора
import { isObservableProp, makeAutoObservable } from 'mobx';

class Bad {
  price: number | undefined; // нет инициализатора → в сборке RN поля нет, MobX его не видит
  constructor() {
    makeAutoObservable(this);
  }
}

class Good {
  price: number | undefined = undefined; // инициализировано → observable
  constructor() {
    makeAutoObservable(this);
  }
}

test('an uninitialized class field is not observable under the RN Babel preset', () => {
  expect(isObservableProp(new Bad(), 'price')).toBe(false);
  expect(isObservableProp(new Good(), 'price')).toBe(true);
});
```

**4. Где Redux Toolkit**

Модель та же, что у Zustand, — иммутабельные снимки и селекторы, но формальнее: actions и reducers (Immer внутри `createSlice`), middleware, Redux DevTools с time travel, RTK Query для серверных данных, `createEntityAdapter`, `createSelector`. Нужен `Provider`. Выбирай, если команда большая и нужны жёсткие соглашения, уже есть Redux-кодовая база, нужен RTK Query или сложные потоки событий (listener middleware). Цена — больше церемоний. Тот же watchlist на RTK (правила домена общие для всех реализаций):

```ts
// src/watchlist/rules.ts — правила домена, общие для всех реализаций
export const normalize = (raw: string) => raw.trim().toUpperCase();

export const canMove = (length: number, from: number, to: number) =>
  from !== to && from >= 0 && to >= 0 && from < length && to < length;
```

```ts
// src/theory/watchlist.rtk.ts — тот же watchlist на Redux Toolkit 2
import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import { canMove, normalize } from '../watchlist/rules';

const watchlistSlice = createSlice({
  name: 'watchlist',
  initialState: { symbols: [] as string[] },
  reducers: {
    added(state, action: PayloadAction<string>) {
      const symbol = normalize(action.payload);
      if (symbol && !state.symbols.includes(symbol)) state.symbols.push(symbol); // Immer внутри createSlice
    },
    removed(state, action: PayloadAction<string>) {
      const i = state.symbols.indexOf(normalize(action.payload));
      if (i !== -1) state.symbols.splice(i, 1);
    },
    moved(state, action: PayloadAction<{ from: number; to: number }>) {
      const { from, to } = action.payload;
      if (canMove(state.symbols.length, from, to)) state.symbols.splice(to, 0, ...state.symbols.splice(from, 1));
    },
  },
  selectors: { selectSymbols: (state) => state.symbols },
});

export const { added, removed, moved } = watchlistSlice.actions;
export const { selectSymbols } = watchlistSlice.selectors;

export const store = configureStore({ reducer: { watchlist: watchlistSlice.reducer } });
export type RootState = ReturnType<typeof store.getState>;
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppDispatch = useDispatch.withTypes<typeof store.dispatch>();
```

**5. MobX-State-Tree и MobX**

MST = MobX + дерево моделей с runtime-типами (`types.model`), снимки (`getSnapshot`, `onSnapshot`, `applySnapshot`), патчи, ссылки по идентификатору, middleware. Менять состояние можно только в actions — иначе ошибка. В документации MST: «MobX — это двигатель, а MobX-State-Tree — люксовый автомобиль». Цена: дерево и runtime-проверки стоят памяти и CPU при создании больших деревьев; типы описываются моделями, а TS-типы выводятся (`Instance<typeof X>`), ошибки компилятора длинные; больше API для изучения.

```ts
// src/theory/watchlist.mst.ts — так выглядел бы watchlist на MobX-State-Tree
import { getSnapshot, onSnapshot, type SnapshotOut, types } from 'mobx-state-tree';
import { normalize } from '../watchlist/rules';

export const Watchlist = types
  .model('Watchlist', { symbols: types.array(types.string) }) // runtime-типы: проверка при create/applySnapshot
  .views((self) => ({
    get count() { return self.symbols.length; },
  }))
  .actions((self) => ({
    add(raw: string) {
      const symbol = normalize(raw);
      if (symbol && !self.symbols.includes(symbol)) self.symbols.push(symbol);
    },
  }));

export type WatchlistSnapshot = SnapshotOut<typeof Watchlist>;

// Снимки из коробки: persistence — это onSnapshot + applySnapshot
export function persistWatchlist(save: (json: string) => void) {
  const wl = Watchlist.create({ symbols: [] });
  const stop = onSnapshot(wl, (snapshot) => save(JSON.stringify(snapshot)));
  return { wl, stop, snapshot: () => getSnapshot(wl) };
}
```

Почему команды уходят с MST на Zustand — общие причины, не про конкретный проект:

- серверные данные переехали в TanStack Query → клиентского состояния осталось мало, дерево моделей стало избыточным;
- меньше кода и концепций: обычные TS-типы, функции, хуки; быстрее онбординг;
- явные селекторы → предсказуемые ре-рендеры, проще профилировать;
- нет runtime-оверхеда моделей и снимков;
- проще тесты (`getState` / `setState`) и постепенный переезд — стор за стором.

Что теряешь: runtime-проверку (замена — Zod на границе API), снимки и патчи (замена — `persist`), references (нормализуешь сам). В твоём резюме рядом стоят «MobX-State-Tree → Zustand» и «валидация на Zod» — на интервью связывай их, только если так и было.

```ts
// src/theory/theory.test.ts
import { isStateTreeNode } from 'mobx-state-tree';
import { persistWatchlist, Watchlist } from './watchlist.mst';
import { added, moved, removed, selectSymbols, store } from './watchlist.rtk';

test('rtk: same rules via actions and reducers', () => {
  ['aapl', 'AAPL', 'tsla', 'nvda'].forEach((s) => store.dispatch(added(s)));
  store.dispatch(moved({ from: 2, to: 0 }));
  store.dispatch(removed('aapl'));
  expect(selectSymbols(store.getState())).toEqual(['NVDA', 'TSLA']);
});

test('mst: actions + snapshots', () => {
  const saved: string[] = [];
  const { wl, stop, snapshot } = persistWatchlist((json) => saved.push(json));
  wl.add('aapl');
  wl.add('AAPL');
  expect(snapshot()).toEqual({ symbols: ['AAPL'] });
  expect(saved).toEqual(['{"symbols":["AAPL"]}']);
  expect(isStateTreeNode(wl)).toBe(true);
  expect(() => (wl.symbols as unknown as string[]).push('X')).toThrow(); // менять можно только в actions
  expect(() => Watchlist.create({ symbols: [1] } as never)).toThrow(); // runtime-проверка типов
  stop();
});
```

**Практика** (50 мин; ещё 40 — на «Что повторить»)

1. **Таблица состояния** (15 мин). 15 сущностей mini-app — тикет ордера, котировки, лидерборд турнира, прогресс челленджа, токен, тема, фильтр истории… — разложи по таблице из пункта 1; для клиентских допиши «Zustand или MobX и почему». Делал похожее в [тренинге 2](../02-trading-app-architecture/02-trading-app-architecture.md) — дополни ту таблицу. *Критерий:* серверные данные — только в Query; токен — только в SecureStore; ни одного производного поля в сторе.
2. **Две модели вслух** (15 мин). По 60 секунд: «как Zustand решает, перерисовать ли компонент» и «как это решает MobX». Запиши голос, расшифровку отдай AI: «Найди неточности, не переписывай». *Критерий:* назвал `useSyncExternalStore` и `Object.is`; отслеживание чтений, `action` и `computed`.
3. **RTK и MST руками** (20 мин). Запусти тест выше. Добавь в MST-модель `remove(symbol)`; затем попробуй изменить `wl.symbols` вне action и прочитай ошибку. *Критерий:* тест зелёный, ошибку MST объясняешь одной фразой.

**Самопроверка**

- Почему серверные данные не кладут в Zustand? Где исключение?
- Что будет, если Zustand-updater вернёт `state` без изменений? А `{}`?
- Почему MobX-компонент не перерисуется, если observable прочитали вне `observer`?
- Чем `computed` отличается от мемоизированного селектора?
- Когда ты выбрал бы Redux Toolkit вместо Zustand?
- Что даёт MST поверх MobX и чем за это платишь?

**Готово, когда…** за 2 минуты объясняешь обе модели и таблицу «что где хранить», а 3 теста блока зелёные.

Дальше: [часть 2 — задачи 1–2: watchlist, портфель и P&L](05-state-management-zustand-mobx-part2.md).
