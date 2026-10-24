# Итоговый проект: живой рынок на Expo — system design, WebSocket, графики на Skia

Обновлено: 2026-10-21 · Тренинг 6 из 6 · ≈ 16 часов (+ ★ 13 часов) · Вакансия: [карточка](../../card.ru.md)

[1](06-websocket-demo-binance.md) · [2](06-websocket-demo-binance-part2.md) · [3](06-websocket-demo-binance-part3.md) · [4](06-websocket-demo-binance-part4.md) · [5](06-websocket-demo-binance-part5.md) · Часть 6 из 11 · [7](06-websocket-demo-binance-part7.md) · [8](06-websocket-demo-binance-part8.md) · [9](06-websocket-demo-binance-part9.md) · [10](06-websocket-demo-binance-part10.md) · [11](06-websocket-demo-binance-part11.md)

Конец этапа 3: каркас клиента, подсказки, проверка вживую, ревью. Потом этап 4 — жизненный цикл, баннер, стор, conflation и счётчик рендеров.

### Каркас RealtimeClient (95 мин, сам)

Типы, поля и маленькие помощники готовы. Тела с `TODO` пишешь сам, по порядку. Держи открытым `npx jest --watch src/realtime`: после каждого TODO зеленеют свои тесты.

```ts
// src/realtime/RealtimeClient.ts — каркас: типы, поля и сигнатуры готовы, тела TODO пишешь сам
import { DEFAULT_BACKOFF, fullJitterDelay, type BackoffOptions } from './backoff';

export type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'offline';
export type ConnectionSnapshot = { status: ConnectionStatus; attempt: number; lastMessageAt: number | null };
export type Listener = (data: unknown) => void;
export type StopReason = 'idle' | 'offline';

export type RealtimeClientOptions = {
  url: string; // wss://…/stream — combined: каждое сообщение приходит как { stream, data }
  createSocket?: (url: string) => WebSocket; // в тестах — FakeSocket
  random?: () => number; // для jitter; в тестах — () => 0.5
  backoff?: BackoffOptions; // 500 мс → 30 с
  heartbeatMs?: number; // 5 000: как часто проверяем «живость»
  probeAfterMs?: number; // 10 000: тишина → LIST_SUBSCRIPTIONS как ping
  staleAfterMs?: number; // 15 000: тишина → соединение мёртвое
  stableAfterMs?: number; // 10 000: открыто столько → attempt = 0
  sendIntervalMs?: number; // 250: не чаще 4 управляющих сообщений в секунду (лимит Binance — 5)
  maxStreams?: number; // 1024: лимит Binance на соединение
  onStatus?: (snapshot: ConnectionSnapshot) => void;
  onError?: (error: Error) => void;
};

const OPEN = 1; // литерал вместо WebSocket.OPEN: в Jest глобального WebSocket может не быть
type Timer = ReturnType<typeof setTimeout>;

export class RealtimeClient {
  private readonly opts: Required<Omit<RealtimeClientOptions, 'onStatus' | 'onError'>> &
    Pick<RealtimeClientOptions, 'onStatus' | 'onError'>;
  private ws: WebSocket | null = null;
  private wanted = false; // true между start() и stop()
  private status: ConnectionStatus = 'idle';
  private attempt = 0;
  private lastMessageAt: number | null = null;
  private lastStatusEmitAt = 0;
  private readonly subs = new Map<string, Set<{ listener: Listener }>>(); // поток → подписчики (желаемое)
  private readonly serverStreams = new Set<string>(); // что, по нашим данным, знает сервер
  private nextId = 1;
  private lastSentAt = -Infinity;
  private reconnectTimer: Timer | null = null;
  private flushTimer: Timer | null = null;
  private stableTimer: Timer | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options: RealtimeClientOptions) {
    this.opts = {
      createSocket: (url) => new WebSocket(url),
      random: Math.random,
      backoff: DEFAULT_BACKOFF,
      heartbeatMs: 5_000,
      probeAfterMs: 10_000,
      staleAfterMs: 15_000,
      stableAfterMs: 10_000,
      sendIntervalMs: 250,
      maxStreams: 1024,
      ...options,
    };
  }

  getSnapshot(): ConnectionSnapshot {
    return { status: this.status, attempt: this.attempt, lastMessageAt: this.lastMessageAt };
  }

  start(): void {
    // TODO 1: идемпотентно; wanted = true; connect()
  }

  stop(reason: StopReason = 'idle'): void {
    // TODO 8: wanted = false; отменить reconnect; dropSocket() ДО close(1000); attempt = 0; статус = reason
  }

  subscribe(stream: string, listener: Listener): () => void {
    // TODO 3: проверки (символ строчными, кроме «!…»; не больше maxStreams) → запись { listener } в subs;
    // новый поток → scheduleFlush(). Вернуть функцию отписки: повторный вызов ничего не делает,
    // ушёл последний подписчик → удалить поток и scheduleFlush()
    return () => {};
  }

  private connect(): void {
    // TODO 2: статус connecting или reconnecting (по attempt); createSocket; serverStreams.clear();
    // обработчики с защитой «if (ws !== this.ws) return»: onopen / onmessage / onerror / onclose
  }

  private scheduleReconnect(): void {
    // TODO 6: delay = fullJitterDelay(attempt, …); attempt += 1; статус reconnecting; таймер → connect()
  }

  private reconnectNow(): void {
    // TODO 6: для serverShutdown — закрыть текущий сокет и сразу connect(), без backoff
  }

  private handleMessage(raw: unknown): void {
    // TODO 5: JSON.parse (ошибка → report(new Error('Not JSON'))); ответ с id → error? report : выход;
    // stream === '!serverShutdown' → reconnectNow(); иначе раздать data подписчикам stream (try/catch)
  }

  private checkHeartbeat(): void {
    // TODO 7: тишина ≥ staleAfterMs → close(4000, 'stale'), dropSocket(), scheduleReconnect();
    // тишина ≥ probeAfterMs → sendControl('LIST_SUBSCRIPTIONS')
  }

  private scheduleFlush(): void {
    // TODO 4: если таймер уже есть или сокет не OPEN — выход; иначе таймер на
    // max(0, lastSentAt + sendIntervalMs - now) → flush()
  }

  private flush(): void {
    // TODO 4: разница subs и serverStreams → одно сообщение: сначала SUBSCRIBE, потом UNSUBSCRIBE;
    // serverStreams меняем, только если отправили; осталась разница → scheduleFlush()
  }

  private sendControl(method: 'SUBSCRIBE' | 'UNSUBSCRIBE' | 'LIST_SUBSCRIPTIONS', params?: string[]): boolean {
    // TODO 4: сокет OPEN и прошло ≥ sendIntervalMs → send({ method, params?, id: nextId++ }); lastSentAt; true
    return false;
  }

  private dropSocket(): void {
    // TODO 2: забыть сокет (ws = null), serverStreams.clear(), остановить flush, stable и heartbeat таймеры
  }

  private isOpen(): boolean {
    return this.ws !== null && this.ws.readyState === OPEN;
  }

  private setStatus(status: ConnectionStatus): void {
    if (status === this.status) return;
    this.status = status;
    this.emitStatus();
  }

  private emitStatus(): void {
    this.lastStatusEmitAt = Date.now();
    this.opts.onStatus?.(this.getSnapshot());
  }

  private report(e: unknown): void {
    this.opts.onError?.(e instanceof Error ? e : new Error(String(e)));
  }
}
```

