# Управление состоянием: одна задача — два решения (Zustand и MobX)

Обновлено: 2026-10-21 · Тренинг 5 из 6 · ≈ 16 часов · Вакансия: [карточка](../../card.ru.md)

[1](05-state-management-zustand-mobx.md) · [2](05-state-management-zustand-mobx-part2.md) · [3](05-state-management-zustand-mobx-part3.md) · [4](05-state-management-zustand-mobx-part4.md) · [5](05-state-management-zustand-mobx-part5.md) · [6](05-state-management-zustand-mobx-part6.md) · Часть 7 из 7

## Задача 10. Отладка: devtools в React Native (0,5 ч)

**Цель.** Знать, чем смотреть состояние и ре-рендеры в React Native и Expo в 2026 году, и не ставить мёртвые или опасные пакеты.

**Что повторить** (проверено 2026-10-21)

| Что смотреть | Инструмент | Заметки |
|---|---|---|
| Ре-рендеры, дерево, props | React Native DevTools: Components, Profiler, «Highlight updates» | встроены; `j` в терминале Metro или Dev Menu → Open DevTools |
| Zustand | `devtools` из `zustand/middleware` | работает через Redux DevTools Extension (`window.__REDUX_DEVTOOLS_EXTENSION__`) — в RN её нет. Для Expo — сторонний `@csark0812/zustand-expo-devtools` 2.1.8 (плагин Expo DevTools, Shift+M; есть в списке third-party в документации Zustand); Reactotron + `reactotron-plugin-zustand` 2.0.9; или свой логгер на `subscribe` (ниже) |
| Redux Toolkit | `@rozenite/redux-devtools-plugin` 2.5.0 — панель Redux DevTools внутри RN DevTools (Rozenite от Callstack, `withRozenite` в Metro); Reactotron + `reactotron-redux` | Rozenite включается переменной `WITH_ROZENITE=true` |
| MobX 7 | `spy`, `getDependencyTree`, `getObserverTree`, `toJS`; `mobx-log` 2.4.0 (peer: MobX 6.3.4+ или 7) | `trace` удалён в MobX 7; в production-сборке `spy` — no-op; React Native в README `mobx-log` не упомянут — проверь сам |
| TanStack Query | `@rozenite/tanstack-query-plugin` 2.5.0 или `@dev-plugins/react-query` 0.4.0 (Expo) | |
| MMKV | `@rozenite/mmkv-plugin` 2.1.0 | |

Осторожно: `reactotron-mobx` на npm — security holding package (`0.0.1-security`): опубликованную 2025-04-21 версию 1.0.0 npm снял. Перед установкой любого пакета «по совету AI» — `npm view <пакет>`: дата релиза, мейнтейнеры, `peerDependencies`, репозиторий.

**Условие.** Два dev-логгера: для Zustand — «какие ключи изменились», для MobX — «какой action выполнен». И проверка «от чего зависит reaction» без `trace`.

**Попробуй сам** (10 мин, без AI)

*Критерии:* логгеры ничего не делают в production (`__DEV__`); тест проверяет вывод; `getDependencyTree` показывает ключ map.

> ⛔ **Не подсматривай, пока не попробуешь.** Ниже — решения.

```ts
// src/debug/logStore.ts — минимальный логгер Zustand: какие ключи изменились (только dev)
import type { StoreApi } from 'zustand';

export function logStore<T extends object>(name: string, store: Pick<StoreApi<T>, 'subscribe'>, log = console.log) {
  if (!__DEV__) return () => {};
  return store.subscribe((next, prev) => {
    const changed = (Object.keys(next) as (keyof T & string)[]).filter((k) => !Object.is(next[k], prev[k]));
    log(`[${name}] ${changed.join(', ')}`);
  });
}
```

```ts
// src/debug/logActions.ts — логгер MobX через spy (в production-сборке spy — no-op)
import { spy } from 'mobx';

export function logActions(log = console.log) {
  if (!__DEV__) return () => {};
  return spy((event) => {
    if (event.type === 'action') log(`[mobx] ${event.name}`);
  });
}
```

