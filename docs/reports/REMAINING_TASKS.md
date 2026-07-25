# Remaining Tasks to Reach v1.0

> **Addendum, 2026-07-26.** Two of the four blockers below are now closed and one has
> changed shape. **B3 (session restore) is implemented and verified.** **B1 is measured
> and partly closed**: boot JavaScript is down 82 % and in-page startup ~23 %, but the
> **< 500 ms budget turns out to be unreachable** — ~950 ms elapses before the first line
> of this codebase runs (binary load + Tauri/WebView2 init), while our own setup body
> costs 2–7 ms. Full attribution and recommended replacement budgets:
> [STARTUP_PERFORMANCE.md](STARTUP_PERFORMANCE.md). A bench harness now exists at
> `scripts/bench/startup.ps1`, so §2's "no regression guard" no longer holds.
> **B2 and B4 are untouched.** Everything else below stands as written on 2026-07-21.

**Audit date:** 2026-07-21 · **Branch audited:** `develop` @ `e65fa14` · **Method:** full folder walk, all 22 `docs/` files + 6 root reports read, source grepped for each claimed feature, all gates re-run independently.

---

## 1. Verified Current State

Everything below was **re-run or grepped during this audit**, not taken from a report.

| Check | Result |
|---|---|
| `pnpm lint` | ✅ clean |
| `pnpm typecheck` | ✅ clean |
| `pnpm test` | ✅ **77 passed / 13 files** |
| Rust tests (`#[test]` count) | ✅ **25** across config/fs/fsops/lib/search |
| Working tree | ✅ clean, no uncommitted diffs |
| Installers | ✅ NSIS 4.4 MB · MSI 5.1 MB (**budget < 15 MB**) |
| Idle memory | ✅ ~31–37 MB (**budget < 150 MB**) |
| Cold start | ❌ **~1.8–2.5 s measured** (**budget < 500 ms**) |

**Stages complete:** 0 (repo), 1 (build), 2 (shell), 3 (editor), 4 (rendering), 5 (filesystem), 6 (explorer), 7 (search), 9 (settings persistence) — plus an unplanned UI/UX redesign, a security-hardening pass, and a performance/polish pass.

**Stage 8 is entirely absent** — grep for `smartList|autoPair|tableNav|toggleTask|pasteImage` across `src/editor` and `src/commands` returns **zero matches**.

---

## 2. Blockers for v1.0 (must fix)

### 🔴 B1 — Cold start is 4–5× over budget
The product's headline promise is "launches instantly." Measured **1.8–2.5 s**; budget is **< 500 ms**.
- No bench harness exists (`scripts/` contains only `README.md`), so there is no regression guard.
- Main JS chunk is **1.14 MB raw / ~330 KB gzip** — CodeMirror + unified + React all load eagerly.
- **Tasks:** build `scripts/bench/` (startup, typing latency, memory sampler); attribute the 1.8 s across process/WebView2/JS-boot; lazy-load the editor and non-critical UI; re-measure; wire a CI budget check.
- **Effort:** ~1 week. **This is the single largest remaining risk.**

### 🔴 B2 — Two P0 rendering requirements unimplemented
- **FR-3.2 Syntax highlighting in fenced code blocks (Shiki)** — grep: no `shiki`. Code blocks render unstyled-plain. Marked **P0** in `docs/01`.
- **FR-3.3 Frontmatter panel** — grep: no frontmatter handling. YAML frontmatter currently renders as body text or a stray table. Marked **P0**.
- **Effort:** ~4 days combined (Shiki must run in the existing worker with lazy grammars, or it will make B1 worse).

### 🔴 B3 — Session restore missing (FR-6.4, P0)
Closing and reopening the app loses all open tabs, cursor positions, and view modes. `docs/06 §8` specifies snapshot + restore; grep finds no session store. Settings persist, documents do not.
- **Effort:** ~2 days (Rust `session.json` + restore-on-boot, lazy hydration of non-active tabs).

### 🔴 B4 — No end-to-end tests (Stage 12)
`tests/` contains only `README.md`. `docs/10 §3` defines **10 release-blocking journeys**; none are automated. Every file-dialog path (open/save/save-as/folder-pick) is currently verified only by unit tests, never clicked.
- **Effort:** ~1 week (WebdriverIO + tauri-driver, the 10 journeys, wire into CI).

---

## 3. Stage-by-Stage Remaining Work