Каркас компилируется, ESLint даёт одно предупреждение (`fullJitterDelay` пока не используется). Все 16 тестов красные — правильная отправная точка.

| TODO | Метод | Какие требования зеленеют (номера — таблица в части 5) |
|---|---|---|
| 1–2 | `start`, `connect`, `dropSocket` | 1 (и 4, 11 — они ловят лишние сообщения позже) |
| 3–4 | `subscribe`, `scheduleFlush`, `flush`, `sendControl` | 2, 3, 4, 5, 16 |
| 5 | `handleMessage` | 6 |
| 6 | `scheduleReconnect`, `reconnectNow` | 7, 8, 9, 12, 15 |
| 7 | `checkHeartbeat` | 10, 11 |
| 8 | `stop` | 13, 14 |

**Подсказки** (по одной на TODO — открывай, только если застрял)

1. Первая строка `start()` — `if (this.wanted) return;`.
2. Обработчики — стрелочные функции, которые замыкают локальный `ws`. `onopen`: `lastMessageAt = Date.now()`, статус `open`, `setInterval(() => this.checkHeartbeat(), heartbeatMs)`, stable-таймер (`attempt = 0` и `emitStatus()`), `scheduleFlush()`. `onmessage`: `lastMessageAt`, `handleMessage(event.data)`, `emitStatus()` не чаще раза в секунду. `onclose`: `dropSocket()`; код 1008 → `report`; `if (this.wanted) scheduleReconnect()`. `onerror` пустой: за ним всегда идёт `close`.
3. Запись `{ listener }` — новый объект на каждую подписку. `Set.delete(entry)` вернёт `false` при повторной отписке — это и есть идемпотентность.
4. `flush()` считает разницу в момент отправки: всё, что изменилось за время ожидания, склеится само.
5. У ответов на запросы есть `id`, у данных — `stream` и `data`. `!serverShutdown` — тоже `stream`.
6. `attempt` увеличивай при планировании reconnect; сбрасывает его только stable-таймер и `stop()`. `reconnectNow()`: запомни сокет → `dropSocket()` → `close(1000)` → `if (this.wanted) connect()`.
7. «Тишина» = `Date.now() - (this.lastMessageAt ?? 0)`. Сначала проверка stale, потом probe.
8. `dropSocket()` до `close()`: тогда поздний `onclose` старого сокета упрётся в проверку из TODO 2.