```ts
// src/debug/debug.test.ts
import { autorun, getDependencyTree } from 'mobx';
import { QuotesStore } from '../realtime/quotes.mobx';
import { useQuotes } from '../realtime/quotes.zustand';
import { logActions } from './logActions';
import { logStore } from './logStore';

const q = { symbol: 'AAPL', price: '150.00', ts: 1 };

test('zustand logger prints changed keys', () => {
  const log = jest.fn();
  const stop = logStore('quotes', useQuotes, log);
  useQuotes.getState().applyBatch(new Map([['AAPL', q]]));
  expect(log).toHaveBeenCalledWith('[quotes] bySymbol');
  stop();
});

test('mobx: spy logs actions; getDependencyTree replaces trace', () => {
  const log = jest.fn();
  const store = new QuotesStore();
  const stop = logActions(log);
  store.applyBatch(new Map([['AAPL', q]]));
  expect(log).toHaveBeenCalledWith(expect.stringContaining('applyBatch'));
  const dispose = autorun(() => store.price('AAPL'));
  expect(JSON.stringify(getDependencyTree(dispose))).toContain('ObservableMap');
  dispose();
  stop();
});
```

`getDependencyTree` для `autorun(() => store.price('AAPL'))` возвращает примерно `{ name: 'Autorun@3', dependencies: [{ name: 'ObservableMap@1.AAPL?' }, { name: 'ObservableMap@1.AAPL' }] }` (номера могут отличаться): подписка на «есть ли ключ» и на значение — ровно один символ.

**Сравнение.** Состояние Zustand — обычные объекты: их легко логировать и сравнивать. В MobX для читаемого лога нужен `toJS`, а методы-«читатели» под `autoAction` попадают в `spy` как action на каждом рендере — помечай их `false`, как `price` в задаче 4.

**Самопроверка**

- Почему `devtools` из `zustand/middleware` молчит в React Native?
- Чем заменить `trace` в MobX 7?
- Как проверить пакет, который предложил AI?

**Готово, когда…** 2 теста зелёные, и ты называешь инструмент для каждой строки таблицы.

## Блок 12. Вопросы интервью и мок-интервью (1,5 ч)

**Цель.** Отвечать коротко и конкретно: API, пример, trade-off. Ответ — 30–60 секунд, дальше интервьюер сам спросит глубже.

**Что повторить** — сравнения из задач 1–10 и таблицу «Что изменилось» из [части 1](05-state-management-zustand-mobx.md).

### Вопросы и короткие ответы

