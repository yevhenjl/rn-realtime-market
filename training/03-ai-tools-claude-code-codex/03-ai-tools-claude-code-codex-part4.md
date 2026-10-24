# Современная разработка с AI-инструментами: Claude Code и Codex

Обновлено: 2026-10-21 · Тренинг 3 из 6 · ≈ 16 часов · Вакансия: [карточка](../../card.ru.md)

[Часть 1](03-ai-tools-claude-code-codex.md) · [часть 2](03-ai-tools-claude-code-codex-part2.md) · [часть 3](03-ai-tools-claude-code-codex-part3.md) · часть 4 из 4

> В конце этой части — ответы к упражнению из блока 9. Сначала сделай упражнение.

## Блок 10. Ответы для интервью (1 ч)

**Цель.** Рассказать «как я использую AI в разработке» за 2 минуты и коротко ответить на 6 уточняющих вопросов. Только правда.

**Что повторить** — рассказ, ответы и фразы на английском ниже; факты — в разделе «На что опираться» в [части 1](03-ai-tools-claude-code-codex.md).

**Правило честности.** Пункты с ◆ станут правдой после этого тренинга: plan mode, хуки, права агента, ревью вторым агентом. Пока не сделал — убери их или скажи честно: «сейчас настраиваю». В квадратных скобках — место для твоего реального примера.

### Рассказ на 2 минуты

Структура: подход → контекст → процесс → что проверяю → AI в продуктах → пример → вывод. Это ≈ 300 слов — около 2 минут вслух.

> Я каждый день работаю с Claude Code и Codex. Для меня это не автодополнение, а агенты: они читают проект, запускают команды и тесты, правят много файлов сразу. Поэтому я отношусь к ним как к сильному, но новому коллеге: даю контекст, ставлю рамки и проверяю результат строже, чем код человека.
>
> Контекст. В каждом проекте у агента есть файл правил — CLAUDE.md для Claude Code и AGENTS.md для Codex: стек, архитектура, команды проверки и запреты. ◆ Например: деньги — только в decimal, новые зависимости — только с моего согласия.
>
> Процесс. Задачу режу на маленькие шаги и читаю каждый дифф. ◆ Если правка затрагивает больше пары файлов — сначала план в plan mode, и я правлю план до кода. Типы, линтер и тесты обязательны в CI, ◆ а в Claude Code они ещё и запускаются хуками после правок: это не просьба к модели, а проверка, которая срабатывает всегда. Тесты для критичной логики пишу или проверяю сам.
>
> Что проверяю в AI-коде. Существуют ли API и пакеты и той ли они версии. В React Native — лишние ре-рендеры, утечки в эффектах, код в worklets. Безопасность: секреты, валидацию входных данных, права доступа. ◆ Для второго мнения прошу ревью у другого агента в чистом контексте.
>
> AI я делал и в продуктах, поэтому знаю, где модель ошибается. В Covenant Desk AI-копилот вызывает инструменты, но меняет данные только после подтверждения пользователя, а персональные данные токенизируются до отправки в модель. В PathoAICode — RAG с реранкером и валидатором правил: точность выросла с 48 до 92 процентов, а валидатор не даёт модели придумать медицинский код, которого нет. В разработке тот же принцип: доверяй, но проверяй автоматически.
>
> [Пример, 2–3 предложения: задача → что сделал агент → что ты проверил и поймал. Например, баннер статуса соединения из блока 7.]
>
> Cursor каждый день не использую, но это инструмент того же класса: правила, план, агент, MCP. Если в команде Cursor — перейду быстро. AI меня ускоряет, но ответственность за код — моя.

Если перейдут на английский (≈ 1 минута, простыми фразами):

> I use Claude Code and Codex every day. I treat them like a strong new teammate: I give context, set limits and review the result more strictly than human code. Every project has a rules file, CLAUDE.md or AGENTS.md, with the stack, the architecture, the check commands and the rules, ◆ for example "money only in decimal". I split work into small steps and read every diff. Types, lint and tests are required in CI. In AI code, I check that APIs and packages really exist in our versions. In React Native, I look for extra re-renders, leaks in effects and worklet code. I also check security: secrets, input validation, permissions. I build AI features too: in Covenant Desk, the copilot changes data only after the user confirms, and personal data is tokenized before it reaches the model. AI makes me faster, but I own the code.

### Уточняющие вопросы: короткие ответы

Правило то же: ◆ — то, что станет правдой после тренинга.