### Проверка вживую (10 мин)

Unit-тесты не ходят в сеть. Один раз проверь клиент против настоящего Binance — в Node, без приложения:

```ts
// scripts/live-check.ts — запуск: npx tsx scripts/live-check.ts
import { RealtimeClient } from '../src/realtime/RealtimeClient';

const client = new RealtimeClient({
  url: 'wss://data-stream.binance.vision/stream',
  onStatus: (s) => console.log('status', s.status, 'attempt', s.attempt),
  onError: (e) => console.log('error', e.message),
});
let ticks = 0;
const off = client.subscribe('btcusdt@miniTicker', () => {
  ticks += 1;
});
client.start();
setTimeout(off, 6_000); // отписка: дальше тики не растут
setTimeout(() => {
  console.log('ticks', ticks);
  client.stop();
}, 9_000);
```

Ожидание (проверено на эталоне 2026-10-21): `connecting` → `open` (повторяется раз в секунду, пока идут данные) → `ticks 2…5` → `idle`. Ни одного `error`. Для отладки в приложении временно оберни `ws.send` в `createSocket` и печатай исходящие сообщения под `__DEV__`.

### Ревью (20 мин)

1. **Сам** (10 мин), по чек-листу: каждый таймер где-то очищается; каждый обработчик начинается с проверки сокета; `serverStreams` меняется только после отправки; нет `any` и `@ts-ignore`; `stop()` — ноль таймеров; ошибки не глотаются молча.
2. **Claude** (5 мин), в чистой сессии: subagent `rn-reviewer` или промпт «Ревью из части 1». **Codex** (5 мин): `/review`. Сведи находки в таблицу «находка → кто нашёл → P → принял / отклонил и почему».

