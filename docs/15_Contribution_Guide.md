# 15 — Contribution Guide

**Related:** [13_Coding_Standards.md](13_Coding_Standards.md) · [14_Git_Workflow.md](14_Git_Workflow.md) · [11_Roadmap.md](11_Roadmap.md)

This document is the source for the repo-root `CONTRIBUTING.md` (that file is a trimmed copy with links back here).

---

## 1. Ways to contribute

Code, docs, themes, GFM-conformance fixtures, translations (post-i18n), triage, testing on uncommon platforms (Wayland compositors, ARM Windows, older macOS), a11y reports from real screen-reader users (especially valued — labeled `a11y`).

## 2. Development setup

Prereqs: Node ≥ 20 + pnpm ≥ 9, Rust stable (pinned by `rust-toolchain.toml`), platform webview deps (Linux: `libwebkit2gtk-4.1-dev` etc. — exact list in `docs/BUILD.md` per distro; Windows: WebView2 runtime, usually present; macOS: Xcode CLT).

```bash
git clone https://github.com/<org>/notepad-super-plus
cd notepad-super-plus
pnpm install
pnpm tauri dev        # run app (hot-reload frontend, rebuild rust on change)
pnpm test             # TS unit + conformance
cargo test --workspace
pnpm lint && pnpm typecheck
pnpm tauri build      # local production build
```

First-run troubleshooting lives in `docs/BUILD.md` (kept honest by a CI job that builds on a clean container using only that document's steps).

## 3. Finding work

- `good first issue` — scoped, mentored, with pointers to relevant files.
- `help wanted` — maintainer-desired, unclaimed.
- Roadmap board Now/Next columns ([11] governance).
- Comment to claim; claims expire silently after 14 days of inactivity — no shame, just unblocking.

## 4. Contribution rules (the short version)

1. Non-trivial change → issue first; feature-shaped change → check [00] §6 non-goals before investing.
2. Follow [13] standards; CI enforces most of it — run `pnpm lint && pnpm test` before pushing.
3. Tests accompany behavior changes; bug fixes include a regression test.
4. Keep PRs single-purpose and reviewable (< ~400 lines guideline).
5. Docs are code: user-visible changes update the relevant `/docs` page and settings/keymap references in the same PR.
6. Be kind in review — critique code, not people. Code of Conduct: Contributor Covenant 2.1 (`CODE_OF_CONDUCT.md`), enforced by maintainers, contact in file.

## 5. Review & merge

What reviewers check is public ([13] §8 checklist). Two outcomes always allowed: merge, or actionable feedback — "no because off-vision" links the principle it conflicts with. Response SLA and stale policy per [14] §4.

## 6. Communication

- GitHub Issues: bugs + concrete feature proposals (templates enforce repro info / problem statement).
- GitHub Discussions: questions, ideas-in-progress, show-and-tell (themes!), release feedback.
- No Discord/Slack initially — decisions must live where they're searchable. Revisit at contributor scale.

## 7. Governance

- **BDFL-lite:** founding maintainer decides on vision conflicts, bound publicly by [00] §4–6 — the non-goals list protects contributors from wasted work and maintainers from scope war.
- Maintainer invitation: sustained quality contributions + review participation; maintainers listed in `MAINTAINERS.md` with areas.
- License: MIT; inbound = outbound (no CLA — DCO sign-off `git commit -s` required instead).
- If the founding maintainer disappears for > 90 days, `MAINTAINERS.md` names the succession order — continuity is a feature.

## 8. Recognition

Contributors credited in every release note ([14] §7), `CONTRIBUTORS.md` auto-updated, first-time contributors welcomed by bot with links here. Theme authors credited in theme metadata shown in Settings.