**«Как ты проверяешь AI-код?»** По шагам. До кода — план: понимаю, что и где изменится. Потом читаю каждый дифф. Сначала границы: откуда этот импорт, есть ли такой API в нашей версии, что с ошибками и внешними данными. Для React Native отдельно — cleanup в эффектах, ре-рендеры, worklets. Автоматика — `tsc`, ESLint, тесты, и тест должен падать, если сломать код. ◆ Потом ревью в чистом контексте и обычное ревью коллегой.

**«Когда ты не используешь AI?»** Когда не могу проверить результат: незнакомая область, нет тестов. В критичной логике — деньги, ордера, авторизация — только с тестами и полным пониманием каждой строки. С конфиденциальными данными и чужим кодом — только если это разрешено. И правки на одну строку — руками быстрее.

**«Как держишь качество и безопасность?»** Правила в CLAUDE.md — это совет. Поэтому важное перевожу в то, что выполняется кодом: ◆ права агента (запрет читать `.env`, вопрос перед `npm install` и `git push`), ◆ хуки с проверками, CI. Секреты — не в коде и не в промптах. Новый пакет проверяю: существует ли он и кто за ним стоит — из-за slopsquatting. MCP-серверы — только доверенные. Для рискованных изменений — отдельное security-ревью.

**«Claude Code, Codex, Cursor — в чём разница?»** Claude Code и Codex — агенты: работают в терминале, в IDE и в облаке и сами запускают команды. У Claude Code правила в CLAUDE.md, права allow / ask / deny, plan mode, хуки, subagents и skills. Codex читает AGENTS.md и по умолчанию работает в песочнице ОС: без сети, правки только в рабочей папке; плюс облачные задачи и `@codex review` на GitHub. Cursor — IDE с агентом и автодополнением, правила в `.cursor/rules`, ревью PR — Bugbot. Концепции общие, поэтому переход быстрый.

**«Как контролируешь стоимость и контекст?»** Контекст — главный ресурс: чем он полнее, тем хуже качество. ◆ Одна задача — одна сессия, между задачами `/clear`; тяжёлое чтение — в subagent; CLAUDE.md короткий, редкое — в skills. Модель под задачу: для рутины дешевле, для архитектуры сильнее. Точный промпт и план экономят переделки. Если агент работает в CI — лимиты `--max-turns` и `--max-budget-usd`.

**«Дал бы AI писать тесты?»** Да, но кейсы определяю я: поведение, граничные случаи, ошибки. AI пишет тесты, я проверяю, что они падают по правильной причине. ◆ В правилах агента прямо запрещено менять тесты, чтобы они прошли. Для денег и ордеров читаю каждый тест. Покрытие само по себе ничего не доказывает: важно, что тест ловит поломку.

Фразы на английском:

- I treat AI code like code from a new teammate. I review it even more strictly.
- The rules file is advice. Hooks, permissions and CI are enforcement.
- First a plan, then small diffs, then a review in a fresh context.
- I check that every new package really exists. That is how slopsquatting attacks work.
- A test is useful only if it fails when the code is broken.
- I don't use AI where I can't verify the result.
- Cursor is the same class of tool. The concepts transfer.
- AI makes me faster, but I own the code.

**Практика** (60 мин)

1. **Своя версия** (20 мин). Перепиши рассказ своими словами. Убери ◆, которые ещё не правда. Вставь реальный пример. *Критерии:* до 300 слов; каждое утверждение — правда; в примере есть то, что ты проверил сам.
2. **Вслух × 3** (20 мин). Таймер, запись на телефон, без бумажки. *Критерии:* 1:45–2:15; с каждым разом меньше «эээ» и пауз.
3. **Уточняющие вопросы** (20 мин). Попроси AI: «Задай мне эти 6 вопросов в случайном порядке и 2 новых по той же теме. По одному». Отвечай вслух, 30–60 секунд. *Критерий:* в каждом ответе есть одна конкретика: команда, файл или пример.

**Самопроверка**

- Какие 3 факта из твоего опыта показывают, что ты понимаешь ошибки моделей?
- Какой у тебя реальный пример — и что ты в нём проверил?
- Какие утверждения в рассказе ты пока не можешь подтвердить делом?

**Готово, когда…** рассказ укладывается в 2 минуты без бумажки, и на каждый уточняющий вопрос у тебя есть конкретный ответ.

