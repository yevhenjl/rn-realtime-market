#!/usr/bin/env bash
# Stop: typecheck + related tests for changed files before Claude says "done"
INPUT=$(cat)
[ "$(jq -r '.stop_hook_active' <<<"$INPUT")" = "true" ] && exit 0   # one attempt to fix
cd "$(jq -r '.cwd' <<<"$INPUT")" || exit 0
CHANGED=$(git diff --name-only HEAD -- '*.ts' '*.tsx')   # untracked new files are not included
[ -z "$CHANGED" ] && exit 0
if ! OUT=$(bunx tsc --noEmit --pretty false 2>&1); then
  printf 'Typecheck failed:\n%s\n' "$(head -n 40 <<<"$OUT")" >&2; exit 2
fi
# shellcheck disable=SC2086  # file list, names without spaces
if ! OUT=$(bunx jest --findRelatedTests $CHANGED --passWithNoTests 2>&1); then
  printf 'Tests failed:\n%s\n' "$(tail -n 40 <<<"$OUT")" >&2; exit 2
fi
