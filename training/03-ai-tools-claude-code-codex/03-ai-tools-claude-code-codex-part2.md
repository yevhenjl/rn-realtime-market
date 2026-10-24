# Современная разработка с AI-инструментами: Claude Code и Codex

Обновлено: 2026-10-21 · Тренинг 3 из 6 · ≈ 16 часов · Вакансия: [карточка](../../card.ru.md)

[Часть 1](03-ai-tools-claude-code-codex.md) · часть 2 из 4 · [часть 3](03-ai-tools-claude-code-codex-part3.md) · [часть 4](03-ai-tools-claude-code-codex-part4.md)

## Блок 3. Расширения: hooks, subagents, skills, MCP (2,5 ч)

**Цель.** Сделать сетап, где проверки запускаются сами, ревью идёт в чистом контексте, а агент видит документацию и симулятор.

**Что повторить** — четыре механизма ниже: hooks, subagents, skills, MCP.

### Hooks: проверки, которые выполняются всегда

Hook — твоя команда, которую Claude Code запускает на событии. В отличие от `CLAUDE.md`, это не просьба к модели: hook срабатывает всегда.

| Событие | Когда | Что даёт exit 2 |
|---|---|---|
| `SessionStart` | старт или resume сессии | stderr видит только пользователь |
| `UserPromptSubmit` | перед обработкой промпта | блокирует промпт |
| `PreToolUse` | перед вызовом инструмента | блокирует вызов |
| `PostToolUse` | после успешного вызова | stderr уходит Claude; правка уже сделана |
| `Stop` | Claude закончил ответ | Claude не останавливается и продолжает работу |
| `SubagentStop`, `PreCompact`, `Notification`, `SessionEnd` | см. reference | по-разному |

Это не весь список: есть ещё `PermissionRequest`, `FileChanged`, `WorktreeCreate` и другие ([hooks reference](https://code.claude.com/docs/en/hooks)).

- **Формат:** событие → группа с `matcher` → обработчики. `"matcher": "Edit|Write"` — точные имена инструментов; другие символы — regex. Поле `if` фильтрует по аргументам: `"if": "Bash(git *)"`.
- **Типы обработчиков:** `command`, `http`, `mcp_tool`, `prompt`, `agent`.
- **Вход:** JSON в stdin: `session_id`, `cwd`, `hook_event_name`, `tool_name`, `tool_input` (для Edit/Write — `file_path`).
- **Exit codes:** 0 — ок (JSON в stdout применяется); 2 — блок или обратная связь Claude (текст из stderr); другой код — ошибка, но **действие продолжается**. Exit 1 — не блок.
- **Где:** `~/.claude/settings.json`, `.claude/settings.json`, `.claude/settings.local.json`, managed, а также плагины и frontmatter skills и агентов. `/hooks` — просмотр. Settings перечитываются на лету.
- **Stop без зацикливания:** во входе есть `stop_hook_active` (`true`, если Claude уже продолжает из-за stop-хука). Плюс лимит: 8 продолжений подряд, счётчик сбрасывается, когда Claude вызывает инструмент.
- **Worktrees:** если Claude перешёл в worktree по ходу сессии (и в worktree-сессиях Desktop), `$CLAUDE_PROJECT_DIR` указывает на основную копию. Путь, где Claude работает сейчас, бери из `cwd` во входном JSON.
- Хуки выполняются с твоими правами. В чужом репозитории сначала прочитай `.claude/settings.json`.

Пример: после каждой правки — ESLint по файлу; в конце хода — `tsc` и тесты по изменённым файлам. Нужен `jq` (`brew install jq`).

`.claude/settings.json` (рядом с `permissions` из блока 2):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/lint-file.sh", "timeout": 60 }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/verify-turn.sh", "timeout": 300 }
        ]
      }
    ]
  }
}
```

`.claude/hooks/lint-file.sh`:

```bash
#!/usr/bin/env bash
# PostToolUse: ESLint только по изменённому .ts/.tsx файлу
INPUT=$(cat)
FILE=$(jq -r '.tool_input.file_path // empty' <<<"$INPUT")
case "$FILE" in *.ts|*.tsx) ;; *) exit 0 ;; esac
cd "$(jq -r '.cwd' <<<"$INPUT")" || exit 0
if ! OUT=$(npx eslint --max-warnings=0 "$FILE" 2>&1); then
  printf 'ESLint failed for %s:\n%s\n' "$FILE" "$(head -n 40 <<<"$OUT")" >&2
  exit 2   # Claude увидит ошибки и исправит