**Критерии приёмки этапа 3**

- [ ] 16 тестов клиента и 3 теста backoff зелёные; ESLint без предупреждений.
- [ ] `live-check.ts` даёт ожидаемый вывод; нет `any` и `@ts-ignore`.
- [ ] Таблица ревью: 3+ находки с решением; PR смёржен на зелёном CI.

**Самопроверка**

- Зачем jitter, если уже есть экспонента? Почему `attempt` сбрасывается через 10 с, а не на `open`?
- Binance сам шлёт ping. Зачем тогда heartbeat в JS?
- Опиши сценарий, в котором без `ws !== this.ws` появятся два соединения.
- Чем «сверка» лучше очереди `SUBSCRIBE` / `UNSUBSCRIBE`? Что поменяется, если вместо Binance будет Coinbase?

**Готово, когда…** ты за 2 минуты рисуешь путь «сеть пропала → переподключились → подписки восстановлены».

## Этап 4. Жизненный цикл, баннер, стор, conflation, счётчик рендеров (1,5 ч)

**Цель.** Сокет живёт, только когда приложение активно и есть сеть. Пользователь видит статус. Тики попадают в стор пачками: одно обновление раз в 200 мс. Счётчик рендеров готов к замерам этапов 6–8.

**Что нужно знать**

