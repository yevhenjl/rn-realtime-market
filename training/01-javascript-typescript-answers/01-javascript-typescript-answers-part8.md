# Тренинг 1: JavaScript и TypeScript — ответы и решения

Обновлено: 2026-10-21 · Тренинг 1 из 6 · ≈ 16 часов · Вакансия: [карточка](../../card.ru.md)

Ответы, часть 8 из 9 · [1](01-javascript-typescript-answers.md) · [2](01-javascript-typescript-answers-part2.md) · [3](01-javascript-typescript-answers-part3.md) · [4](01-javascript-typescript-answers-part4.md) · [5](01-javascript-typescript-answers-part5.md) · [6](01-javascript-typescript-answers-part6.md) · [7](01-javascript-typescript-answers-part7.md) · [9](01-javascript-typescript-answers-part9.md) · вопросы: [часть 6, блок 8](../01-javascript-typescript/01-javascript-typescript-part6.md)

Как пользоваться — в [части 1](01-javascript-typescript-answers.md#как-пользоваться-ответами). Хуки T28–T30 проверены дважды: в Jest + `@testing-library/react` 16.3 (синхронный API, как в условии) и в Jest + `@testing-library/react-native` 14.1 с React Native 0.88 (асинхронный API, см. ⚠️ в T28). T31 — переписанный компонент проходит `tsc` на типах RN 0.88 и smoke-тест в Jest.

## Блок 8. React и React Native

### Вопросы Q67–Q80

**Q67. Что запускает рендер.** Запускают: обновление своего state новым значением (сравнение `Object.is`), рендер родителя (дети рендерятся по умолчанию, `memo` или Compiler могут пропустить), смена значения контекста, новый snapshot внешнего стора (`useSyncExternalStore`), смена `key` (перемонтирование). Не запускают: изменение `ref.current`, мутация объекта или массива в state (ссылка та же), переменные модуля. Render — React вызывает компоненты и получает новое дерево элементов; это должно быть чисто, может выполняться несколько раз, прерываться и отбрасываться. Commit — React применяет минимальные изменения к host-дереву (DOM или нативные view через Fabric), синхронно запускает layout-эффекты, потом passive-эффекты. Reconciliation — сравнение нового дерева с предыдущим по `type` и `key`: что оставить, обновить, создать, удалить. Рендер ≠ обновление нативных view: если результат тот же, мутаций нет. В Fabric commit строит новое неизменяемое shadow tree, сравнивает его со старым и отправляет на UI-поток только изменения. Лишний рендер стоит времени JS-потока, но не обязательно нативной работы.

**Q68. Automatic batching.** С React 18 (и в RN New Architecture) все `setState` в одном тике собираются в один рендер — в обработчиках, промисах, таймерах, нативных колбэках. Два `setCount(count + 1)` подряд читают `count` из замыкания этого рендера (допустим, `0`) и оба ставят «сделать 1» → итог `1`. Два `setCount((c) => c + 1)` ставят в очередь две функции; React применяет их по порядку к актуальному значению → `2`. Выйти из батчинга можно через `flushSync`, но это редко нужно.

**Q69. `key`.** Ключ связывает элемент списка между рендерами: React сохраняет состояние и перемещает компонент, а не создаёт заново. С `key={index}` вставка в начало, удаление или сортировка сдвигают индексы, и React сопоставляет по позиции. Состояние строки (раскрыта, свайп открыт, анимация) достаётся другому элементу, текст в uncontrolled `TextInput` остаётся на месте — то есть «переезжает» к чужой строке. Плюс лишние обновления: у каждой строки меняются props. В списке, отсортированном по цене, каждый тик меняет порядок — с индексами каждая строка перерисовывается с чужим символом. Сброс состояния через `key`: `<OrderTicket key={symbol} symbol={symbol} />` — новый символ = новый экземпляр со свежим state, эффект для сброса не нужен.

**Q70. Правила хуков.** Вызывать хуки только на верхнем уровне компонента или кастомного хука: не в условиях, циклах, вложенных функциях и не после раннего `return`. И только из React-функций. Почему: React хранит состояние хуков у fiber в виде списка по порядку вызова. На каждом рендере N-й вызов читает N-ю ячейку; условный вызов сдвигает порядок, и состояние одного хука достаётся другому (ошибка «Rendered fewer hooks than expected»). `use` (React 19) — не хук в этом смысле: он не занимает ячейку списка. Он читает контекст (ближайший провайдер) или промис (через кэш промиса и Suspense). Поэтому его можно вызывать в условиях и циклах — но только внутри компонента или хука и не внутри `try / catch` (ошибку ловит error boundary).

**Q71. `useEffect`, `useLayoutEffect`, `useInsertionEffect`.** `useEffect` — passive: после commit и после отрисовки, асинхронно; для подписок, загрузки данных, синхронизации с внешними системами. `useLayoutEffect` — синхронно после мутаций, до отрисовки: измерить layout и сразу поправить (позиция tooltip, прокрутка) без мерцания. Блокирует отрисовку — держи его дешёвым. В RN New Architecture он видит актуальный layout синхронно (RFC 0744). `useInsertionEffect` — раньше layout-эффектов, для CSS-in-JS библиотек: вставить стили; ни ref-ов, ни обновлений state. Порядок при обновлении: для изменившегося эффекта — cleanup старого (со старыми значениями), потом setup нового. Сначала все layout-cleanup, затем все layout-setup (дети раньше родителей); passive-эффекты позже в том же порядке. При размонтировании — cleanup. StrictMode в dev: mount → unmount (cleanup) → mount снова. Это вскрывает отсутствие cleanup и неидемпотентные эффекты (двойная подписка, двойной POST при монтировании); ещё он дважды вызывает рендер, инициализаторы и reducer, чтобы поймать нечистый код. Ломается при двойном монтировании — чини эффект, а не выключай StrictMode.

**Q72. «You Might Not Need an Effect».** Лишние эффекты и замена:

1. Производные данные (`useEffect(() => setVisible(filter(quotes)), [quotes, filter])`) → вычислять в рендере, `useMemo` если дорого: нет лишнего рендера и кадра с устаревшими данными.
2. Сброс state при смене пропса → `key={symbol}` или корректировка state во время рендера (хранить прошлый проп в state).
3. Логика события (POST, аналитика по нажатию) → в обработчике события.
4. Цепочки эффектов, где один `setState` запускает другой эффект → вычислить всё следующее состояние в одном обработчике или reducer.
5. Уведомление родителя (`useEffect(() => onChange(value), [value])`) → вызвать `onChange` в том же обработчике или поднять state.

Загрузку данных в эффекте делать можно, но с cleanup и защитой от гонок; лучше — библиотека данных (TanStack Query). Эффект нужен для синхронизации с внешней системой: подписки, таймеры, native-модули, императивные API.

**Q73. Stale closure.** Три примера:

1. Интервал в `useEffect(…, [])` с `setCount(count + 1)` — `count` навсегда из первого рендера, счётчик застывает на `1` (T30, проверено).
2. Обработчик подписки, созданный один раз, видит старые `quotes` и `filter` (T31).
3. Колбэк после `await`: `async function onSubmit() { await placeOrder(form); setHistory([...history, order]); }` — `history` и `symbol` — из рендера, где создан обработчик; за время `await` они могли измениться.

Решения: функциональный апдейт (`setCount((c) => c + 1)`, `setHistory((h) => [...h, order])`); правильные зависимости и переподписка с cleanup; ref с последним значением (`useLatest`, обновляется в `useLayoutEffect`, T30) для долгоживущих колбэков; `useEffectEvent` — стабилен с React 19.2, в RN — с 0.83. Функция из `useEffectEvent` вызывается из эффекта, всегда видит свежие props / state и не входит в зависимости. Ограничения по документации: не вызывать во время рендера и не передавать в другие компоненты или хуки.

**Q74. Мемоизация.** `React.memo(Component)` пропускает рендер, если props поверхностно равны (`Object.is` по каждому). Полезен для дорогих компонентов, которые родитель часто рендерит с теми же props: строки списка, график. `useMemo` — кэш дорогого вычисления или стабильная ссылка на объект для memo-детей и зависимостей эффекта. `useCallback` — стабильная ссылка на функцию по тем же причинам. Когда мешают: дешёвый компонент (сравнение и память дороже рендера); props всё равно новые (inline-объекты и стрелки ломают `memo`); неверные зависимости → устаревшие значения; шум в коде. Ссылочное равенство: `{} !== {}`, `[] !== []`, новая стрелка на каждом рендере. React Compiler 1.0 (2025-10-07) — Babel-плагин времени сборки. Он сам мемоизирует компоненты и хуки (детально, даже условно), опираясь на Rules of React. Код с нарушениями правил компилятор пропускает и показывает диагностику через `eslint-plugin-react-hooks`. Ручная мемоизация остаётся как escape hatch: документация приводит пример — мемоизированное значение в зависимостях эффекта, чтобы эффект не срабатывал зря. Также она нужна в коде, который компилятор не обрабатывает. В существующем коде её не удаляют без тестов: удаление может поменять результат компиляции.

**Q75. Context.** Когда значение провайдера меняется (`Object.is`), перерисовываются все компоненты, читающие этот контекст; `memo` это не останавливает. `value={{ user, setUser }}` создаёт новый объект на каждом рендере провайдера — все потребители перерисовываются, даже если `user` не менялся. Нужен `useMemo` (или Compiler). Разделяй контексты: по частоте обновлений (статический конфиг и живые данные), state и dispatch (`dispatch` стабилен). Для часто меняющегося или большого состояния (котировки, стакан) — внешний стор с селекторами (Zustand, Redux): компонент подписан на свой срез и перерисовывается, только когда меняется он. Под капотом это `useSyncExternalStore`. React 19: `<ThemeContext value={theme}>` — сам контекст работает как провайдер (`.Provider` остался для совместимости); `use(ThemeContext)` читает контекст и может стоять в условии.

**Q76. Виды состояния.** Локальное (`useState` / `useReducer`: текст ввода, переключатели, открыт ли модал). Серверное — кэш удалённых данных: TanStack Query (загрузка, кэш, дедупликация, повторы, инвалидация, фоновое обновление). Глобальное клиентское — Zustand: сессия, настройки, флаги, UI между экранами. Плюс состояние навигации и сохранённое (MMKV). Поток котировок 100 обновлений в секунду держим вне state экрана — во внешнем сторе, который обновляется пачками (T32: последний тик по символу, flush раз в 100–250 мс). Компоненты подписаны точечными селекторами (`useQuotes((s) => s.bySymbol[symbol])`) — перерисовываются только строки с изменившимся символом; строки мемоизированы; чисто визуальные вспышки цены — через Reanimated shared values на UI-потоке. `useSyncExternalStore(subscribe, getSnapshot)` — официальный способ подписать React на внешний изменяемый стор в concurrent rendering. Tearing — во время прерываемого рендера разные компоненты читают разные версии стора: часть экрана показывает старую цену, часть — новую. `useSyncExternalStore` гарантирует согласованный snapshot (если стор изменился во время рендера, рендер повторяется синхронно). Zustand и Redux используют его внутри.

**Q77. Concurrent features.** Concurrent rendering: React готовит рендер «в фоне», может поставить его на паузу и выбросить, если пришло срочное обновление (ввод, нажатие). Рендер становится прерываемым, и долгий рендер не блокирует срочное. `useTransition` — `startTransition(() => setTab('positions'))` помечает обновление несрочным; старый UI остаётся интерактивным, `isPending` — для индикатора. `useDeferredValue(value)` — «отстающая» копия значения: тяжёлое поддерево рендерится с ней, а ввод не тормозит. Suspense — декларативные границы загрузки (`lazy`, `use(promise)`); внутри transition React показывает старый контент вместо fallback. React 19 Actions — async-функции внутри transition сами ведут pending, ошибку и оптимистичное состояние. `useActionState(action, initialState)` → `[state, dispatchAction, isPending]` — формы, отправка ордера. `useOptimistic(state, updateFn)` — показать ожидаемый результат, пока действие идёт: добавление в watchlist сразу. Для ордера — только статус «отправляется», никогда «исполнен» до подтверждения. `use(promise)` — чтение промиса через Suspense. В мобильном трейдинговом UI: переключение вкладок, графиков и таймфреймов в `startTransition`; фильтр длинного списка инструментов через `useDeferredValue`; оптимистичный watchlist; форма ордера на `useActionState`. В RN concurrent features работают только в New Architecture, а она единственная с 0.82.

**Q78. Error boundaries.** Ловят ошибки при рендере, в методах жизненного цикла и эффектах поддерева, а также reject промиса из `use(promise)`. Не ловят: обработчики событий, асинхронный код (`setTimeout`, продолжение после `await`), ошибки самой границы. Асинхронную ошибку можно передать в границу через `showBoundary(error)` из `useErrorBoundary()` (react-error-boundary) или трюк `setState(() => { throw error; })`. Без своих классов: `<ErrorBoundary FallbackComponent={ErrorScreen} onError={(error, info) => report(error, info.componentStack)} resetKeys={[symbol]}>` из `react-error-boundary`. Внутри это всё равно класс: хука для `componentDidCatch` нет. Куда отправлять: Sentry (`@sentry/react-native` — JS-ошибки с source maps, нативные краши, breadcrumbs) или Crashlytics, вместе с component stack. Ещё нужны глобальный обработчик необработанных JS-ошибок (`ErrorUtils.setGlobalHandler` в RN) и обработка unhandled rejections. Границы ставь на экран и на виджет (график, стакан): упавший виджет не должен ронять приложение; в fallback — кнопка «Повторить».

**Q79. Длинные списки.** `FlatList` построен на `VirtualizedList`: рендерит только элементы в окне вокруг экрана, остальное заменяет отступами, догружает пачками. `keyExtractor` — стабильные ключи (id, символ). `getItemLayout` — при фиксированной высоте строк: без измерений, мгновенный `scrollToIndex`, точнее окно. `windowSize` — размер окна в высотах экрана (по умолчанию 21: 10 выше, 10 ниже и текущий): меньше — меньше памяти, но больше пустот при быстром скролле. `initialNumToRender` (по умолчанию 10) — первый кадр; ещё `maxToRenderPerBatch`, `removeClippedSubviews`. Строку мемоизируй (`React.memo`) и давай стабильные props, без inline-объектов и функций — иначе обновление родителя перерисует все видимые строки. FlashList v2 переиспользует (recycling) смонтированные ячейки под новые данные вместо unmount / mount: меньше работы JS и памяти, меньше пустых ячеек. По README пакета v2 — только New Architecture, чистый JS, не нужны оценки размера (`estimatedItemSize` убран), `getItemType` — отдельные пулы ячеек, `maintainVisibleContentPosition` включён по умолчанию. Ловушка recycling: локальный state строки должен сбрасываться при смене данных. Профилирование: React DevTools Profiler в React Native DevTools (коммиты, почему компонент перерисовался); панель Performance в React Native DevTools (с RN 0.83: JS-трасса и трек сети); Perf Monitor (FPS JS и UI); нативные профайлеры (Android Studio, Xcode Instruments). Мерить на release-сборке и слабом Android.

**Q80. New Architecture.** JSI — C++ API: JS держит ссылки на нативные объекты и вызывает их методы синхронно, без JSON-моста. Fabric — новый рендерер: shadow tree на C++, синхронный layout и измерения, поддержка concurrent React, атомарные коммиты. TurboModules — native-модули через JSI: ленивая загрузка, типизированные, синхронные или асинхронные вызовы. Codegen генерирует нативные интерфейсы из TS / Flow-спецификаций — типобезопасность между JS и native. Bridgeless — старого моста нет вообще. Версии: RN 0.82 — только New Architecture; RN 0.84 — Hermes V1 по умолчанию на iOS и Android (быстрее, меньше памяти); RN 0.87 — Strict TypeScript API по умолчанию, `InteractionManager` удалён; RN 0.88 (2026-10-19) — React 19.3 и события через W3C `EventTarget`: настоящие фазы capture и bubble, `stopPropagation` / `preventDefault` как в DOM. Императивный `addEventListener` на ref пока только в канале Canary. JS-поток занят 300 мс: JS-анимации и реакция на нажатия стоят. Нативный скролл, анимации на UI-потоке (Reanimated worklets, `useNativeDriver`) продолжают работать. Worklets в Reanimated — маленькие функции, которые выполняются в UI runtime синхронно с кадрами (анимации, жесты). Вызов обратно в JS из worklet — `scheduleOnRN(fn, ...args)` из `react-native-worklets` (вместо устаревшего `runOnJS`), например `scheduleOnRN(setSelected, index)` в конце жеста. Свой пример: миграция Hotline.Finance на New Architecture и библиотека для SDK Portmone в версиях под старую и новую архитектуру.

### Задачи T28–T31

**T28. `useDebounce` и ★ `useDebouncedCallback`.**

```ts
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value); // первое значение — сразу
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id); // новый value / delay или размонтирование — старый таймер отменён
  }, [value, delayMs]);
  return debounced;
}

export function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, delayMs: number): (...args: A) => void {
  const latestFn = useLatest(fn); // useLatest — из T30
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []); // отмена при размонтировании
  return useCallback(
    (...args: A) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => latestFn.current(...args), delayMs); // последняя версия fn
    },
    [delayMs, latestFn], // latestFn — стабильный объект ref → функция стабильна
  );
}
```

`useDebounce`: cleanup эффекта и есть «перезапуск таймера» — новый `value` отменяет старый таймер; после размонтирования таймеров не остаётся (`jest.getTimerCount()` → 0, проверено). `useDebouncedCallback`: функция из `useCallback` стабильна (`cb.result.current === first`), таймер в ref переживает рендеры, `latestFn.current` — последняя `fn` с префиксом `v2:`, а аргументы — последнего вызова (`'v2:ab'`). `useEffectEvent` здесь не подходит: его нельзя вызывать вне эффектов, а наш колбэк вызывают из обработчиков. Тест — как в условии: Jest, `renderHook`, `act`, `jest.useFakeTimers()`.

⚠️ уточнение: тесты хуков в условии написаны под синхронный API — так работают `@testing-library/react` и RNTL до 13-й версии. В актуальной `@testing-library/react-native` 14.1 `renderHook`, `rerender`, `unmount` и `act` асинхронные. Без `await` `renderHook(...)` вернёт промис, а не `{ result }` — проверено. Плюс в RN 0.88 Jest-пресет — отдельный пакет `@react-native/jest-preset`. Вариант для RNTL 14:

```ts
const { result, rerender } = await renderHook(({ v }: { v: string }) => useDebounce(v, 300), { initialProps: { v: 'a' } });
await rerender({ v: 'ab' });
await act(() => { jest.advanceTimersByTime(299); });
expect(result.current).toBe('a');
```

**T29. `usePrevious` — две версии.**

```ts
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current; // чтение ref.current в рендере — именно это ругает react-hooks/refs
}

export function usePreviousDistinct<T>(value: T): T | undefined {
  const [current, setCurrent] = useState(value);
  const [previous, setPrevious] = useState<T | undefined>(undefined);
  if (!Object.is(value, current)) { // без условия — бесконечный цикл рендеров
    setPrevious(current);
    setCurrent(value);
  }
  return previous;
}
```

Рендеры `1, 1, 2, 3` (проверено): A → `undefined, 1, 1, 2` — значение из прошлого коммита, даже если оно не менялось; B → `undefined, undefined, 1, 2` — только при реальной смене. Почему правило `react-hooks/refs` ругает A: рендер должен быть чистым, а `ref.current` — изменяемое значение вне контроля React. React Compiler считает рендер чистым и может закэшировать результат — чтение ref тогда даст устаревшее значение. В concurrent rendering рендер может выполниться несколько раз или быть отброшен без коммита: ref отражает последний **коммит**, а не предыдущий рендер. Почему условный `setState` в B допустим: React разрешает обновить state своего же компонента во время рендера. Он отбрасывает результат и сразу рендерит заново, до коммита и до детей; условие гарантирует, что второй проход ничего не меняет. Безусловный `setState` бесконечно перезапускает рендер — React остановит это ошибкой «Too many re-renders». Ловушка B: если `T` — функция, `useState` и `setState` примут её за инициализатор или updater; оборачивай в `() => value`.

**T30. `useLatest` и `useInterval` без stale closure.**

```ts
export function useLatest<T>(value: T): { readonly current: T } {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value; // не во время рендера: рендер может быть отброшен
  });
  return ref;
}

export function useInterval(callback: () => void, delayMs: number | null): void {
  const latest = useLatest(callback);
  useEffect(() => {
    if (delayMs === null) return; // пауза
    const id = setInterval(() => latest.current(), delayMs);
    return () => clearInterval(id);
  }, [delayMs, latest]); // callback не в зависимостях — интервал не перезапускается на каждом рендере
}

// версия 2: useEffectEvent (React 19.2+)
export function useIntervalEvent(callback: () => void, delayMs: number | null): void {
  const onTick = useEffectEvent(callback);
  useEffect(() => {
    if (delayMs === null) return;
    const id = setInterval(() => onTick(), delayMs);
    return () => clearInterval(id);
  }, [delayMs]); // Effect Event в зависимости не добавляют
}
```

Обе версии проходят тест `3 → 13 → 13 (пауза) → 33` и после `unmount` не оставляют таймеров. Интервал зависит только от `delayMs`: смена `step` его не перезапускает, а `latest.current` / `onTick` всегда вызывают колбэк последнего рендера — с актуальными `count` и `step`. Почему ref обновляется в `useLayoutEffect`: запись в ref во время рендера запрещена (рендер может быть отброшен), а layout-эффект выполняется сразу после коммита — раньше, чем сработает любой таймер. Наивная версия с `[]` замыкает `count = 0` и `callback` первого рендера: после 3 тиков `result.current` → `1` (проверено). Ловушка теста, которую нашёл автор: каждый тик — в своём `act`. Один `act(() => advanceTimersByTime(3000))` даёт `1` даже для правильного хука (проверено). Внутри одного `act` React не перерисовывает между тиками, layout-эффект не обновляет ref, и все три тика вызывают колбэк с `count = 0`.

⚠️ уточнение по типам теста. С `@testing-library/react` `renderHook` выводит `Props` из `initialProps`: `{ step: 1, delay: 1000 }` → `delay: number`, и `rerender({ step: 10, delay: null })` — ошибка `tsc` (во время выполнения всё работает; проверено). Исправление — `renderHook<number, Props>(…)` с `type Props = { step: number; delay: number | null }`. В RNTL 14 `initialProps` объявлен через `NoInfer<Props>`, поэтому там тип берётся из параметра колбэка и ошибки нет. Тест T30 для RNTL 14 (проверен):

```ts
const { result, rerender } = await renderHook(({ step, delay }: { step: number; delay: number | null }) => {
  const [count, setCount] = useState(0);
  useInterval(() => setCount(count + step), delay);
  return count;
}, { initialProps: { step: 1, delay: 1000 } });
for (let i = 0; i < 3; i++) await act(() => { jest.advanceTimersByTime(1000); }); // каждый тик — в своём act
expect(result.current).toBe(3);
await rerender({ step: 10, delay: null });
```

**T31. Код-ревью `Watchlist`.**

| # | Проблема | Последствие | Исправление |
|---|---|---|---|
| 1 | `fetch` без отмены | при быстрой смене `symbols` старый ответ перезапишет новый; `setState` после ухода с экрана | `AbortController` в cleanup (или TanStack Query) |
| 2 | нет `res.ok` и проверки формы; `data` — `any` | тело ошибки 4xx / 5xx или новая схема API попадает в state → падение в `find` / `toFixed` | `res.ok`, `unknown` + guard или Zod (T21) |
| 3 | нет `.catch` и состояния ошибки | unhandled rejection, пустой экран без объяснения | `catch` → состояние ошибки, повтор (T13) |
| 4 | массив `symbols` в зависимостях | родитель передаёт новый массив на каждом рендере → запрос на каждом рендере | зависимость `symbols.join(',')` или `useMemo` у родителя |
| 5 | подписка без cleanup | утечка, дубли подписок (StrictMode, повторный mount), обновления после ухода с экрана | вернуть `unsubscribe` из эффекта |
| 6 | `[]` вместо `[socket, symbols]` + stale closure по `quotes` | подписка на старые символы; колбэк видит `quotes` первого рендера (`[]`) → обновления цен не применяются вообще | правильные зависимости, функциональный апдейт |
| 7 | мутация state: `item.price = …; setQuotes(quotes)` | та же ссылка → React не перерисует; memo-строки не узнают об изменении | новый объект: `setQuotes((prev) => …)` |
| 8 | производное `visible` через эффект | лишний рендер и кадр с устаревшим списком | вычислять в рендере через `useMemo` |
| 9 | `visible.sort()` в рендере | мутирует state на каждом рендере; `FlatList` получает ту же ссылку и может не обновиться | сортировать копию в `useMemo` |
| 10 | `keyExtractor` по индексу в списке, отсортированном по цене | строки «переезжают»: чужое состояние и анимации, лишние перерисовки | `keyExtractor={(q) => q.symbol}` |
| 11 | каждый тик → `setQuotes` → рендер экрана, сортировка, все строки; `renderItem` и `onPress` — новые функции | при 100 тиках в секунду JS-поток перегружен, ввод тормозит | пачки тиков (T32), стор с селекторами, `memo`-строка, стабильный `renderItem` |
| 12 | `item.price.toFixed(2)` | неверно для крипты (0.00001234), нет разделителей и валюты, округление double | кэшированный `Intl.NumberFormat` с точностью инструмента (T34) |
| 13 | снимок REST и тики WebSocket не согласованы | поздний ответ `fetch` затирает более свежие тики | при слиянии живые тики важнее снимка |
| 14 | URL собирается без кодирования | спецсимволы в тикерах ломают запрос | `URLSearchParams` |

Переписанный компонент (проходит `tsc` на типах RN 0.88; smoke-тест в Jest: сортировка по цене, ключи — символы, 50 тиков → одно обновление за 100 мс, фильтр, новый массив тех же `symbols` не вызывает повторный запрос, cleanup при размонтировании, неверный ответ → текст ошибки):

```tsx
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View, type ListRenderItem } from 'react-native';

type Quote = { symbol: string; price: number };
type PriceSocket = { subscribe(symbols: string[], onQuote: (q: Quote) => void): () => void };
type Props = { symbols: string[]; socket: PriceSocket; onSelect: (symbol: string) => void };
type Quotes = ReadonlyMap<string, Quote>;

const isQuote = (x: unknown): x is Quote =>
  typeof x === 'object' && x !== null &&
  'symbol' in x && typeof x.symbol === 'string' &&
  'price' in x && typeof x.price === 'number' && Number.isFinite(x.price);

const priceFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); // один раз на модуль

const QuoteRow = memo(function QuoteRow({ quote, onSelect }: { quote: Quote; onSelect: (symbol: string) => void }) {
  return (
    <Pressable onPress={() => onSelect(quote.symbol)} accessibilityRole="button">
      <Text>{quote.symbol}: {priceFormat.format(quote.price)}</Text>
    </Pressable>
  );
});

export function Watchlist({ symbols, socket, onSelect }: Props) {
  const [quotes, setQuotes] = useState<Quotes>(() => new Map());
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const symbolsKey = symbols.join(','); // стабильная зависимость: новый массив с теми же тикерами не перезапускает эффекты

  // 1) снимок котировок: отмена при смене тикеров и размонтировании, проверка ответа
  useEffect(() => {
    if (!symbolsKey) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ symbols: symbolsKey });
    fetch(`https://api.example.com/quotes?${params}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: unknown) => { // граница доверия: any из json() сразу превращаем в unknown
        if (!Array.isArray(data) || !data.every(isQuote)) throw new Error('quotes: unexpected response');
        setError(null);
        setQuotes((prev) => {
          const next = new Map(data.map((q) => [q.symbol, q] as const));
          for (const [symbol, live] of prev) if (next.has(symbol)) next.set(symbol, live); // живые тики из сокета новее снимка
          return next;
        });
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : String(e));
      });
    return () => controller.abort();
  }, [symbolsKey]);

  // 2) живые котировки: отписка в cleanup, пачка не чаще раза в 100 мс, иммутабельное обновление
  useEffect(() => {
    if (!symbolsKey) return;
    let buffer = new Map<string, Quote>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const flush = () => {
      timer = undefined;
      const batch = buffer;
      buffer = new Map();
      setQuotes((prev) => new Map([...prev, ...batch])); // новый объект → React увидит изменение
    };
    const unsubscribe = socket.subscribe(symbolsKey.split(','), (q) => {
      buffer.set(q.symbol, q);
      timer ??= setTimeout(flush, 100);
    });
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [socket, symbolsKey]);

  // 3) производные данные — в рендере (useMemo), не в эффекте; сортируем копию
  const visible = useMemo(() => {
    const needle = filter.trim().toUpperCase();
    return [...quotes.values()].filter((q) => q.symbol.includes(needle)).sort((a, b) => b.price - a.price);
  }, [quotes, filter]);

  const renderItem = useCallback<ListRenderItem<Quote>>(
    ({ item }) => <QuoteRow quote={item} onSelect={onSelect} />,
    [onSelect],
  );

  return (
    <View>
      <TextInput value={filter} onChangeText={setFilter} placeholder="Search" autoCapitalize="characters" />
      {error !== null && <Text>{error}</Text>}
      <FlatList data={visible} keyExtractor={(q) => q.symbol} renderItem={renderItem} />
    </View>
  );
}
```

Что ещё сказать интервьюеру. Для 200 тикеров и 10 обновлений в секунду состояние стоит вынести во внешний стор (Zustand) с селектором на строку — тогда перерисовывается только строка с новой ценой. Сортировку по цене на каждом тике стоит обсудить с продуктом: строки «прыгают» под пальцем. Формат цены — по шагу цены инструмента, а не всегда 2 знака. React Compiler сам мемоизировал бы `renderItem`, строки и `visible`, но не исправил бы мутацию state, отсутствие cleanup, stale closure в эффекте с `[]`, гонки, проверку ответа, ключи и частоту обновлений.

Дальше: [часть 9 — трейдинг, геймификация и mock-интервью](01-javascript-typescript-answers-part9.md)
