# Современная разработка с AI-инструментами: Claude Code и Codex

Обновлено: 2026-10-21 · Тренинг 3 из 6 · ≈ 16 часов · Вакансия: [карточка](../../card.ru.md)

[Часть 1](03-ai-tools-claude-code-codex.md) · [часть 2](03-ai-tools-claude-code-codex-part2.md) · часть 3 из 4 · [часть 4](03-ai-tools-claude-code-codex-part4.md)

## Блок 7. Workflow на одной фиче (2,5 ч)

**Цель.** Пройти полный цикл на реальной фиче: spec → план → тесты → маленькие диффы → три слоя ревью. Сделать ту же задачу в Codex и сравнить.

**Что повторить**

| Шаг | Что делаешь | Инструмент | Твой контроль |
|---|---|---|---|
| 1. Spec | агент задаёт тебе вопросы и пишет `SPEC.md` | Claude Code: «Interview me… write SPEC.md» | правишь spec сам |
| 2. План | агент читает код и предлагает план | plan mode, `/plan`, `Ctrl+G`; Codex `/plan` | файлы, интерфейсы, тест-план, «вне scope» |
| 3. Сначала тесты | ты пишешь список кейсов, агент — падающие тесты | Jest, RNTL | тесты красные по правильной причине |
| 4. Маленькие диффы | реализация шагами, коммит на шаг | acceptEdits или auto; hooks | `tsc`, ESLint, Jest зелёные |
| 5. Self-review | читаешь каждый дифф | `/diff`, `git diff` | чек-лист из блока 9 |
| 6. AI-ревью | ревью в чистом контексте | `rn-reviewer`, `/code-review`, `codex review` | разбираешь находки, не принимаешь вслепую |
| 7. Ревью человеком | PR: что изменилось, как проверено, что сгенерировал AI | GitHub | коллега |
| 8. CI | те же проверки + E2E | GitHub Actions или EAS Workflows | merge только на зелёном |

- План нужен не всегда. Если дифф описывается одним предложением — делай сразу (так советует best practices Claude Code).
- Хороший spec называет файлы и интерфейсы, говорит, что вне scope, и заканчивается проверкой end-to-end. После spec начни **новую сессию**: чистый контекст только для реализации.
- TDD с AI: кейсы формулируешь ты, тесты пишет агент, ты убеждаешься, что они красные. Тесты и реализацию можно делать в разных сессиях — тогда тесты не подгоняются под код.
- Дай агенту проверку, которую он запустит сам (тесты, сборка, скриншот), и проси доказательства: команду и её вывод.
- Два неудачных исправления подряд — `/clear` и новый промпт с тем, что ты узнал.

**Фича для практики: баннер статуса соединения**

Для демо котировок из [тренинга 6](../06-websocket-demo-binance/06-websocket-demo-binance.md). Демо ещё нет — сделай заглушку: стор Zustand со статусом и dev-кнопки, которые его меняют.

- Вход: `status: 'connecting' | 'open' | 'reconnecting' | 'offline'`, `attempt: number`, `lastMessageAt: number | null`.
- Тексты: `connecting` → «Подключаемся…»; `reconnecting` → «Нет соединения. Переподключение, попытка N»; `offline` → «Нет интернета. Цены могут быть устаревшими»; `open`, но сообщений нет дольше 10 с → «Данные устарели»; `open` и данные свежие → баннера нет.
- Логика — в чистой функции `getBannerState(input, now)`; компонент только рисует.
- Доступность: `accessibilityRole="alert"`, на Android `accessibilityLiveRegion="polite"`; `testID="connection-banner"`.
- Тесты: unit на `getBannerState` (все состояния и граница 10 с); компонентный тест (текст по состоянию); Maestro flow: dev-кнопка «разорвать соединение» → баннер виден.
- Вне scope: кнопка «повторить», i18n. Анимация появления — ★ по желанию.

**Практика** (135 мин; ещё 15 — на «Что повторить»)

1. **Spec через интервью** (20 мин). Промпт:
   ```text
   I want to build a connection status banner for my Expo quotes demo. Interview me in detail
   using the AskUserQuestion tool: states, texts, edge cases, accessibility, tests, out of scope.
   Don't ask obvious questions. Then write a complete spec to SPEC.md with a final end-to-end check.
   ```
   *Критерии:* `SPEC.md` на одну страницу: состояния, тексты, граничные случаи, тест-план, вне scope; ты сам поправил минимум 3 пункта.