## Блок 11. Mock-интервью с AI (0,5 ч)

**Цель.** Проверить всё под давлением: вопросы по одному, уточнения, ревью кода вслух.

**Что повторить** — чек-лист из блока 9 и свои ответы из блока 10.

Вставь промпт в Claude или ChatGPT. Лучше в голосовом режиме — отвечай вслух.

```text
Ты — Senior Frontend-разработчик продуктовой fintech-компании: трейдинговая платформа, основное
приложение на React Native, новые геймифицированные mini-apps (турниры, челленджи, ачивки).
Проводишь техническое интервью с кандидатом на позицию React Native-разработчика. Эта часть
интервью — разработка с AI-инструментами (Claude Code, Codex, Cursor) и ревью AI-кода.

Правила:
1. Задавай по одному вопросу и жди моего ответа. Не подсказывай и не отвечай за меня.
2. Всего 8–10 вопросов: от общих («как ты используешь AI в разработке?») к глубоким: файлы правил,
   права и режимы агента, hooks, subagents, MCP, контекст и стоимость, безопасность и приватность,
   тесты от AI, сравнение Claude Code, Codex и Cursor.
3. На каждый мой ответ задай 1 уточнение: «почему?», «покажи на примере», «а если…».
4. Один раз дай фрагмент React Native-кода на 40–60 строк, «написанный AI», с 5–6 скрытыми
   проблемами (эффекты, ре-рендеры, worklets, безопасность, тесты). Попроси ревью вслух.
   Не называй проблемы, пока я не закончу.
5. Один вопрос-кейс: «AI предложил пакет, которого ты не знаешь. Твои действия?»
6. Если я отвечаю общими словами — скажи об этом и попроси конкретику: команду, файл, пример.
7. В конце: оценка 1–5 по критериям (конкретика, понимание инструментов, критичность к AI-коду,
   безопасность, ясность речи), 3 сильные стороны, 3 зоны роста, 5 тем для повторения.
   Отдельно перечисли фразы, которые звучали как «вода».
Начни с короткого представления и первого вопроса.
```

Вариант на английском — добавь в конец промпта: «Проведи интервью на английском. Говори просто, на уровне B1–B2. В конце перечисли мои ошибки в английском и дай лучшие формулировки».

**Практика** (30 мин)

1. **Mock** (25 мин). *Критерий:* средняя оценка ≥ 4; на ревью кода найдено ≥ 4 из 5–6 проблем.
2. **Разбор** (5 мин). 3 слабых места — в журнал, с датой повтора через 1 и 3 дня.

**Самопроверка**

- Какой вопрос застал тебя врасплох? Что ответишь в следующий раз?
- Где ты ответил общими словами, без команды, файла или примера?

**Готово, когда…** mock пройден на ≥ 4, а слабые места записаны с планом повторения.

## Связанные материалы

- [Скрининг: вопросы и ответы](../../screening-qa.ru.md) — вопросы 15 и 16, с которых всё началось.
- [Тренинг 1: JavaScript и TypeScript](../01-javascript-typescript/01-javascript-typescript.md) — live coding без AI.
- [Тренинг 2: архитектура трейдингового приложения](../02-trading-app-architecture/02-trading-app-architecture.md) — деньги, real-time, безопасность.
- [Тренинг 4: анимации, Reanimated, Skia](../04-animations-reanimated-skia/04-animations-reanimated-skia.md) — worklets и UI thread.
- [Тренинг 5: управление состоянием](../05-state-management-zustand-mobx/05-state-management-zustand-mobx.md) — селекторы и ре-рендеры.
- [Тренинг 6: демо на WebSocket](../06-websocket-demo-binance/06-websocket-demo-binance.md) — фича из блока 7.
- [WebSocket: подготовка к интервью](../../../../../interview-prep/technical/websockets.ru.md).

## Источники

Claude Code (документация Anthropic):