1. **Почему Zustand, а не Redux Toolkit или MobX?** С RTK у Zustand та же иммутабельная модель и селекторы, но меньше церемоний: нет Provider, actions и reducers — просто функции в сторе; маленький API, хуки, middleware по необходимости. С MobX разница в модели: MobX сильнее там, где много связанного изменяемого состояния, но в нём больше «магии» и правил. Серверные данные у нас в TanStack Query, клиентского состояния немного — явные селекторы Zustand проще читать, тестировать и профилировать. RTK взял бы для большой команды с жёсткими соглашениями, при существующей Redux-кодовой базе или если нужен RTK Query.
2. **Когда ты выбрал бы MobX?** Когда много связанного клиентского состояния и производных: сложные формы, редакторы, графы зависимостей, где ручные селекторы превращаются в рутину. MobX сам отслеживает зависимости и обновляет точечно. Цена — больше «магии»: важно понимать tracking, actions и reactions, следить за `observer` и за совместимостью с React Compiler.
3. **Где ты держишь серверные данные?** В TanStack Query: кэш по ключу, дедупликация, повторы, инвалидация, отмена через `signal`. В стор их не копирую — иначе два источника правды. Исключение — высокочастотные потоки вроде котировок: они идут в стор вне React пачками.
4. **Как избегаешь лишних ре-рендеров в Zustand?** Атомарные селекторы, которые возвращают примитивы; `useShallow`, если нужен объект; мемоизированные селекторы для тяжёлых расчётов; высокочастотные данные — пачками, строка подписана на свой ключ. Проверяю Profiler'ом в RN DevTools. И помню, что в v5 селектор с новым объектом — бесконечный цикл.
5. **Как MobX решает, что перерисовать, и где типичные ошибки?** `observer` отслеживает observable, прочитанные во время рендера. Ошибки: забытый `observer`; значение прочитано в родителе, а не в ребёнке; observable передан не-observer компоненту — FlatList, сторонний компонент, `renderItem` (лечится `slice()` или `toJS` и `observer` на строке); изменения после `await` без `runInAction`.
6. **Что такое reactions и какие у них ловушки?** `autorun`, `reaction`, `when` — побочные эффекты в ответ на изменения: запись на диск, аналитика, тосты. Ловушки: не вызвать disposer — утечка; менять observable внутри reaction — для этого есть `computed` и actions; рассчитывать на порядок реакций; читать в data-функции только ссылку на массив (`store.list` вместо `store.list.slice()`); асинхронная часть эффекта не отслеживается.
7. **Как структурируешь большой Zustand-стор?** Несколько сторов по доменам, а внутри большого — slices pattern (пример — в задаче 8): каждый slice — `StateCreator`, middleware только на итоговом сторе (документация предупреждает о проблемах с middleware внутри slices). Селекторы рядом со стором; для сторов с зависимостями — фабрика на `createStore` и DI. `devtools` — самый внешний: `devtools(immer(…))`, а не наоборот.
8. **Как ты обработаешь 500 обновлений котировок в секунду?** Сокет вне React → буфер с conflation (последний тик по символу) → flush раз в 100–250 мс одним `set` или одним action → строка подписана на свою цену. Вспышки цены — Reanimated на UI-потоке. Плюс устаревание цены и восстановление после переподключения ([тренинг 6](../06-websocket-demo-binance/06-websocket-demo-binance.md)).
9. **Как сделать persistence в React Native?** Zustand `persist` + MMKV: синхронная гидратация, `partialize`, `version` + `migrate`, проверка данных схемой. Токены — только в SecureStore. В MobX — `reaction` на снимок + MMKV, тот же конверт `{ state, version }`.
10. **Как сделать оптимистичное обновление с откатом?** Сразу меняю стор, `clientId` — ключ идемпотентности; при ошибке — обратная операция только для этого ордера, не снимок всего стора. Если данные в Query — `useMutation` с `onMutate`, `onError`, `onSettled`.
11. **Чем `computed` отличается от селектора?** `computed` кэширует результат и сам знает зависимости: пересчёт только при изменении прочитанных observable, пока за ним наблюдают. Селектор Zustand выполняется на каждое изменение стора для каждого подписчика; кэш делаешь сам — мемоизацией по ссылкам входов.
12. **Как тестируешь сторы?** Без React: `getState` / `setState` и сброс синглтона, фабрики с DI, fake timers, управляемые промисы; в MobX — новый экземпляр и `when`. Экраны — RNTL 14 с `await` и запросами по роли и тексту. В тренинге каждая задача — один набор тестов на обе реализации.
13. **Чем MobX-State-Tree отличается от MobX?** MST — MobX плюс дерево моделей с runtime-типами, снимками, патчами, references и защитой «менять только в actions». В документации MST: MobX — «двигатель», MST — «люксовый автомобиль». Цена MST — runtime-оверхед, больше API, тяжёлые TS-типы.
14. **Как ты дебажишь состояние в React Native?** RN DevTools: Components и Profiler с подсветкой обновлений. Для Zustand `devtools` в RN не работает без моста — беру Expo-плагин или Reactotron либо логгер на `subscribe`. Для MobX 7 — `spy`, `getDependencyTree`, `mobx-log`. Для RTK и Query — плагины Rozenite.
15. **Как прошла миграция с MobX-State-Tree на Zustand?** Шаблон ниже — заполни своими фактами.

### Шаблон ответа: миграция MST → Zustand

Факт из резюме один: в Hotline.Finance ты заменил MobX-State-Tree на Zustand. Всё остальное заполни сам и только правдой: без придуманных цифр.