### Stage 8 — Professional Editing Features (**not started**)
| Task | Req | Notes |
|---|---|---|
| Smart lists (Enter continues `-`/`1.`/`- [ ]`, Tab in/outdent, renumber) | FR-8.3 P0 | Behaviour table in `docs/05 §3` is the spec |
| Auto-close Markdown pairs (`**`, `_`, `` ` ``, `[`, `(`) | FR-8.2 P0 | |
| Table Tab-navigation + pipe auto-format | FR-8.8 P1 | |
| Checkbox toggle in preview writes back to source | FR-3.12 P1 | Must round-trip through CM so undo works (`docs/06 §9`) |
| Paste/drag image → save to `assets/` + insert link | FR-9.1/9.2 P1 | Needs the `nsp-asset://` protocol handler (`docs/07 §6`) — not built |
| Formatting commands (bold/italic/heading/link) + snippets | FR-8.x | Palette-registered, undo-grouped |
**Effort:** ~1 week.

### Stage 10 — Performance (**not started**)
Beyond B1: no memory-leak test (200-tab plateau), no large-file benchmark (100 MB open < 2 s), no watcher stress test, no locked baselines. `docs/09 §7` specifies the whole harness.
**Effort:** ~1 week (overlaps B1).

### Stage 11 — Security Hardening (**partially done**)
Done in the audit pass: sanitizer hardened (DOM clobbering, input constraint, class allowlist), Windows filename validation, watcher leak closed, `pnpm audit`/`cargo audit` clean.
| Remaining | Notes |
|---|---|
| **CodeQL disabled** | Requires a **public repo or GitHub Advanced Security**; currently `workflow_dispatch` only |
| **Network-audit CI test** | `NFR-4` (zero telemetry) is a *promise* with no automated proof — `docs/08 §7` requires a CI test failing on any non-IPC socket |
| Standalone XSS corpus file | Tests exist inline; `docs/10 §4` wants a grow-only `tests/security/xss-corpus` |
| `cargo deny` (licenses/advisories) | Not wired into CI |
**Effort:** ~3 days (+ your decision on repo visibility).

### Stage 12 — Testing (**mostly missing**)
| Remaining | Notes |
|---|---|
| 10 e2e journeys (B4) | Release-blocking per `docs/10 §3` |
| Accessibility automation (axe-core) | Manual fixes were made; nothing prevents regression |
| **GFM conformance suite** | `specifications/` **does not exist**; `docs/10 §4` requires CommonMark+GFM fixtures and a ≥ 95 % parity gate. Parity is currently **unmeasured** |
| Coverage floors in CI | `docs/13` sets TS ≥ 80 % / Rust ≥ 85 %; not enforced |
| Visual regression baselines | Not set up |
| Screen-reader pass (NVDA) | Never run |
**Effort:** ~1.5 weeks.

### Stage 13 — Windows Packaging (**largely done**)
Done: real `release.yml`, NSIS + MSI, shell integration (file associations, Explorer context menu, single-instance, CLI opens), sourcemaps excluded from the payload.
| Remaining | Notes |
|---|---|
| **Code signing** | Installers are **unsigned** → SmartScreen warns every user. Requires a purchased certificate — **your action**, cannot be automated |
| Auto-updater | Designed (`docs/08 §5`) but not implemented; needs signing keys first |
| SBOM + checksums + attestations | `docs/18 §4` release-gate items |
| Portable build | FR-11.4 |
| Clean-machine install test | Never performed |
**Effort:** ~3 days once a certificate exists.

### Stage 14 — Release Candidate (**not started**)
Screenshots, demo GIF, release notes, docs-site pass, full `docs/18` gate, manual matrix (Win 10 + 11, HiDPI, IME, 200 % zoom), soak.
**Effort:** ~1 week.

### Stage 15 — v1.0 (**not started**)
Tag `v1.0.0`, publish, architecture freeze, post-mortem, open the macOS milestone.
**Effort:** ~3 days.

---

## 4. Feature Gaps Outside the Stage Plan

Requirements from `docs/01` with **no implementation** (grep-verified):

| Feature | Req | Priority |
|---|---|---|
| Math (KaTeX, `$…$` / `$$…$$`) | FR-3.4 | P1 |
| Mermaid diagrams | FR-3.5 | P1 |
| GitHub callouts (`> [!NOTE]`) | FR-3.6 | P1 — **CSS already exists in `markdown.css` but nothing emits it** |
| Emoji shortcodes | FR-3.7 | P1 |
| `[TOC]` generation | FR-3.11 | P1 |
| Export PDF + Print | FR-9.5 | P1 |
| Crash-draft recovery | FR-1.7 | P1 — unsaved work is lost on hard crash |
| Auto-save | Stage 5 scope | — |
| Reopen closed tab / pinned tabs / tab drag-reorder | FR-6.2/6.3 | P1 |
| Explorer drag & drop | FR-5.2 | P0 (rest of FR-5.2 done) |
| Favourites / pinned files | FR-5.4 | P1 |
| Workspace replace | FR-7.5 | P1 |
| Search streaming + cancellation | `docs/06 §6` | Deferred from Stage 7 |
| Keymap remapping UI + `keybindings.json` | FR-10.7 | P1 — Shortcuts tab is **read-only** |
| Custom theme JSON loading | FR-10.3 | P1 |
| Settings import/export | FR-11.3 | P1 |
| Minimap, Zen mode, RTL | FR-8.6/8.7 | P1/P2 |

---

## 5. Known Defects & Debt

| # | Issue | Impact |
|---|---|---|
| D1 | **Fonts not bundled** — `Inter`/`Geist`/`JetBrains Mono` are named in the token stack but no font files ship. Most Windows machines silently fall back to Segoe UI/Consolas | Designed typography never renders |
| D2 | **Theme cycle reaches only 4 of 9 themes** — the rail button rotates `system→dark→light→high-contrast`; the other five are Settings-only | Minor UX inconsistency |
| D3 | **Dead CSS** — `.markdown-alert*` styles exist for callouts that nothing emits (see FR-3.6) | Harmless, but ships unused bytes |
| D4 | **Branch protection absent** — classic protection and rulesets are Pro-gated on private repos; `main` is directly pushable | Process risk |
| D5 | **GFM parity unmeasured** — the ≥ 95 % target has no measurement | Unknown conformance |
| D6 | **Stale report** — `UI_UX_Progress_Report.md` claims "6/6 test files, 25/25 tests" (actual: 13/77) and "Esc dismissal across all modals" which was untrue when written (fixed later) | Misleading if trusted |

---

## 6. Recommended Order

Dependency-ordered, not priority-ordered — later items assume earlier ones.

1. **B1 — startup performance + bench harness** (~1 wk) — biggest risk; everything else adds weight on top, so measure and fix first.
2. **B2 — Shiki + frontmatter** (~4 d) — P0 rendering gaps; do *after* the harness so their cost is visible.
3. **B3 — session restore** (~2 d) — most-noticed missing behaviour in daily use.
4. **Stage 8 — editing features** (~1 wk) — what makes it feel like a real Markdown editor.
5. **P1 rendering batch** — callouts, math, Mermaid, emoji, TOC (~1 wk).
6. **B4 + Stage 12 — e2e, a11y, GFM conformance** (~1.5 wk).
7. **Stage 11 remainder** — network audit, cargo-deny, CodeQL (~3 d).
8. **Stage 13 — signing, updater, SBOM** (~3 d, gated on your certificate).
9. **Stages 14–15 — RC soak, v1.0** (~1.5 wk).

**Total: roughly 7–8 focused engineer-weeks to a defensible v1.0.**

---

## 7. Decisions Needed From You

| # | Decision | Why it's blocking |
|---|---|---|
| 1 | **Code-signing certificate** — buy one (~$100–400/yr) or ship unsigned with a SmartScreen warning? | Blocks Stage 13, the updater, and any real distribution |
| 2 | **Repo visibility / plan** — go public, buy GitHub Pro, or stay private? | Unlocks branch protection **and** CodeQL; both are currently impossible |
| 3 | **Bundle the fonts?** — self-host `Inter`/`Geist` woff2 (keeps offline guarantee, adds ~200 KB) or drop them from the token stack? | D1; affects every user's perception of the design |
| 4 | **Scope for v1.0** — ship with the P1 batch (math/Mermaid/callouts) or cut them to v1.1? | Changes the timeline by ~1 week |
| 5 | **Parallel tooling** — will other agents write to this folder again? | Two writers already collided once; uncommitted work can be lost |

---

## 8. What Is Genuinely Solid

Worth stating plainly, so effort goes where it's needed:

- **Architecture holds up** — UI → typed IPC → pure Rust modules; CodeMirror owns text, the worker owns HTML. No layering violations found.
- **Security posture is real** — sanitization in the worker, exports as safe as the preview, atomic writes, trash-only deletes, no remote resources, linear-time search regex, 0 audit vulnerabilities.
- **The hard correctness bugs are fixed** — the concurrent-save race, the per-keystroke document copy, silent data loss on dirty close.
- **Installer size and memory are comfortably inside budget** — only startup misses.