- [Overview и установка](https://code.claude.com/docs/en/overview) — проверено 2026-10-21
- [Model configuration](https://code.claude.com/docs/en/model-config) — проверено 2026-10-21
- [Memory: CLAUDE.md, rules, AGENTS.md, auto memory](https://code.claude.com/docs/en/memory) — проверено 2026-10-21
- [Settings](https://code.claude.com/docs/en/settings) · [Permissions](https://code.claude.com/docs/en/permissions) · [Permission modes](https://code.claude.com/docs/en/permission-modes) — проверено 2026-10-21
- [Commands](https://code.claude.com/docs/en/commands) · [CLI reference](https://code.claude.com/docs/en/cli-reference) — проверено 2026-10-21
- [Hooks guide](https://code.claude.com/docs/en/hooks-guide) · [Hooks reference](https://code.claude.com/docs/en/hooks) — проверено 2026-10-21
- [Subagents](https://code.claude.com/docs/en/sub-agents) · [Skills](https://code.claude.com/docs/en/skills) · [Extend Claude Code](https://code.claude.com/docs/en/features-overview) — проверено 2026-10-21
- [MCP](https://code.claude.com/docs/en/mcp) · [Code intelligence plugins](https://code.claude.com/docs/en/plugins/code-intelligence) — проверено 2026-10-21
- [Headless](https://code.claude.com/docs/en/headless) · [Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview) · [SDK quickstart](https://code.claude.com/docs/en/agent-sdk/quickstart) — проверено 2026-10-21
- [GitHub Actions](https://code.claude.com/docs/en/github-actions) · [Code Review](https://code.claude.com/docs/en/code-review) · [/code-review](https://code.claude.com/docs/en/code-review-local) · [Ultrareview](https://code.claude.com/docs/en/ultrareview) — проверено 2026-10-21
- [Security guidance plugin](https://code.claude.com/docs/en/security-guidance) — проверено 2026-10-21
- [Worktrees](https://code.claude.com/docs/en/worktrees) · [Context window](https://code.claude.com/docs/en/context-window) · [Costs](https://code.claude.com/docs/en/costs) — проверено 2026-10-21
- [Best practices](https://code.claude.com/docs/en/best-practices) (сюда ведёт старый пост anthropic.com/engineering/claude-code-best-practices) — проверено 2026-10-21
- [Data usage](https://code.claude.com/docs/en/data-usage) · [Legal and compliance](https://code.claude.com/docs/en/legal-and-compliance) — проверено 2026-10-21
- [iOS Simulator в Claude Desktop](https://code.claude.com/docs/en/desktop-ios-simulator) — проверено 2026-10-21

Codex (документация OpenAI):

- [Codex CLI](https://learn.chatgpt.com/docs/codex/cli) · [Команды и флаги](https://learn.chatgpt.com/docs/developer-commands?surface=cli) — проверено 2026-10-21
- [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) · [Config basics](https://learn.chatgpt.com/docs/config-file/config-basic) — проверено 2026-10-21
- [Approvals и безопасность](https://learn.chatgpt.com/docs/agent-approvals-security) · [Sandbox](https://learn.chatgpt.com/docs/sandboxing) · [Auto-review](https://learn.chatgpt.com/docs/sandboxing/auto-review) — проверено 2026-10-21
- [Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode) · [Code review](https://learn.chatgpt.com/docs/code-review) · [Ревью на GitHub](https://learn.chatgpt.com/docs/third-party/github) — проверено 2026-10-21
- [Codex cloud](https://learn.chatgpt.com/docs/cloud) · [IDE extension](https://learn.chatgpt.com/docs/codex/ide) · [Worktrees](https://learn.chatgpt.com/docs/environments/git-worktrees) — проверено 2026-10-21
- [Hooks](https://learn.chatgpt.com/docs/hooks) · [MCP](https://learn.chatgpt.com/docs/extend/mcp) · [Skills и plugins](https://learn.chatgpt.com/docs/skills-and-plugins) — проверено 2026-10-21
- [Models](https://learn.chatgpt.com/docs/models) · [Pricing](https://learn.chatgpt.com/docs/pricing) · [Best practices](https://learn.chatgpt.com/guides/best-practices) — проверено 2026-10-21

Cursor:

- [Agent](https://cursor.com/docs/agent/overview) · [Rules](https://cursor.com/docs/rules) · [Bugbot](https://cursor.com/docs/bugbot) — проверено 2026-10-21

MCP и инструменты для mobile:

- [Expo MCP Server](https://docs.expo.dev/eas/ai/mcp/) · [Maestro MCP](https://maestro.dev/mcp) · [Context7](https://github.com/upstash/context7) — проверено 2026-10-21
- [Expo CLI: `npx expo install --check`](https://docs.expo.dev/more/expo-cli/) · [шаблон Expo SDK 58: `typescript ~6.0.3`](https://github.com/expo/expo/blob/sdk-58/templates/expo-template-default/package.json) — проверено 2026-10-21

Библиотеки (для упражнения с ошибками; код проверен `tsc` и ESLint на React Native 0.88.0, Zustand 5.0.15, TanStack Query 5.104.5, Reanimated 4.7.1, react-native-worklets 0.13.0, TypeScript 6.0.3):

- [TanStack Query: миграция на v5](https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5) · [Zustand: миграция на v5](https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5) — проверено 2026-10-21
- [Worklets: troubleshooting](https://docs.swmansion.com/react-native-worklets/docs/guides/troubleshooting) · [scheduleOnRN](https://docs.swmansion.com/react-native-worklets/docs/threading/scheduleOnRN/) — проверено 2026-10-21
- [React Native AppState](https://reactnative.dev/docs/appstate) · исходники [AppState.js](https://github.com/facebook/react-native/blob/main/packages/react-native/Libraries/AppState/AppState.js) и [WebSocket.js](https://github.com/facebook/react-native/blob/main/packages/react-native/Libraries/WebSocket/WebSocket.js) — проверено 2026-10-21
- [StrykerJS: Jest runner](https://stryker-mutator.io/docs/stryker-js/jest-runner/) — проверено 2026-10-21

Исследования и риски:

- [Spracklen et al., «We Have a Package for You!», USENIX Security 2025](https://arxiv.org/abs/2406.10279) · [Slopsquatting](https://en.wikipedia.org/wiki/Slopsquatting) — проверено 2026-10-21
- [Veracode: GenAI Code Security Report, 2025-07-30](https://www.veracode.com/press-release/ai-generated-code-poses-major-security-risks-in-nearly-half-of-all-development-tasks-veracode-research-reveals/) — проверено 2026-10-21
- [Perry et al., «Do Users Write More Insecure Code with AI Assistants?», CCS 2023](https://arxiv.org/abs/2211.03622) — проверено 2026-10-21
- [METR, 2025-07-10](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/) · [METR, обновление 2026-02-24](https://metr.org/blog/2026-02-24-uplift-update/) — проверено 2026-10-21
- [OWASP Top 10 for LLM Applications 2025](https://genai.owasp.org/llm-top-10/) · [Simon Willison: The lethal trifecta, 2025-06-16](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) — проверено 2026-10-21
- [GitHub Copilot: code referencing](https://docs.github.com/en/copilot/concepts/completions/code-referencing) — проверено 2026-10-21

Что не проверено: детали прав агента в Cursor (автозапуск команд, allowlist) и настройки данных в Codex и ChatGPT — в тексте это отмечено.

## Ответы к упражнению с ошибками

Засчитывай находку, если ты назвал проблему и объяснил, почему она опасна.

1. **Лицензия** — `/* Based on ws-reconnect.js … GPL-3.0 … Copied */`. GPL-3.0 — copyleft: если распространяешь приложение с этим кодом, придётся открыть код на тех же условиях. Для закрытого коммерческого приложения это блокер. AI может воспроизвести чужой код — с заголовком или без. *Исправить:* удалить; написать своё или взять зависимость с совместимой лицензией (MIT, Apache-2.0); при сомнении — к юристу. *Автоматика:* нет.
2. **Секреты и транспорт** — `API_KEY` в коде, токен в URL, `ws://`, `console.log` с этим URL. Всё из JS-бандла можно достать из сборки приложения, то есть ключ публичный. URL с токеном попадает в логи, прокси и отчёты о падениях. `ws://` — без шифрования. *Исправить:* никаких долгоживущих секретов в клиенте; короткоживущий токен от бэкенда после входа (в первом сообщении или как короткий тикет); только `wss://`; логгер без токенов. *Автоматика:* частично — сканер секретов в CI или свой паттерн в плагине security-guidance.
3. **Over-engineering** — `StreamStrategy`, `QuoteStrategy` и `registry` ради одного типа сообщений; `!` прячет случай «стратегии нет». *Исправить:* одна функция `parseQuote(raw: string): Quote | null`. *Автоматика:* нет.
4. **Обработка ошибок** — `JSON.parse(raw) as Quote` на каждый кадр. Если сервер ответит на `ping` текстом `pong` или придёт битый кадр, `JSON.parse` бросит исключение внутри `onmessage`. `as Quote` — не проверка: форма данных не валидируется. Ещё `ws.send('ping')` в состоянии CONNECTING в React Native бросает `INVALID_STATE_ERR` (см. исходник `WebSocket.js`), а `onerror` нет. *Исправить:* `safeParse` по схеме Zod, служебные сообщения — отдельно; `send` только при `ws.readyState === WebSocket.OPEN`; `onerror` с логированием. *Автоматика:* нет.
5. **Жизненный цикл эффекта** — cleanup не закрывает сокет и не останавливает `heartbeat`. `onclose` переподключается сразу и без backoff — и после размонтирования, и когда сервер лежит: бесконечный цикл, батарея, нагрузка на сервер. На `active` открывается второй сокет, первый не закрыт. `[]` вместо `[symbol]` — после смены символа подписка остаётся старой. *Исправить:* флаг «закрыли сами», backoff с jitter (0,5 с → 30 с), закрытие сокета в фоне; в cleanup — `clearInterval` и `ws.close()`; лучше одно соединение на приложение с подписками по темам ([тренинг 6](../06-websocket-demo-binance/06-websocket-demo-binance.md)). *Автоматика:* частично — ESLint: `react-hooks/exhaustive-deps` (нет `symbol`) и `no-unused-vars` (`heartbeat`).
6. **Несуществующий API** — `AppState.removeEventListener`. В текущем React Native у `AppState` есть только `addEventListener`, и он возвращает подписку. В рантайме — `TypeError` при размонтировании. *Исправить:* `const sub = AppState.addEventListener('change', onAppState); return () => sub.remove();`. *Автоматика:* да — `tsc`: `Property 'removeEventListener' does not exist`.
7. **Ре-рендеры** — `useQuoteStore((s) => ({ quote: …, status: … }))`. Селектор каждый раз возвращает новый объект. В Zustand v5 это может уйти в бесконечный цикл (`Maximum update depth exceeded`); даже без цикла строка перерисовывалась бы на любое изменение стора — на каждый тик любой котировки. *Исправить:* два узких селектора или `useShallow` из `zustand/shallow`. *Автоматика:* нет, только в рантайме.
8. **Старая версия библиотеки** — `useQuery(key, fn, options)` и `cacheTime`. В TanStack Query v5 есть только объектная форма, а `cacheTime` переименован в `gcTime`. *Исправить:* `useQuery({ queryKey: ['instrument', symbol], queryFn: () => fetchInstrument(symbol), gcTime: 60_000 })`. Подумай, не нужен ли здесь на самом деле `staleTime` (сколько данные свежие), а не `gcTime` (сколько хранить неиспользуемый кеш). *Автоматика:* да — `tsc`: `Expected 1-2 arguments, but got 3`; отсюда же ошибка `Property 'name' does not exist on type '{}'`.
9. **Worklet и UI thread** — `flashColor` вызывается внутри `useAnimatedStyle`, но это обычная JS-функция. В рантайме: «Tried to synchronously call a non-worklet function on the UI thread». *Исправить:* директива `'worklet'` в `flashColor` или цвет через `interpolateColor`; если нужна именно JS-функция — `scheduleOnRN`. *Автоматика:* нет, ошибка в рантайме.
10. **Тест ничего не проверяет** — `expect(...quotes).toBeDefined()`. `quotes` равен `{}` с самого начала, поэтому тест пройдёт, даже если `setQuote` сломан. Ещё стор глобальный и не сбрасывается между тестами. *Исправить:* `expect(useQuoteStore.getState().quotes.BTCUSDT).toEqual({ s: 'BTCUSDT', p: '100.10', prev: '100.00' })`; сброс стора в `beforeEach`; сломай `setQuote` руками — тест должен упасть. *Автоматика:* покрытие не поймает — строки `setQuote` покрыты на 100%, а тест всё равно ничего не проверяет; поймает mutation testing.

★ **Бонус: деньги во float** — `parseFloat` и `toFixed(2)` для P&L. Двоичная плавающая точка даёт ошибки округления (`0.1 + 0.2 === 0.30000000000000004`), а `toFixed` — не бизнес-правило округления. *Исправить:* decimal (decimal.js) или целые минорные единицы и явное округление; P&L считает сервер, а клиентский — только оценка с пометкой «≈» ([тренинг 2](../02-trading-app-architecture/02-trading-app-architecture.md)).

**Итог.** `tsc` и ESLint целиком ловят 2 проблемы (6 и 8) и подсказывают про 5-ю. Остальное ловят только ревью человеком, запуск на симуляторе и mutation testing. Поэтому зелёных проверок мало — нужен ещё и внимательный ревьюер.