2. **План** (20 мин). Новая сессия: `claude --permission-mode plan`, затем «Read SPEC.md and plan the implementation». `Ctrl+G` — правь план. *Критерии:* в плане есть файлы, чистая функция, селектор стора, тесты и порядок коммитов; ты изменил или убрал минимум 1 шаг; есть «вне scope».
3. **Сначала тесты** (25 мин). Сам напиши список кейсов (6+). Попроси: «Write only the tests from my list. Do not implement». Запусти `npx jest`. *Критерии:* тесты красные, потому что нет реализации, а не из-за ошибок настройки; ассерты конкретные; ты прочитал каждый тест.
4. **Реализация маленькими диффами** (35 мин). 3–4 коммита: функция → компонент → подключение к стору → Maestro flow. После каждого — хуки зелёные, `/diff` прочитан. *Критерии:* каждый дифф до ≈100 строк; все проверки зелёные; ты объясняешь каждую строку.
5. **Три слоя ревью** (15 мин). Сам по чек-листу из блока 9 → `rn-reviewer` → `/code-review`. *Критерий:* таблица находок с решением «принял / отклонил» и причиной.
6. **То же в Codex** (20 мин). Отдельный worktree от коммита до баннера: `git worktree add ../ai-lab-codex -b feature/banner-codex <commit>`, там `npm install` и `codex` с тем же `SPEC.md`: `/plan`, тесты, реализация. *Критерий:* таблица ниже заполнена, вывод — 2–3 предложения.

| Критерий | Claude Code | Codex |
|---|---|---|
| Качество плана | | |
| Сколько раз ты поправлял | | |
| Тесты проверяют поведение? | | |
| Ошибки, которые поймал ты | | |
| Время до зелёных проверок | | |
| Удобство ревью диффа | | |
| Что взял бы в работу | | |

**Самопроверка**

- Когда план не нужен? Что должно быть в хорошем spec?
- Почему реализацию лучше начинать в новой сессии после spec?
- Как убедиться, что тест от AI что-то проверяет?
- Что делаешь, если агент дважды подряд исправил не так?

**Готово, когда…** баннер работает на симуляторе, тесты и Maestro зелёные, есть 3–4 маленьких коммита и таблица сравнения. Это твой реальный пример для интервью (блок 10).

## Блок 8. Риски AI-кода (1 ч)

**Цель.** Знать главные риски с фактами и иметь защиту от каждого в своём сетапе.

**Что повторить**