- [AppState](https://reactnative.dev/docs/appstate): `active`, `background`, `inactive` (только iOS: шторка, звонок). iOS вскоре после ухода в фон приостанавливает приложение, и система может забрать ресурсы сокета ([Apple TN2277](https://developer.apple.com/library/archive/technotes/tn2277/_index.html)): если переоткрыть сокет дёшево — закрывай его в фоне. Android в Doze отключает сеть.
- NetInfo 12: `isConnected` — `boolean | null` (`null` — ещё неизвестно). В RN 0.88 `AppState.currentState` — `string | null | undefined`.
- Conflation и пачки — [тренинг 5, задача 4](../05-state-management-zustand-mobx/05-state-management-zustand-mobx-part4.md). Здесь conflator сливает поля (miniTicker и сделка дополняют друг друга), а таймер ленивый: нет данных — нет пробуждений.
- Важное в фоне (алерт по цене) — push-уведомления, не сокет.

**Шаги**

1. **Таблица решений** (15 мин, сам). `src/realtime/decideConnection.ts` — чистая функция `decideConnection(appState: string | null | undefined, isConnected: boolean | null): 'run' | 'idle' | 'offline'`. Тест готовый:
   ```ts
   import { decideConnection } from './decideConnection';

   test.each([
     ['active', true, 'run'],
     ['inactive', true, 'run'], // шторка, входящий звонок — сокет не трогаем
     ['background', true, 'idle'],
     ['background', false, 'idle'],
     ['active', false, 'offline'],
     ['active', null, 'run'], // NetInfo ещё не ответил
   ] as const)('%s + isConnected=%s → %s', (appState, isConnected, expected) => {
     expect(decideConnection(appState, isConnected)).toBe(expected);
   });
   ```
2. **Хук жизненного цикла** (15 мин, сам). `src/realtime/lifecycle.ts`: в `useEffect` — локальные `appState` и `isConnected`, функция `apply()` → `client.start()` или `client.stop(decision)`; подписки `AppState.addEventListener('change', …)` и `NetInfo.addEventListener(…)`; cleanup — `remove()`, отписка, `client.stop('idle')`. Переменные — внутри эффекта, а не `useState`: это состояние подписки, а не данные для рендера.
3. **Клиент, статус, баннер** (15 мин). Готовое:
   ```ts
   // src/store/connectionStore.ts — вход баннера из тренинга 3: status, attempt, lastMessageAt (+ idle)
   export const useConnection = create<ConnectionSnapshot>()(() => ({ status: 'idle', attempt: 0, lastMessageAt: null }));
   ```
   ```ts
   // src/realtime/client.ts
   export const realtime = new RealtimeClient({
     url: WS_URL,
     onStatus: (snapshot) => {
       const prev = useConnection.getState().status;
       useConnection.setState(snapshot);
       if (prev !== 'reconnecting' && snapshot.status === 'reconnecting') metrics.reconnects++;
       // переподключились после обрыва → в свечах могла появиться дыра: перезапросить историю
       if (prev === 'reconnecting' && snapshot.status === 'open') void queryClient.invalidateQueries({ queryKey: ['klines'] });
     },
     onError: (e) => {
       if (__DEV__) console.warn('[realtime]', e.message);
     },
   });
   ```
   `metrics` — этап 8; до него закомментируй строку. Логика баннера — из [тренинга 3, блок 7](../03-ai-tools-claude-code-codex/03-ai-tools-claude-code-codex-part3.md): `getBannerState(input, now)`; добавь `idle` → баннера нет. Текущее время — хук `useNow(1000)` (`useState(Date.now)` + `setInterval`): `Date.now()` в рендере — ошибка ESLint `react-hooks/purity`. Компонент `src/ui/ConnectionBanner.tsx` — только `className`: `View` с `absolute inset-x-0 bottom-0 border-t border-border bg-surface px-4 pt-3 pb-8` и `Text` с `text-center text-fg`; `accessibilityRole="alert"`, `testID="connection-banner"`. Корневой layout — готовый:
   ```tsx
   // src/app/_layout.tsx — полная версия (этап 0 + жизненный цикл, Query, баннер, dev-оверлей)
   import '../global.css'; // Uniwind: Tailwind-классы и токены темы — до первого экрана

   import { QueryClientProvider } from '@tanstack/react-query';
   import { Stack } from 'expo-router';
   import { useEffect } from 'react';
   import { useResolveClassNames } from 'uniwind';

   import { DevOverlay } from '@/dev/DevOverlay';
   import { queryClient } from '@/queryClient';
   import { realtime, syncClock } from '@/realtime/client';
   import { useRealtimeLifecycle } from '@/realtime/lifecycle';
   import { ConnectionBanner } from '@/ui/ConnectionBanner';
   import { StyledRootView } from '@/ui/styled';
   import { useThemeColors } from '@/ui/theme';

   export default function RootLayout() {
     useRealtimeLifecycle(realtime); // AppState + NetInfo управляют одним соединением
     useEffect(() => {
       syncClock().catch(() => {}); // нет сети — задержку покажем без поправки
     }, []);
     const screenBg = useResolveClassNames('bg-bg'); // заголовку Stack нужен style-объект
     const { fg } = useThemeColors();
     return (
       <StyledRootView className="flex-1 bg-bg">
         <QueryClientProvider client={queryClient}>
           <Stack screenOptions={{ headerStyle: screenBg, headerTintColor: fg, contentStyle: screenBg }} />
           <ConnectionBanner />
           <DevOverlay />
         </QueryClientProvider>
       </StyledRootView>
     );
   }
   ```
   `syncClock` и `DevOverlay` — этап 8: до него закомментируй их. `GestureHandlerRootView` (здесь — `StyledRootView`) нужен в корне: без него `GestureDetector` не работает.
4. **Стор котировок** (20 мин, сам). `src/store/quotesStore.ts`: `useQuotes` с `bySymbol`, `applySnapshot(list)`, `applyBatch(batch: ReadonlyMap<string, TickerPatch>)` и общей функцией `merge`. Правила `merge`: старое событие (`eventTime` меньше) пропускаем; частичный patch без снимка пропускаем; новые объекты — только у изменившихся символов; ничего не изменилось → вернуть тот же state (Zustand не уведомит подписчиков). Тесты готовые:
   ```ts
   // src/store/quotesStore.test.ts
   import { useQuotes } from './quotesStore';
   import type { Ticker } from './types';

   const t = (symbol: string, eventTime: number, last: string): Ticker => ({
     symbol, eventTime, last, open: '100', high: '110', low: '90', quoteVolume: '1000',
   });

   beforeEach(() => useQuotes.setState(useQuotes.getInitialState(), true));

   test('a batch creates new objects only for changed symbols', () => {
     const { applySnapshot, applyBatch } = useQuotes.getState();
     applySnapshot([t('BTCUSDT', 1, '100'), t('ETHUSDT', 1, '10')]);
     const eth = useQuotes.getState().bySymbol.ETHUSDT;
     applyBatch(new Map([['BTCUSDT', { symbol: 'BTCUSDT', eventTime: 2, last: '101' }]]));
     const s = useQuotes.getState().bySymbol;
     expect(s.BTCUSDT).toMatchObject({ last: '101', open: '100' }); // patch слит с текущим
     expect(s.ETHUSDT).toBe(eth); // та же ссылка → подписчики ETH ничего не делают
   });

   test('an older snapshot does not overwrite a newer tick; a partial patch before the snapshot is dropped', () => {
     const { applySnapshot, applyBatch } = useQuotes.getState();
     applyBatch(new Map([['SOLUSDT', { symbol: 'SOLUSDT', eventTime: 5, last: '108' }]]));
     expect(useQuotes.getState().bySymbol.SOLUSDT).toBeUndefined();
     applyBatch(new Map([['BTCUSDT', t('BTCUSDT', 10, '105')]]));
     applySnapshot([t('BTCUSDT', 9, '100')]);
     expect(useQuotes.getState().bySymbol.BTCUSDT?.last).toBe('105');
   });

   test('nothing changed → no notification', () => {
     const listener = jest.fn();
     useQuotes.getState().applySnapshot([t('BTCUSDT', 10, '100')]);
     const unsub = useQuotes.subscribe(listener);
     useQuotes.getState().applySnapshot([t('BTCUSDT', 9, '99')]);
     expect(listener).not.toHaveBeenCalled();
     unsub();
   });
   ```
5. **Conflator и поток в стор** (15 мин, сам). `src/store/conflator.ts`: `createConflator<T extends { symbol: string; eventTime: number }>(onFlush, intervalMs = 200)` → `{ push, flush, dispose }`. Поля сливаются, при конфликте побеждает более новое событие; первый `push` ставит `setTimeout`. Тесты готовые:
   ```ts
   // src/store/conflator.test.ts
   import { createConflator } from './conflator';
   import type { TickerPatch } from './types';

   beforeEach(() => jest.useFakeTimers());
   afterEach(() => jest.useRealTimers());

   const p = (symbol: string, eventTime: number, last: string): TickerPatch => ({ symbol, eventTime, last });

   test('1000 updates for 3 symbols within 200 ms → one batch with 3 entries', () => {
     const onFlush = jest.fn();
     const c = createConflator<TickerPatch>(onFlush, 200);
     for (let i = 0; i < 1000; i++) c.push(p(['BTCUSDT', 'ETHUSDT', 'SOLUSDT'][i % 3]!, i, String(i)));
     jest.advanceTimersByTime(199);
     expect(onFlush).not.toHaveBeenCalled();
     jest.advanceTimersByTime(1);
     const batch: Map<string, TickerPatch> = onFlush.mock.calls[0][0];
     expect(batch.size).toBe(3);
     expect(batch.get('BTCUSDT')?.last).toBe('999');
   });

   test('fields of different streams are merged; an older event does not overwrite a newer one', () => {
     const onFlush = jest.fn();
     const c = createConflator<TickerPatch>(onFlush, 200);
     c.push({ symbol: 'BTCUSDT', eventTime: 10, last: '100', open: '90' }); // miniTicker
     c.push(p('BTCUSDT', 12, '101')); // сделка
     c.push(p('BTCUSDT', 11, '99')); // опоздала
     c.flush();
     expect(onFlush.mock.calls[0][0].get('BTCUSDT')).toEqual({ symbol: 'BTCUSDT', eventTime: 12, last: '101', open: '90' });
   });

   test('no data → no timers; dispose() drops the pending batch', () => {
     const onFlush = jest.fn();
     const c = createConflator<TickerPatch>(onFlush, 200);
     expect(jest.getTimerCount()).toBe(0);
     c.push(p('BTCUSDT', 1, '1'));
     c.dispose();
     jest.advanceTimersByTime(1_000);
     expect(onFlush).not.toHaveBeenCalled();
     expect(jest.getTimerCount()).toBe(0);
   });
   ```
   `src/features/watchlist/useWatchlistStream.ts` (готовый каркас): в `useEffect` — conflator с `onFlush = useQuotes.getState().applyBatch`; на каждый символ `realtime.subscribe(miniTickerStream(s), onMini)`, в стресс-режиме ещё `tradeStream(s)`; в `onMini` — `MiniTickerSchema.safeParse` → `conflator.push(tickerFromMini(…))`, иначе `metrics.invalid++`; cleanup — все отписки и `dispose()`. `flushMs = 0` — режим «без батчинга» для замеров.
6. **Счётчик рендеров** (5 мин) — готовый `src/dev/renderStats.tsx`. Счётчик через `useRef` в рендере — ошибка ESLint `react-hooks/refs` в шаблоне SDK 58, поэтому — `<Profiler>`:
   ```tsx
   import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from 'react';

   const counts = new Map<string, number>();
   let commits = 0;
   const onRender: ProfilerOnRenderCallback = (id, phase) => {
     if (phase !== 'mount') counts.set(id, (counts.get(id) ?? 0) + 1);
   };
   export function Counted({ id, children }: { id: string; children: ReactNode }) {
     return <Profiler id={id} onRender={onRender}>{children}</Profiler>;
   }
   export const countCommit: ProfilerOnRenderCallback = () => {
     commits += 1;
   };
   // сбросить → подождать N секунд → рендеры строк и коммиты списка в секунду
   export function measureRenders(seconds = 10) {
     counts.clear();
     commits = 0;
     return new Promise<{ rowRendersPerSec: number; commitsPerSec: number }>((resolve) => {
       setTimeout(() => {
         const total = [...counts.values()].reduce((a, b) => a + b, 0);
         resolve({ rowRendersPerSec: total / seconds, commitsPerSec: commits / seconds });
       }, seconds * 1_000);
     });
   }
   ```
   На этапе 6 — `<Profiler id="list" onRender={countCommit}>` вокруг FlashList и `<Counted id={item}>` вокруг строки.
7. **Ручная проверка** (5 мин): режим полёта на 20 с → баннер «Нет интернета», новых сокетов нет, после — `connecting` → `open`; свернуть на 30 с → в фоне `idle`, после возврата цены идут без перезапуска.

**Критерии приёмки**

- [ ] Тесты `decideConnection`, стора и conflator зелёные; хук снимает обе подписки в cleanup.
- [ ] В фоне нет открытого сокета; после возврата и после режима полёта цены идут без перезапуска.
- [ ] Баннер показывает 4 состояния; при `open` со свежими данными и при `idle` его нет; стили — только `className` на токенах.

**Самопроверка**

- Почему сокет закрываем на `background`, но не на `inactive`? Почему `isConnected === null` — «пробуем»?
- Кто перезапросит снимок после возврата и почему свечам нужен отдельный `invalidateQueries`?
- Чем conflation отличается от throttle? Зачем ленивый таймер?

**Готово, когда…** режим полёта, фон и смена сети проходят без перезапуска, а баннер честно показывает, что происходит.

[Дальше: часть 7 — математика графика и watchlist без ре-рендеров →](06-websocket-demo-binance-part7.md)
