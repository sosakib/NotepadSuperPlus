<!--
PR title MUST be a Conventional Commit (it becomes the squash message):
  feat(editor): add smart list continuation
  fix(search): stop leaking cancellation tokens
Types: feat fix perf refactor docs test build ci chore revert   (append ! for breaking)
Target the `develop` branch (gitflow-lite). See ROADMAP.md and docs/14_Git_Workflow.md.
-->

## What & why

<!-- What does this change and why? Link the issue. -->
Closes #

## Stage

<!-- Which ROADMAP stage does this belong to? Work outside the active stage is usually deferred. -->
Stage:

## Checklist

- [ ] CI is green (lint, typecheck, `clippy -D`, `fmt --check`, tests)
- [ ] New/changed behavior is covered by tests; bug fixes include a regression test
- [ ] Hot path touched? → perf note + bench delta included (docs/09)
- [ ] New IPC command? → input validation, scope check, docs/16 catalog updated, security note (docs/08 §3)
- [ ] User-visible strings go through the `t()` shim; UX writing per docs/04 §8
- [ ] Accessibility: keyboard path + labels for any new interactive element
- [ ] Docs updated (relevant `docs/` page, settings/keymap reference, `CHANGELOG.md`)
- [ ] No new dependency without justification (docs/13 §7)
- [ ] Commits signed off (`git commit -s`, DCO)

## Screenshots / recordings

<!-- Required for any UI change. Before/after where relevant. -->