> В Hotline.Finance я перевёл приложение с MobX-State-Tree на Zustand.
> **Почему:** [1–2 реальные причины: что мешало в MST — объём кода моделей, TS-типы, производительность, онбординг, что-то ещё].
> **Как:** [постепенно или разом; как жили старый и новый стор одновременно; что сделали с сохранёнными данными; как проверяли — тесты Jest, Maestro].
> **Валидация:** [только если так было: runtime-типы MST заменили Zod-схемами на границе API].
> **Результат:** [только то, что можешь подтвердить: меньше кода, проще тесты, быстрее онбординг; метрики — если они были].
> **Что сделал бы иначе:** [1 честный пункт].

Ожидай уточнения: «что было сложнее всего?», «как избежали регрессий?», «чего не хватает в Zustand после MST?» — подготовь по 2–3 предложения на каждый.

### Промпт для мок-интервью

Вставь в Claude или ChatGPT, лучше в голосовом режиме — отвечай вслух.

```text
Ты — Senior Frontend-разработчик продуктовой fintech-компании: трейдинговая платформа, основное
приложение на React Native, новые геймифицированные mini-apps (турниры, челленджи, лояльность,
ачивки). В вакансии: «client state management: Zustand, Redux Toolkit, React Query или аналоги».
Ты проводишь техническое интервью с кандидатом на позицию React Native-разработчика.
Эта часть интервью — управление состоянием.

Правила:
1. Задавай по одному вопросу и жди моего ответа. Не подсказывай и не отвечай за меня.
2. Всего 8–10 вопросов, от простого к сложному: server state и client state, Zustand (селекторы,
   useShallow, slices, middleware persist, devtools, immer, subscribeWithSelector), MobX 7
   (observable, computed, action, flow, reaction, observer), Redux Toolkit, TanStack Query,
   ре-рендеры, котировки в реальном времени, persistence в React Native (MMKV, миграции),
   оптимистичные обновления, тесты, отладка.
3. На каждый мой ответ — одно уточнение: «почему?», «а если 500 обновлений в секунду?»,
   «покажи код», «а как это сделать на MobX?».
4. Одна задача live coding на 15 минут: стор watchlist или P&L портфеля на Zustand, затем спроси,
   как это выглядело бы на MobX. Оцени код: типы, ре-рендеры, деньги без float.
5. Один фрагмент кода на 20–30 строк с 4 скрытыми ошибками: селектор возвращает новый объект,
   мутация state в Zustand, reaction без disposer, observable-массив в FlatList без observer.
   Попроси найти ошибки вслух. Не называй их, пока я не закончу.
6. Вопрос про опыт: «Ты переводил приложение с MobX-State-Tree на Zustand. Расскажи».
   Уточни: зачем, как, что пошло не так.
7. Если я отвечаю общими словами — скажи об этом и попроси конкретику: API, пример, цифру.
8. В конце: оценка 1–5 по критериям (точность API, понимание ре-рендеров, архитектура и
   trade-offs, тестирование, ясность речи), 3 сильные стороны, 3 зоны роста, 5 тем для
   повторения. Отдельно перечисли устаревшие API, если я их назвал.
Начни с короткого представления и первого вопроса.
```

Вариант на английском — добавь в конец промпта: «Проведи интервью на английском. Говори просто, на уровне B1–B2. В конце перечисли мои ошибки в английском и дай лучшие формулировки».

**Практика** (1,5 ч)

1. **Ответы вслух** (30 мин). 15 вопросов выше: каждый — вслух, 30–60 секунд, с таймером. *Критерий:* в каждом ответе есть API или пример из задач 1–10.
2. **Шаблон MST → Zustand** (15 мин). Заполни своими фактами и прочитай вслух. *Критерий:* ни одной придуманной цифры; ответ укладывается в 90 секунд.
3. **Мок-интервью** (35 мин). *Критерий:* средняя оценка ≥ 4; в коде с ошибками найдено ≥ 3 из 4.
4. **Разбор** (10 мин). 3 слабых места — в журнал, с датой повтора через 1 и через 3 дня.

**Самопроверка**

- Какой вопрос застал тебя врасплох? Что ответишь в следующий раз?
- Где ты назвал устаревший API (MobX 6, Zustand 4, MMKV 3)?