| Риск | Как выглядит | Факт | Защита |
|---|---|---|---|
| Выдуманные API и пакеты | импорт пакета, которого нет, или метода, которого нет в твоей версии | USENIX Security 2025: 576 000 примеров кода, 16 моделей; выдуманные пакеты — 5,2% у коммерческих моделей и 21,7% у open-source; 205 474 уникальных выдуманных имени | `tsc` ловит несуществующие API; для пакета — `npm view <pkg>`, репозиторий, автор, дата, загрузки; `ask` на `npm install` |
| Slopsquatting | злоумышленник регистрирует «выдуманное» имя и кладёт туда вредоносный код | термин Seth Larson (2025-04); пустой пакет под выдуманным моделями именем `huggingface-cli` скачали больше 30 000 раз за 3 месяца | то же + lockfile в ревью; не ставить пакет, о котором знаешь только от AI |
| Старые версии API | TanStack Query v4 (`cacheTime`), Zustand без `useShallow`, удалённые API React Native | модель училась на старом коде | версии в `CLAUDE.md`; Context7 или доки нужной версии; `npx expo install --check` |
| Небезопасный код | токен в логах, нет валидации, `ws://`, XSS в WebView | Veracode (2025-07-30): в 45% задач модели внесли уязвимости из OWASP Top 10; у Python, C# и JavaScript — 38–45% провалов; от XSS не защитили в 86% случаев. Perry et al. (CCS 2023): с AI-ассистентом писали менее безопасный код и чаще считали его безопасным | `/security-review`, плагин security-guidance, Zod на границах, OWASP MASVS ([тренинг 2](../02-trading-app-architecture/02-trading-app-architecture.md)), ревью человеком |
| Пустые тесты | `toBeDefined`, снапшот всего экрана, мок тестируемого модуля; AI ослабляет тест, чтобы он прошёл | 100% покрытия не значит, что тесты что-то проверяют | сломай код руками — тест должен упасть; mutation testing (StrykerJS, `@stryker-mutator/jest-runner`); запрет в `CLAUDE.md` |
| Секреты и приватность | ключи в коде, `.env` в контексте, персональные данные в промпте | Claude Code: на Free, Pro, Max обучение на твоих данных — по твоей настройке (хранение 5 лет, если разрешил, иначе 30 дней); на Team, Enterprise, API — без обучения, хранение 30 дней; локальные транскрипты — в `~/.claude/projects/` 30 дней | `deny` на `.env`; секреты — в EAS env; токенизация персональных данных (как в Covenant Desk); чужой код — только в рабочем аккаунте и с разрешения |
| Prompt injection и лишние полномочия | агент читает веб, issue или MCP и выполняет чужие инструкции | OWASP Top 10 for LLM 2025: LLM01 Prompt Injection, LLM06 Excessive Agency; «смертельная триада» (блок 3) | минимальные права; `ask` на push и сеть; только доверенные MCP; песочница; `--bare` в CI |
| Лицензии | AI воспроизвёл чужой код; GPL в закрытом приложении; зависимость с несовместимой лицензией | GitHub Copilot, например, ищет совпадения подсказок с публичным кодом и показывает лицензию — значит, совпадения бывают | не брать код с чужим копирайтом; проверять лицензию новых зависимостей; при сомнении — юрист |
| Over-engineering и лишний scope | фабрики и generics «на будущее», правки «заодно» | ревьюер, которого попросили найти проблемы, найдёт их всегда; погоня за каждой находкой раздувает код | YAGNI; дифф только по задаче; ревьюер сообщает только существенное |

Настройки данных в Codex и ChatGPT — свои; проверь их в аккаунте (детали я не сверял).

**Практика** (30 мин; ещё 30 — на «Что повторить»)

1. **Проверка пакетов** (10 мин). Попроси AI: «Предложи 5 библиотек для графика котировок в Expo-приложении». Для каждой: `npm view <pkg> version license repository.url time.modified`, страница на npmjs.com (загрузки), поддержка New Architecture в React Native Directory. *Критерий:* таблица на 5 строк: существует? живой? лицензия? New Architecture? вердикт.
2. **Защиты** (20 мин). Для 5 рисков запиши конкретную защиту в своём сетапе: правило, hook, permission или шаг CI. Две включи в песочнице. *Критерии:* таблица «риск → защита → где»; две защиты реально срабатывают.

**Самопроверка**

- Что такое slopsquatting и как ты от него защищаешься?
- Почему 100% покрытия ничего не гарантирует? Как проверить качество тестов?
- Что в риске «секреты» решают права агента, а что — только дисциплина?
- Назови 2 цифры из исследований о безопасности AI-кода и вывод из них.

**Готово, когда…** ты называешь 5 рисков с фактами и для каждого — защиту, которая уже есть в твоём сетапе.

## Блок 9. Глубокое ревью AI-кода (1,5 ч)

**Цель.** Ревьюить AI-код быстро и глубоко: по чек-листу, с фокусом на местах, где AI ошибается чаще всего.

**Что повторить**

AI-код выглядит уверенно и чисто, поэтому его ошибки **правдоподобные**. Читай с подозрением на границах: импорты, внешние данные, эффекты, деньги, безопасность. На каждый незнакомый API спрашивай: «Откуда он и есть ли он в нашей версии?» Тесты читай первыми: они показывают, что автор считал «готово».

Чек-лист для React Native:

**0. Объём**
- [ ] Понимаю задачу и план; дифф делает только это, без «заодно поправил».
- [ ] Дифф маленький; каждый файл объясним.

**1. Существование и версии**
- [ ] Каждый новый импорт есть в `package.json`; API есть в документации **нашей** версии.
- [ ] Новый пакет: существует, живой, автор понятен, лицензия совместима; нативное — через `npx expo install`.
- [ ] Только API текущих мажоров: TanStack Query v5 (объектная форма, `gcTime`), Zustand v5 (`useShallow`), React Native (отписка через `subscription.remove()`), Reanimated 4 (`react-native-worklets`, `scheduleOnRN`).

