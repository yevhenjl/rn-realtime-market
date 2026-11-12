#!/usr/bin/env bash
# PostToolUse: ESLint only on the edited .ts/.tsx file
INPUT=$(cat)
FILE=$(jq -r '.tool_input.file_path // empty' <<<"$INPUT")
case "$FILE" in
  *.d.ts) exit 0 ;;   # generated (src/uniwind-types.d.ts)
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac
cd "$(jq -r '.cwd' <<<"$INPUT")" || exit 0
if ! OUT=$(bunx eslint --max-warnings=0 "$FILE" 2>&1); then
  printf 'ESLint failed for %s:\n%s\n' "$FILE" "$(head -n 40 <<<"$OUT")" >&2
  exit 2   # Claude sees the errors and fixes them
fi
