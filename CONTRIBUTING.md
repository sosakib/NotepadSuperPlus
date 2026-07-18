# Contributing to Notepad Super Plus

Thanks for your interest! This file is the short version; the full guide with rationale
is [docs/15_Contribution_Guide.md](docs/15_Contribution_Guide.md).

> **Status:** the project is in the implementation phase, Windows-first. See [ROADMAP.md](ROADMAP.md)
> for the current stage. Please align PRs with the active stage — features from later stages
> are usually declined until their stage opens.

## Quick start

```bash
git clone https://github.com/sosakib/NotepadSuperPlus
cd NotepadSuperPlus
pnpm install
pnpm tauri dev        # run the app (once Stage 1 lands)
pnpm test             # TS unit + conformance
cargo test --workspace
pnpm lint && pnpm typecheck
```

Windows build prerequisites are documented in `docs/BUILD.md` (added in Stage 1).

## Ground rules

1. **Issue first** for non-trivial work. Check [docs/00_Project_Vision.md](docs/00_Project_Vision.md) §6
   (non-goals) before proposing features — the project is deliberately Markdown-only.
2. **Follow the standards** in [docs/13_Coding_Standards.md](docs/13_Coding_Standards.md). CI enforces most of them.
3. **Tests accompany behavior changes**; bug fixes include a regression test.
4. **Small, single-purpose PRs** (< ~400 changed lines guideline).
5. **Docs are code** — update the relevant `docs/` page, `CHANGELOG.md`, and settings/keymap
   references in the same PR.
6. **Conventional Commits** ([docs/14_Git_Workflow.md](docs/14_Git_Workflow.md) §3). PR titles become the squash message.
7. **DCO sign-off** required: commit with `git commit -s`. No CLA.

## Branch model (gitflow-lite)

Work off `develop` via `feature/<slug>`; open the PR against `develop`. `main` is
release-only and protected. See [ROADMAP.md](ROADMAP.md) → *Branch & workflow model*.

## Review

Reviewers use the checklist in [docs/13_Coding_Standards.md](docs/13_Coding_Standards.md) §8.
Be kind — critique code, not people. By contributing you agree to the
[Code of Conduct](CODE_OF_CONDUCT.md).