**2. Корректность и ошибки**
- [ ] Граничные случаи: пусто, `null`, ошибка сети, таймаут, двойной тап, гонки (старый ответ пришёл позже нового).
- [ ] Ошибки не глотаются (`catch {}`); в логах нет токенов и персональных данных.
- [ ] Внешние данные (REST, WebSocket, deep links, push) проверяются схемой Zod, а не `as`-кастом.

**3. React и React Native**
- [ ] У каждой подписки, таймера и сокета есть cleanup; массив зависимостей верный.
- [ ] Узкие селекторы стора; объекты — через `useShallow`; частые обновления (тики) — пачками, не `setState` на каждое сообщение.
- [ ] Списки: FlashList или FlatList, стабильные ключи, лёгкий `renderItem`.
- [ ] iOS и Android, safe area, клавиатура, доступность (`accessibilityRole`, `accessibilityLabel`).

**4. Reanimated и UI thread**
- [ ] В worklets вызываются только worklets; JS-функции — через `scheduleOnRN`; данные — через shared values.
- [ ] Нет тяжёлой работы на JS thread во время жестов и анимаций.

**5. Real-time и трейдинг**
- [ ] Одно соединение; переподключение с backoff и jitter; нет дублей после AppState и NetInfo.
- [ ] Деньги — decimal или целые минорные единицы, не float; округление явное; клиентский P&L помечен как оценка.
- [ ] Видно, что данные устарели (статус соединения, время котировки).

**6. Безопасность**
- [ ] Нет секретов в коде, бандле, логах и URL; токены — в SecureStore; только `https://` и `wss://`.
- [ ] Права и роли проверяет сервер; новые разрешения, deep links и WebView проверены отдельно.

**7. Тесты**
- [ ] Тест падает, если сломать код (проверь руками).
- [ ] Ассерты проверяют конкретное поведение, а не `toBeDefined` или снапшот всего экрана.
- [ ] Тестируемый модуль не замокан; моки — только на границах (сеть, нативные модули).
- [ ] AI не ослабил существующие тесты (`skip`, удалённые кейсы, изменённые ожидания).

**8. Простота и происхождение**
- [ ] Нет абстракций «на будущее», мёртвого кода и закомментированных кусков; код следует архитектуре из `CLAUDE.md` / `AGENTS.md`.
- [ ] Нет скопированного кода с чужим копирайтом или GPL.

**9. Доказательства**
- [ ] Есть вывод `tsc`, ESLint и тестов; для UI — скриншот или запись с симулятора; для анимаций — проверка в release-сборке.

**Упражнение: найди ошибки**

AI «написал» строку котировки с потоком по WebSocket и тест к ней. В коде **10 заложенных проблем** и одна бонусная (★) — трейдинговая. Скопируй код в `review-drill/QuoteRow.tsx` в песочнице и не подключай его к приложению. Для шага 3 рядом понадобится заглушка `review-drill/api.ts`: `export async function fetchInstrument(symbol: string) { return { symbol, name: symbol }; }`.

```tsx
/* Based on ws-reconnect.js, Copyright (c) 2021 J. Doe. Licensed under GPL-3.0. Copied with minor changes. */
import { useEffect } from 'react';
import { AppState, Text } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { create } from 'zustand';
import { fetchInstrument } from './api';

const API_KEY = 'pk_live_51HxYzTRADE'; // TODO: move to env later
const WS_URL = `ws://stream.example-broker.com/quotes?token=${API_KEY}`;

type Quote = { s: string; p: string; prev: string };
type QuoteState = {
  quotes: Record<string, Quote>; status: string;
  setQuote: (q: Quote) => void; setStatus: (s: string) => void;
};
export const useQuoteStore = create<QuoteState>()((set) => ({
  quotes: {},
  status: 'idle',
  setQuote: (q) => set((st) => ({ quotes: { ...st.quotes, [q.s]: q } })),
  setStatus: (status) => set({ status }),
}));
// Extensible strategy layer: ready for any future transport and message type
abstract class StreamStrategy<TIn, TOut> {
  abstract map(input: TIn): TOut;
}
class QuoteStrategy extends StreamStrategy<string, Quote> {
  map(raw: string) { return JSON.parse(raw) as Quote; }
}
const registry = new Map<string, StreamStrategy<string, Quote>>([['quote', new QuoteStrategy()]]);