fi
```

`.claude/hooks/verify-turn.sh`:

```bash
#!/usr/bin/env bash
# Stop: typecheck + тесты по изменённым файлам перед тем, как Claude скажет «готово»
INPUT=$(cat)
[ "$(jq -r '.stop_hook_active' <<<"$INPUT")" = "true" ] && exit 0   # одна попытка починить
cd "$(jq -r '.cwd' <<<"$INPUT")" || exit 0
CHANGED=$(git diff --name-only HEAD -- '*.ts' '*.tsx')   # новые неотслеживаемые файлы не попадут
[ -z "$CHANGED" ] && exit 0
if ! OUT=$(npx tsc --noEmit --pretty false 2>&1); then
  printf 'Typecheck failed:\n%s\n' "$(head -n 40 <<<"$OUT")" >&2; exit 2
fi
# shellcheck disable=SC2086  # список файлов, имена без пробелов
if ! OUT=$(npx jest --findRelatedTests $CHANGED --passWithNoTests 2>&1); then
  printf 'Tests failed:\n%s\n' "$(tail -n 40 <<<"$OUT")" >&2; exit 2
fi
```

Не забудь `chmod +x .claude/hooks/*.sh`. Проверка `stop_hook_active` — компромисс: Claude получает одну попытку починить, дальше ты видишь всё сам в `/diff` и в CI. Почему `tsc` не в `PostToolUse`: он проверяет весь проект, и после каждой правки это медленно.

Готовый пример хуков от Anthropic — плагин `security-guidance` (`/plugin install security-guidance@claude-plugins-official`): проверяет код Claude на уязвимости при правке, в конце хода и при коммите. Это дополнительный слой, не гарантия; модельные проверки тратят лимиты.

### Subagents: отдельный контекст для ревью и исследований

Subagent — помощник со своим контекстным окном, своим системным промптом и своими правами. Наружу он возвращает только итог. Зачем:

- тяжёлое чтение и поиск не забивают твой основной контекст;
- ревью в **чистом** контексте: агент не «влюблён» в код, который сам написал;
- параллельные задачи.

Встроенные: `Explore` (быстрый поиск, только чтение), `Plan` (исследование в plan mode), general-purpose. Свои — файлы `.claude/agents/<name>.md` (проект) или `~/.claude/agents/` (все проекты). Обязательны `name` и `description`; полезны `tools`, `disallowedTools`, `model` (`sonnet`, `opus`, `haiku`, `fable`, `inherit`), `permissionMode`, `skills`, `mcpServers`, `hooks`, `memory`, `isolation: worktree`, `maxTurns`, `effort`. Claude сам выбирает агента по `description`; можно попросить явно, упомянуть через `@` или запустить сессию целиком: `claude --agent rn-reviewer`. Токены агента тоже тратят лимиты: для простых задач ставь `model: haiku` или `sonnet`.

`.claude/agents/rn-reviewer.md`:

```markdown
---
name: rn-reviewer
description: Reviews React Native / Expo diffs for bugs, performance and security. Use after a feature is implemented and before commit.
tools: Read, Grep, Glob, Bash
model: opus
---
You are a senior React Native reviewer for a trading app (Expo, TypeScript, Zustand, TanStack Query v5, Reanimated).
Review only the current diff (`git diff HEAD`) and the code it touches. Do not edit files.

Check in this order:
1. Correctness: logic, edge cases, error handling, races (stale responses, reconnects).
2. APIs and packages: every new import exists in package.json and node_modules; flag APIs you cannot find
   in the installed version (old TanStack Query or Zustand APIs, removed React Native APIs).
3. Effects: every subscription, timer and socket is cleaned up; dependency arrays are correct.
4. Re-renders: narrow Zustand selectors, useShallow for objects, high-frequency updates batched.
5. Reanimated: worklets call only worklets; JS work goes through scheduleOnRN.
6. Security: secrets, tokens in logs or URLs, input validation with Zod, only https:// and wss://.
7. Money: no float math for prices or P&L.
8. Tests: each test can fail; concrete assertions; the unit under test is not mocked.
9. Scope: nothing outside the task changed; no speculative abstractions.

Output: findings as "severity (blocker/major/minor) · file:line · problem · why it matters · fix in 1-2 lines".
Report only issues that affect correctness, security, performance or the requirements. Say when you are unsure.
```

Последний абзац важен: ревьюер, которого попросили «найти проблемы», найдёт их всегда. Если гоняться за каждой мелочью — получится over-engineering (так прямо пишет best practices Claude Code).

### Skills: инструкции и сценарии по запросу

Skill — папка с `SKILL.md`: `.claude/skills/<name>/SKILL.md` (проект) или `~/.claude/skills/<name>/` (все проекты). В каждую сессию грузится только описание; тело — когда skill нужен. Вызов — `/name` или автоматически, если запрос совпал с `description`. `disable-model-invocation: true` — только ручной вызов (для действий с побочными эффектами). `$ARGUMENTS` — текст после имени. `` !`команда` `` вставляет вывод команды до того, как Claude прочитает skill. Формат — открытый стандарт Agent Skills; Codex тоже умеет skills (вызов через `$name`).

`.claude/skills/pr-ready/SKILL.md`:

```markdown
---
description: Checks that the current branch is ready for a pull request
disable-model-invocation: true
---
## Changed files
!`git diff --stat HEAD`

## Steps
1. Run `npx tsc --noEmit`, `npx eslint . --max-warnings=0` and `npx jest --findRelatedTests` for the changed files.
2. If something fails, stop and report the errors. Do not fix anything without my OK.
3. Use the rn-reviewer subagent on the diff.
4. Write a PR description: what changed, why, how it was tested, risks, what the AI generated. $ARGUMENTS
```

### MCP: инструменты и данные извне

MCP (Model Context Protocol) — открытый протокол: сервер даёт агенту инструменты и данные (доки, сборки, симулятор, трекер задач).

- **Добавить:** `claude mcp add --transport http <name> <url>` (удалённый, рекомендуется); `claude mcp add <name> -- <команда> [args]` (локальный stdio-процесс). SSE устарел.
- **Scope:** `local` (по умолчанию: только ты и только этот проект), `project` (файл `.mcp.json` в репозитории; Claude спросит одобрения), `user` (все твои проекты). Флаг `--scope project`.
- **Управление:** `claude mcp list`, `claude mcp get <name>`, `claude mcp remove <name>`; в сессии `/mcp` — статус и вход по OAuth.
- **Контекст:** полные схемы инструментов грузятся только при использовании (tool search). Ответ инструмента больше 10 000 токенов — предупреждение; лимит по умолчанию — 25 000 (`MAX_MCP_OUTPUT_TOKENS`).
- **Безопасность:** подключай только серверы, которым доверяешь. Сервер, который читает внешний контент, может принести prompt injection. Simon Willison называет «смертельной триадой» сочетание: доступ к приватным данным + недоверенный контент + возможность отправить данные наружу. Не собирай все три в одной сессии.
- Если есть CLI (`gh`, `eas`) — часто он лучше MCP: дешевле по контексту, и Claude умеет им пользоваться.

Что полезно для mobile (проверено 2026-10-21):

| Инструмент | Что даёт | Подключение |
|---|---|---|
| Expo MCP | доки Expo, EAS builds и workflows, краши TestFlight, отзывы в сторах; локально (SDK 54+, `expo-mcp`): скриншоты iOS Simulator, тап по `testID`, логи, React Native DevTools | `claude mcp add --transport http expo https://mcp.expo.dev/mcp`, затем `/mcp` → вход. `search_documentation` требует платный план EAS |
| Maestro MCP | агент смотрит иерархию экрана на живом симуляторе, пишет и запускает Maestro flows | `claude mcp add maestro -- maestro mcp` (нужны Maestro CLI, Java 17+, запущенный эмулятор или симулятор) |
| Context7 | актуальная документация библиотек по версии | `https://mcp.context7.com/mcp`; в промпте — «use context7» |
| TypeScript LSP (плагин, не MCP) | диагностика типов сразу после правки, навигация по символам | `npm install -g typescript-language-server typescript`, затем `/plugin install typescript-lsp@claude-plugins-official` |
| iOS Simulator в Claude Desktop | агент запускает приложение и тапает по нему в панели симулятора (public beta, macOS, Xcode) | Desktop → Code → «Build the app and run it in the simulator…» |

Локальные возможности Expo MCP: `npx expo install expo-mcp --dev`, затем `EXPO_UNSTABLE_MCP_SERVER=1 npx expo start`, и переподключи MCP. Ограничения: одно подключение к dev-серверу, только iOS Simulator на macOS.

**Практика** (110 мин; ещё 40 — на «Что повторить»)

1. **Hook** (40 мин). Сначала сам напиши `lint-file.sh` по описанию, потом сверь с примером. Подключи оба хука. Попроси Claude добавить функцию с неиспользуемой переменной: в `eslint-config-expo` это warning, а `--max-warnings=0` делает его ошибкой. *Критерии:* ESLint-хук возвращает ошибку, Claude исправляет без твоей подсказки; намеренная ошибка типов ловится Stop-хуком; `/hooks` показывает оба; правка с хуком занимает меньше 10 секунд.
2. **Reviewer subagent** (30 мин). 10 минут пиши свою версию агента без примера. Потом сравни и доработай. Сделай дифф с двумя багами: эффект без cleanup и P&L на float. Попроси: «Use the rn-reviewer subagent on my diff». *Критерии:* найдены оба бага, формат вывода как в промпте, нет «шума» про стиль.
3. **Skill `/pr-ready`** (20 мин). *Критерии:* `/pr-ready` запускает проверки, при ошибке останавливается, при успехе выдаёт описание PR; Claude не запускает skill сам.
4. **MCP** (20 мин). Подключи Expo MCP (нет аккаунта Expo — Context7) и задай вопрос по документации текущего SDK. Подключи Maestro MCP и попроси flow «приложение открылось, виден главный экран». *Критерии:* `/mcp` показывает подключение; `maestro test .maestro/<flow>.yaml` проходит.

**Самопроверка**

- Чем hook отличается от правила в `CLAUDE.md`? Что будет при exit 1 в `PreToolUse`?
- Почему `PostToolUse` не может «отменить» правку? Как сделать, чтобы правка не случилась?
- Как Stop-хук защищается от бесконечного цикла?
- Когда subagent, а когда skill? Почему ревью лучше делать в отдельном контексте?
- Чем scope `project` у MCP отличается от `local`? Что такое «смертельная триада»?

**Готово, когда…** в песочнице работают 2 хука, агент-ревьюер, skill и 1–2 MCP-сервера, и ты объясняешь, почему каждый из них нужен.

## Блок 4. Масштаб: headless, CI, worktrees, контекст и стоимость (1,5 ч)

**Цель.** Запускать агента из скриптов и CI, параллелить задачи без конфликтов и держать расходы под контролем.

**Что повторить** — четыре темы ниже: headless и SDK, GitHub и CI, worktrees, контекст и стоимость.

### Headless и Agent SDK

```bash
claude -p "Explain what src/shared/ws does"                        # один запрос и выход
claude -p "Run the tests and fix failures" --allowedTools "Read,Edit,Bash(npx jest *)" --max-turns 5
claude -p "List API endpoints" --output-format json | jq -r '.result'
git diff main...HEAD | claude -p "Review this diff for React Native bugs. Report blockers only."
claude --bare -p "Summarize README.md" --allowedTools "Read"       # без хуков, skills, CLAUDE.md, MCP
```

- `--output-format`: `text`, `json` (есть `result`, `session_id`, `total_cost_usd`), `stream-json`. `--json-schema` — ответ по JSON Schema.
- `--permission-mode dontAsk` — отклонить всё, что не разрешено заранее; `--max-turns`, `--max-budget-usd 2.00` — ограничители.
- `claude -p` стартует в Manual: вызовы, которым нужно подтверждение, отклоняются, если их не разрешили через `--allowedTools`.
- `--bare` рекомендован для скриптов и CI: одинаковый результат на любой машине. Нужен `ANTHROPIC_API_KEY`.
- **Безопасность:** без `--bare` запуск `claude -p` выполняет хуки из `.claude/settings.json` и подключает серверы из `.mcp.json` репозитория — даже в папке, которой ты не доверял, и без диалога. Для чужих PR в CI — только `--bare` и явный конфиг.
- **Agent SDK** — тот же цикл агента как библиотека: `npm install @anthropic-ai/claude-agent-sdk` или `pip install claude-agent-sdk`, функция `query({ prompt, options: { allowedTools, permissionMode } })`.

### GitHub и ревью в CI

- `/install-github-app` (нужны `gh auth login` и права админа репозитория) ставит Claude GitHub App, кладёт секрет `ANTHROPIC_API_KEY` или `CLAUDE_CODE_OAUTH_TOKEN` (из `claude setup-token`) и открывает PR с workflow.
- `anthropics/claude-code-action@v1`: без `prompt` отвечает на `@claude` в комментариях; с `prompt` работает по событию (PR, cron).
- **Code Review** (managed, планы Team и Enterprise): несколько агентов ищут баги, шаг проверки отсекает ложные срабатывания, комментарии с severity; `@claude review` в PR; правила — `REVIEW.md`. Не апрувит и не блокирует PR.
- Локально на любом плане — `/code-review`; глубже — `/code-review ultra` (облако, 15–25 минут; на Pro и Max 3 бесплатных запуска, дальше обычно $5–25 за ревью в usage credits).

Ревью каждого PR через плагин `code-review` (пример из документации):

```yaml
name: Code Review
on:
  pull_request:
    types: [opened, synchronize, ready_for_review, reopened]
jobs:
  review:
    runs-on: ubuntu-latest
    permissions: { contents: read, pull-requests: read, issues: read, id-token: write }
    steps:
      - uses: actions/checkout@v7
        with: { fetch-depth: 1 }
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          plugin_marketplaces: "https://github.com/anthropics/claude-code.git"
          plugins: "code-review@claude-code-plugins"
          prompt: "/code-review:code-review --comment ${{ github.repository }}/pull/${{ github.event.pull_request.number }}"
          claude_args: '--allowedTools "mcp__github_inline_comment__create_inline_comment"'
```

Расходы в CI: минуты GitHub Actions + токены. Ограничивай `--max-turns` в `claude_args`, таймаутами job и `concurrency`.

### Worktrees: параллельные задачи без конфликтов

```bash
claude --worktree feature-banner     # .claude/worktrees/feature-banner/, ветка worktree-feature-banner
claude -w fix-lint                   # во втором терминале — вторая задача
claude --worktree feature-banner --resume
git worktree add ../ai-lab-chart -b feature/chart   # вручную, если нужна своя ветка или папка
```

- Добавь `.claude/worktrees/` в `.gitignore`. Неотслеживаемые файлы вроде `.env` копируй через `.worktreeinclude` (синтаксис `.gitignore`).
- При выходе: чистый worktree удаляется (у безымянной сессии — сам); с изменениями — Claude спросит, оставить ли.
- Subagent в своём worktree: `isolation: worktree` во frontmatter. `/batch <инструкция>` делит большую правку на 5–30 частей, каждая — в своём worktree.
- **React Native:** worktree — новая копия без `node_modules`: `npm install` в каждой. Второй Metro — на другом порту: `npx expo start --port 8082`. Нативные сборки на каждый worktree тяжёлые — держи один dev client.

### Контекст и стоимость

По документации, в компаниях Claude Code стоит в среднем около $13 на разработчика в активный день и $150–250 в месяц; у 90% пользователей — меньше $30 в день. На подписке это лимиты плана; `/usage` показывает, что их съедает.

- `/clear` между несвязанными задачами. После двух неудачных исправлений подряд — `/clear` и новый, точный промпт.
- `/compact <фокус>` перед длинной задачей; `/context` — что занимает окно; `/btw` — вопрос мимо истории.
- Тяжёлое чтение (логи, поиск по коду, доки) — в subagent.
- `CLAUDE.md` до 200 строк; редкое — в skills и правила с `paths:`. Лишние MCP-серверы — выключи в `/mcp`.
- Модель под задачу: Sonnet для рутины, Opus для сложной архитектуры; `/effort` ниже для простого. Смена модели посреди сессии сбрасывает кеш промпта — первый запрос после смены дороже.
- Конкретный промпт («добавь валидацию в `parseQuote` в `src/shared/ws/parse.ts`») дешевле расплывчатого («улучши код»).
- `Esc` — остановить сразу, если агент пошёл не туда; plan mode — меньше переделок.
- В CI: `--max-turns`, `--max-budget-usd`, таймауты.

**Практика** (60 мин; ещё 30 — на «Что повторить»)

1. **Скрипт ревью** (20 мин). `scripts/ai-review.sh`: дифф ветки против `main` → `claude -p` с `--append-system-prompt` (роль RN-ревьюера) и `--output-format json` → `jq -r '.result, .total_cost_usd'`. *Критерии:* скрипт печатает список находок и стоимость запуска; работает без интерактивных вопросов.
2. **Два worktree** (25 мин). Параллельно: A — `formatPrice` + тесты; B — правка, которую предложил ESLint. Обе ветки — коммит и merge в `main`. *Критерии:* нет конфликтов; оба worktree удалены или осознанно оставлены; ты знаешь, где лежат файлы.
3. **Диета контекста** (15 мин). `/context` до и после: перенеси один раздел `CLAUDE.md` в правило с `paths:` или в skill. *Критерии:* память занимает меньше токенов, поведение агента не изменилось.

★ По желанию (вне таймера): workflow с `anthropics/claude-code-action@v1` на тестовом репозитории.

**Самопроверка**

- Чем `--bare` отличается от обычного `claude -p`? Почему это важно для чужих PR?
- Как ограничить расходы одного запуска в CI?
- Что нужно сделать в worktree React Native-проекта перед запуском?
- 5 привычек, которые экономят контекст и деньги. Какая даёт больше всего?

**Готово, когда…** у тебя есть скрипт ревью, ты провёл две задачи параллельно и знаешь, сколько стоит твоя типичная сессия.

## Блок 5. Codex: CLI, IDE, cloud, AGENTS.md, sandbox, review (1,5 ч)

**Цель.** Уверенно работать с Codex как со вторым агентом и «вторым мнением» на ревью.

**Что повторить** — четыре темы ниже: поверхности и установка; `AGENTS.md`; sandbox и approvals; запуск без интерфейса, ревью и облако.

### Что такое Codex и где он работает

Агент OpenAI для кода. Поверхности: CLI (`codex`), расширение для IDE (VS Code, Cursor, Windsurf; у JetBrains и Xcode — свои интеграции), десктоп-приложение ChatGPT, Codex cloud (задачи в облачных окружениях), GitHub (`@codex review`), SDK и GitHub Action `openai/codex-action@v1`.

```bash
npm install -g @openai/codex          # или: brew install --cask codex
codex                                 # первый запуск: Sign in with ChatGPT
```

- Codex входит в планы ChatGPT (Free, Go, Plus, Pro, Business, Enterprise / Edu) с лимитами. С API-ключом — оплата по API, но без облачных функций (ревью на GitHub, Slack).
- Модель и effort — `/model`. На 2026-10-21 docs рекомендуют `gpt-6.1-sol` для сложных агентных задач и `gpt-6-luna` для простых массовых. Проверь список у себя в `/model`.
- Полезные команды: `/init` (создать `AGENTS.md`), `/permissions`, `/plan`, `/review`, `/diff`, `/compact`, `/resume`, `/fork`, `/mcp`, `/skills`, `/hooks`, `/status`, `/import` (перенос настроек из Claude Code или Cursor).

### AGENTS.md в Codex

Codex собирает цепочку инструкций один раз за запуск:

1. Глобально: `~/.codex/AGENTS.override.md`, иначе `~/.codex/AGENTS.md` (берётся первый непустой).
2. Проект: от корня (обычно git root) вниз до текущей папки. В каждой папке — максимум один файл: `AGENTS.override.md` → `AGENTS.md` → имена из `project_doc_fallback_filenames`.
3. Файлы склеиваются от корня к текущей папке: ближний — позже и важнее. Лимит — `project_doc_max_bytes` (32 KiB по умолчанию).

Один источник правды для двух агентов: перенеси общее из `CLAUDE.md` в `AGENTS.md`, а в `CLAUDE.md` оставь импорт и то, что нужно только Claude:

```markdown
@AGENTS.md

## Claude Code
- Use plan mode for changes in more than 2 files.
- Run the rn-reviewer subagent before saying "done".
```

Для ревью PR в GitHub Codex читает раздел `## Code Review Rules` в ближайшем к коду `AGENTS.md`. Пиши мало правил и только то, что не ловит CI:

```markdown
## Code Review Rules
- Flag float arithmetic on prices, quantities or P&L.
- Flag effects that subscribe (WebSocket, AppState, NetInfo, timers) without cleanup.
- Flag new dependencies that are not installed via `npx expo install` or have a non-permissive license.
- Flag tokens or keys in source code, logs or URLs.
```

### Sandbox и approvals

В Codex по умолчанию работает **песочница на уровне ОС** (macOS Seatbelt, Linux и WSL2 — bubblewrap, Windows — нативная). В Claude Code основа другая: правила прав и классификатор auto mode; OS-песочница для Bash включается отдельно (`/sandbox`).

| Пресет | Как задать | Что значит |
|---|---|---|
| Auto (для git-репозитория) | `--sandbox workspace-write --ask-for-approval on-request` | читает, правит и запускает в рабочей папке; сети нет; за пределы песочницы — с вопросом |
| Read-only | `--sandbox read-only --ask-for-approval on-request` | только чтение |
| Read-only CI | `--sandbox read-only --ask-for-approval never` | без вопросов, только чтение |
| Auto-review | `approvals_reviewer = "auto_review"` + `on-request` | запросы на выход из песочницы проверяет агент-ревьюер, а не ты |
| Full access | `--dangerously-bypass-approvals-and-sandbox` (`--yolo`) | без песочницы и вопросов — только в изолированной VM |

Политики approvals: `on-request`, `never`, `granular`. `untrusted` выведен — удали его из старых конфигов. Сеть в `workspace-write` выключена: включай только при необходимости (риск prompt injection). Проектные `.codex/` (config, hooks, rules) грузятся, только если ты доверяешь проекту.

`~/.codex/config.toml`:

```toml
model = "gpt-6.1-sol"              # проверь актуальное имя в /model
model_reasoning_effort = "medium"
sandbox_mode = "workspace-write"
approval_policy = "on-request"

[sandbox_workspace_write]
network_access = false

[mcp_servers.expo]
url = "https://mcp.expo.dev/mcp"   # затем: codex mcp login expo
```

То же через CLI: `codex mcp add expo --url https://mcp.expo.dev/mcp`; stdio-сервер: `codex mcp add maestro -- maestro mcp`.

### Без интерфейса, ревью и облако

- `codex exec "<задача>"` — без TUI, для скриптов и CI. По умолчанию **read-only**; правки — `--sandbox workspace-write`. `--json` — поток событий JSONL, `-o <file>` — последнее сообщение в файл, `--output-schema <file>` — ответ по JSON Schema, `codex exec resume --last`. `--full-auto` больше нет.
- В CI: `CODEX_API_KEY=<key> codex exec --json "..."` или `openai/codex-action@v1`. Не клади API-ключ в переменные всего job, если job запускает код из репозитория.
- `/review` в CLI — пресеты: против base-ветки, незакоммиченные изменения, один коммит, свои инструкции. Рабочее дерево не меняется. Без TUI: `codex review --uncommitted`, `codex review --base main`, `codex review --commit <sha>`.
- GitHub: подключи репозиторий, включи автоматическое ревью или пиши `@codex review` в PR. Codex отмечает только проблемы P0 и P1. `@codex fix the P1 issue` запускает облачную задачу с исправлением.
- Codex cloud: окружение (репозитории, установка зависимостей, переменные, ограниченный список сетевых адресов) → задачи идут параллельно, пока ноутбук спит → смотришь дифф и тесты → PR.
- Ещё есть hooks (`.codex/hooks.json` или `[hooks]` в `config.toml`; события `PreToolUse`, `PostToolUse`, `Stop` и др.; exit 2 блокирует; хуки нужно одобрить в `/hooks`), skills, subagents и worktrees в десктоп-приложении.

**Практика** (60 мин; ещё 30 — на «Что повторить»)

1. **Установка и AGENTS.md** (25 мин). Установи Codex, запусти `/init` в песочнице. Перенеси общие правила из `CLAUDE.md` в `AGENTS.md`; в `CLAUDE.md` оставь `@AGENTS.md` и специфичное. Спроси оба агента: «Какие команды проверки в этом проекте?» *Критерий:* оба называют одни и те же `tsc`, ESLint и Jest.
2. **Песочница** (15 мин). В Read-only попроси Codex создать файл; в Auto — выполнить `curl https://example.com`. *Критерии:* видишь запрос на выход из песочницы; объясняешь, какой пресет для локальной работы, CI и облака.
3. **Второе мнение** (20 мин). Возьми дифф из блока 3 (или новый с 2–3 багами). Запусти `codex review --uncommitted` и в Claude Code `/code-review`. *Критерий:* таблица «нашли оба / только Codex / только Claude / ложные срабатывания» и твой вердикт по каждой находке.

**Самопроверка**

- Как Codex собирает `AGENTS.md`? Что делает `AGENTS.override.md`?
- Чем пресет Auto отличается от Full access? Где включается сеть?
- Чем песочница Codex отличается от прав в Claude Code?
- Как сделать ревью незакоммиченных изменений без TUI? Что такое P0 и P1 в ревью на GitHub?

**Готово, когда…** Codex настроен на тот же проект, `AGENTS.md` общий для двух агентов, и ты сравнил два ревью одного диффа.

## Блок 6. Cursor: короткий обзор и сравнение (0,5 ч)

**Цель.** Знать Cursor настолько, чтобы честно сказать: «каждый день не использую, но перейду быстро», — и объяснить почему.

**Что повторить**

- **Что это:** IDE на базе VS Code с AI. **Tab** — автодополнение; **Agent** — агент с режимами Agent, Ask, Plan и Debug; checkpoints (локальные снимки, отдельно от git); окно агентов.
- **Правила:** `.cursor/rules/*.mdc` с frontmatter `description`, `globs`, `alwaysApply`. Типы: Always Apply, Apply Intelligently (по `description`), Apply to Specific Files (по `globs`), Apply Manually (через `@rule`). Ещё User rules и Team rules (планы Team и Enterprise). `AGENTS.md` в корне и подпапках тоже поддерживается.
- **Bugbot:** ревью PR (баги, безопасность, качество). Автоматически или комментарием `cursor review` / `bugbot run`. Контекст — `.cursor/BUGBOT.md`. Autofix запускает Cloud Agent. Оплата по использованию.
- Ещё: Cloud agents, CLI, MCP, hooks, skills. Расширения Claude Code и Codex ставятся и в Cursor.
- Детали прав агента (автозапуск команд, allowlist) я в документации не проверял — уточни, если спросят глубже.

| | Claude Code | Codex | Cursor |
|---|---|---|---|
| Форма | агент: терминал, IDE, Desktop, web | агент: CLI, IDE, desktop, cloud | IDE с агентом и Tab |
| Правила | `CLAUDE.md`, `.claude/rules/`, импорт `AGENTS.md` | `AGENTS.md`, `AGENTS.override.md` | `.cursor/rules/*.mdc`, `AGENTS.md` |
| План | plan mode | `/plan` | Plan mode |
| Безопасность | allow / ask / deny, режимы, auto mode, опциональная OS-песочница | OS-песочница по умолчанию + approvals | checkpoints; права — уточнить |
| Расширения | hooks, subagents, skills, MCP, plugins | hooks, subagents, skills, MCP, plugins | rules, hooks, skills, MCP |
| Параллель | worktrees, background agents, cloud | cloud tasks, worktrees | cloud agents, окно агентов |
| Ревью PR | `/code-review`, GitHub Action, Code Review | `/review`, `@codex review` | Bugbot |

Главная мысль для интервью: концепции общие — файл правил, план, цикл агента, MCP, ревью. Переход между инструментами — дни, а не недели.

**Практика** (20 мин; ещё 10 — на «Что повторить»)

1. **Правило для Cursor** (10 мин). Перепиши `.claude/rules/testing.md` в `.cursor/rules/testing.mdc`: `globs` на тесты, `alwaysApply: false`. *Критерий:* frontmatter верный; ты объясняешь, какой это тип правила.
2. **Сравнение вслух** (10 мин). Расскажи таблицу за 60 секунд, запиши на телефон. *Критерий:* есть отличие каждого инструмента и общий вывод.

**Самопроверка**

- Какие 4 типа правил в Cursor? Почему `.md` в `.cursor/rules` не сработает?
- Чем Bugbot похож на `@codex review` и managed Code Review?
- Что ты ответишь на «у нас Cursor, а ты на Claude Code»?

**Готово, когда…** ты за минуту сравниваешь три инструмента и не путаешь их файлы правил.

---

Дальше: [часть 3 — workflow на одной фиче, риски, глубокое ревью AI-кода](03-ai-tools-claude-code-codex-part3.md)
