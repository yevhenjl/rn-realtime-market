---
description: Checks that the current branch is ready for a pull request
disable-model-invocation: true
---
## Changed files
!`git diff --stat HEAD`

## Steps
1. Run `bun run check` (typecheck, lint, tests) and `bunx expo install --check`.
2. If something fails, stop and report the errors. Do not fix anything without my OK.
3. Use the rn-reviewer subagent on the diff. Report its findings as they are.
4. Write a PR description: what changed, why, how it was tested, risks, what the AI generated. $ARGUMENTS

Do not commit, push or open the PR; only output the description.