export function useQuoteStream(symbol: string) {
  useEffect(() => {
    const { setQuote, setStatus } = useQuoteStore.getState();
    let ws: WebSocket;
    const connect = () => {
      console.log('Connecting to', WS_URL);
      ws = new WebSocket(WS_URL);
      ws.onopen = () => {
        setStatus('open');
        ws.send(JSON.stringify({ subscribe: symbol }));
      };
      ws.onmessage = (e) => setQuote(registry.get('quote')!.map(e.data));
      ws.onclose = () => {
        setStatus('reconnecting');
        connect(); // reconnect immediately for the best UX
      };
    };
    connect();
    const heartbeat = setInterval(() => ws.send('ping'), 15_000);
    const onAppState = (s: string) => s === 'active' && connect();
    AppState.addEventListener('change', onAppState);
    return () => AppState.removeEventListener('change', onAppState);
  }, []);
}

const flashColor = (change: number) => (change >= 0 ? '#1DB954' : '#E5484D');

export function QuoteRow({ symbol, qty }: { symbol: string; qty: number }) {
  const { quote, status } = useQuoteStore((s) => ({ quote: s.quotes[symbol], status: s.status }));
  const { data: instrument } = useQuery(['instrument', symbol], () => fetchInstrument(symbol),
    { cacheTime: 60_000 });
  const change = quote ? parseFloat(quote.p) - parseFloat(quote.prev) : 0;
  const pnl = (change * qty).toFixed(2); // P&L in USD
  const style = useAnimatedStyle(() => ({
    backgroundColor: withTiming(flashColor(change), { duration: 300 }),
  }));
  return (
    <Animated.View style={style} testID={`quote-${symbol}`}>
      <Text>{instrument?.name ?? symbol} {quote?.p}</Text>
      <Text>PnL: {pnl} USD · {status}</Text>
    </Animated.View>
  );
}

// QuoteRow.test.tsx
import { useQuoteStore } from './QuoteRow';
it('stores a quote', () => {
  useQuoteStore.getState().setQuote({ s: 'BTCUSDT', p: '100.10', prev: '100.00' });
  expect(useQuoteStore.getState().quotes).toBeDefined();
});
```

**Практика** (70 мин; ещё 20 — на чек-лист)

1. **Сам** (35 мин, таймер, без AI и без запуска). Для каждой находки: фрагмент кода, проблема, почему опасно, как исправить, severity (blocker / major / minor). *Критерий:* найдено ≥ 8 из 10.
2. **Сверка с AI** (15 мин). `git add -N review-drill/QuoteRow.tsx` (чтобы файл попал в `git diff`), затем «Use the rn-reviewer subagent on my diff» и `codex review --uncommitted`. *Критерий:* таблица «нашёл я / нашёл AI / ложные срабатывания AI».
3. **Исправление** (20 мин). Сверь свой список с разделом «Ответы к упражнению с ошибками» в самом конце [части 4](03-ai-tools-claude-code-codex-part4.md). Потом сам, без AI, перепиши код. Запусти `tsc`, ESLint, Jest; попроси AI отревьюить твою версию. *Критерии:* исправлены все 10 + ★; тест падает, если сломать `setQuote`.

> Не открывай ответы, пока не закончишь шаг 1.

**Самопроверка**

- Какие 3 места в AI-коде ты проверяешь первыми и почему?
- Какие из 10 проблем поймали бы `tsc` и ESLint, а какие — только человек или рантайм?
- Как объяснить интервьюеру, почему AI-код ты ревьюишь строже, чем код коллеги?

**Готово, когда…** ты находишь ≥ 8 проблем за 35 минут и помнишь группы чек-листа: объём, версии, ошибки, React Native, worklets, real-time, безопасность, тесты, простота, доказательства.

---

Дальше: [часть 4 — ответы для интервью, mock-интервью, источники и ответы к упражнению](03-ai-tools-claude-code-codex-part4.md)