**Готово, когда…** мок пройден на ≥ 4, шаблон миграции заполнен правдой, слабые места записаны с планом повторения.

## Связанные материалы

- [Тренинг 1: JavaScript и TypeScript](../01-javascript-typescript/01-javascript-typescript.md) — замыкания, промисы, `useSyncExternalStore` и Context.
- [Тренинг 2: архитектура трейдингового приложения](../02-trading-app-architecture/02-trading-app-architecture.md) — деньги, ордера, real-time.
- [Тренинг 3: AI-инструменты](../03-ai-tools-claude-code-codex/03-ai-tools-claude-code-codex.md) — как учиться с AI и ревьюить AI-код.
- [Тренинг 4: анимации, Reanimated, Skia](../04-animations-reanimated-skia/04-animations-reanimated-skia.md) — вспышки цены на UI-потоке.
- [Тренинг 6: демо на WebSocket](../06-websocket-demo-binance/06-websocket-demo-binance.md) — живые котировки для задачи 4.
- [Слой API](../../../../../interview-prep/technical/api-layer.ru.md) и [WebSocket](../../../../../interview-prep/technical/websockets.ru.md) — короткая подготовка к интервью.

## Источники

Версии пакетов и даты релизов — `npm view <пакет> version time` (https://registry.npmjs.org) — проверено 2026-10-21. Весь код проверен в песочнице из блока 0: `tsc` 6.0.3 и 7.0.2, Jest 30.5.2 — 46 тестов.

- Zustand: updating state — https://zustand.docs.pmnd.rs/learn/guides/updating-state — проверено 2026-10-21
- Zustand: prevent rerenders with useShallow — https://zustand.docs.pmnd.rs/learn/guides/prevent-rerenders-with-use-shallow — проверено 2026-10-21
- Zustand: useShallow — https://zustand.docs.pmnd.rs/reference/hooks/use-shallow — проверено 2026-10-21
- Zustand: slices pattern — https://zustand.docs.pmnd.rs/learn/guides/slices-pattern — проверено 2026-10-21
- Zustand: advanced TypeScript (slices, порядок middleware) — https://zustand.docs.pmnd.rs/learn/guides/advanced-typescript — проверено 2026-10-21
- Zustand: createStore — https://zustand.docs.pmnd.rs/reference/apis/create-store — проверено 2026-10-21
- Zustand: persist — https://zustand.docs.pmnd.rs/reference/middlewares/persist — проверено 2026-10-21
- Zustand: persisting store data — https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data — проверено 2026-10-21
- Zustand: immer middleware — https://zustand.docs.pmnd.rs/reference/middlewares/immer — проверено 2026-10-21
- Zustand: subscribeWithSelector — https://zustand.docs.pmnd.rs/reference/middlewares/subscribe-with-selector — проверено 2026-10-21
- Zustand: devtools — https://zustand.docs.pmnd.rs/reference/middlewares/devtools — проверено 2026-10-21
- Zustand: testing — https://zustand.docs.pmnd.rs/learn/guides/testing — проверено 2026-10-21
- Zustand: migrating to v5 — https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5 — проверено 2026-10-21
- Zustand: third-party libraries — https://zustand.docs.pmnd.rs/reference/integrations/third-party-libraries — проверено 2026-10-21
- Zustand: comparison — https://zustand.docs.pmnd.rs/learn/getting-started/comparison — проверено 2026-10-21
- MobX: migrating to MobX 7 — https://mobx.js.org/migrating-from-6-to-7.html — проверено 2026-10-21
- MobX: observable state (makeAutoObservable, ограничения) — https://mobx.js.org/observable-state.html — проверено 2026-10-21
- MobX: actions, runInAction, flow — https://mobx.js.org/actions.html — проверено 2026-10-21
- MobX: computeds — https://mobx.js.org/computeds.html — проверено 2026-10-21
- MobX: computeds with arguments — https://mobx.js.org/computeds-with-args.html — проверено 2026-10-21
- MobX: reactions — https://mobx.js.org/reactions.html — проверено 2026-10-21
- MobX: configuration — https://mobx.js.org/configuration.html — проверено 2026-10-21
- MobX: React integration — https://mobx.js.org/react-integration.html — проверено 2026-10-21
- MobX: React optimizations — https://mobx.js.org/react-optimizations.html — проверено 2026-10-21
- MobX: analyzing reactivity — https://mobx.js.org/analyzing-reactivity.html — проверено 2026-10-21
- MobX: installation (class fields) — https://mobx.js.org/installation.html — проверено 2026-10-21
- MobX-State-Tree: welcome — https://mobx-state-tree.js.org/intro/welcome — проверено 2026-10-21
- MobX-State-Tree v8.0.0 (совместимость с MobX 7) — https://github.com/mobxjs/mobx-state-tree/releases/tag/v8.0.0 — проверено 2026-10-21
- TanStack Query: does this replace client state? — https://tanstack.com/query/latest/docs/framework/react/guides/does-this-replace-client-state — проверено 2026-10-21
- TanStack Query: query cancellation — https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation — проверено 2026-10-21
- TanStack Query: optimistic updates — https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates — проверено 2026-10-21
- TanStack Query: render optimizations — https://tanstack.com/query/latest/docs/framework/react/guides/render-optimizations — проверено 2026-10-21
- Redux Toolkit: createSlice — https://redux-toolkit.js.org/api/createSlice — проверено 2026-10-21
- Redux: deriving data with selectors — https://redux.js.org/usage/deriving-data-selectors — проверено 2026-10-21
- Redux style guide — https://redux.js.org/style-guide/ — проверено 2026-10-21
- React: useSyncExternalStore — https://react.dev/reference/react/useSyncExternalStore — проверено 2026-10-21
- React: Profiler — https://react.dev/reference/react/Profiler — проверено 2026-10-21
- React: incompatible libraries (MobX и React Compiler) — https://react.dev/reference/eslint-plugin-react-hooks/lints/incompatible-library — проверено 2026-10-21
- Expo: React Compiler — https://docs.expo.dev/guides/react-compiler/ — проверено 2026-10-21
- React Native DevTools — https://reactnative.dev/docs/react-native-devtools — проверено 2026-10-21
- React Native: debugging basics — https://reactnative.dev/docs/debugging — проверено 2026-10-21
- React Native Testing Library 14: render — https://oss.callstack.com/react-native-testing-library/docs/api/render — проверено 2026-10-21
- react-native-mmkv (репозиторий margelo) — https://github.com/margelo/react-native-mmkv — проверено 2026-10-21
- react-native-mmkv: V4 upgrade guide — https://github.com/margelo/react-native-mmkv/blob/main/docs/V4_UPGRADE_GUIDE.md — проверено 2026-10-21
- react-native-mmkv: Zustand persist wrapper — https://github.com/margelo/react-native-mmkv/blob/main/docs/WRAPPER_ZUSTAND_PERSIST_MIDDLEWARE.md — проверено 2026-10-21
- react-native-mmkv: mobx-persist-store wrapper — https://github.com/margelo/react-native-mmkv/blob/main/docs/WRAPPER_MOBX.md — проверено 2026-10-21
- react-native-mmkv: мок Nitro для Jest — https://github.com/margelo/react-native-mmkv/tree/main/packages/react-native-mmkv/__mocks__ — проверено 2026-10-21
- mobx-persist-store — https://github.com/quarrant/mobx-persist-store — проверено 2026-10-21
- mobx-log — https://github.com/kubk/mobx-log — проверено 2026-10-21
- Rozenite: getting started — https://www.rozenite.dev/docs/getting-started — проверено 2026-10-21
- Rozenite: Redux DevTools plugin — https://www.rozenite.dev/docs/official-plugins/redux-devtools — проверено 2026-10-21
- zustand-expo-devtools — https://github.com/csark0812/zustand-expo-devtools — проверено 2026-10-21
- npm: reactotron-mobx (security holding package) — https://registry.npmjs.org/reactotron-mobx — проверено 2026-10-21
- decimal.js — https://mikemcl.github.io/decimal.js/ — проверено 2026-10-21
