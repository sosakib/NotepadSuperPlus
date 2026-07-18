# Notepad Super Plus — Master Execution Roadmap

**Strategy:** Windows-first to a production-ready v1.0, then a separate macOS migration milestone.
**Architectural rule:** no Windows-only hacks — cross-platform design, Windows-only *implementation target*. Every abstraction that touches the OS is written so macOS/Linux slot in later with minimal effort.

**Governing documents:** the ratified architecture lives in [`docs/`](docs/); start at [docs/20_Master_Project_Plan.md](docs/20_Master_Project_Plan.md). This roadmap is the *execution* view (stage gates); the docs are the *design* view. Where the execution prompt refined a design decision, the affected doc carries an "Execution refinement" note.

**Stage gate discipline (applies to every stage):** a stage is *done* only when — clean architecture upheld · zero compiler warnings · zero lint warnings · tests green · docs updated (CHANGELOG + ROADMAP + affected architecture docs) · committed with Conventional Commit messages · acceptance criteria met. No stage begins before the prior stage's exit criteria pass **and** the maintainer approves.

**Difficulty scale:** ●○○○○ trivial → ●●●●● hard. **Duration:** solo senior-engineer estimate.

---

## Branch & workflow model (execution decision)

Per the execution prompt, this project uses **gitflow-lite**:

- `main` — protected, always releasable, tagged releases only.
- `develop` — integration branch; features merge here first.
- `feature/*`, `release/*`, `hotfix/*` — short-lived.
- Protect `main` (+ `develop`): require PR, require CI green, squash-merge preferred, linear history.
- SemVer tags `vX.Y.Z`.

> **Refinement note:** [docs/14_Git_Workflow.md](docs/14_Git_Workflow.md) originally specified pure trunk-based (no `develop`). This roadmap's gitflow-lite supersedes it for execution; doc 14 has been annotated accordingly. Both are internally consistent — this is a deliberate, recorded choice, not drift.

## Repository layout (execution decision)

Standard Tauri-flat layout at repo root: `src/` (React/TS frontend) + `src-tauri/` (Rust core), with `docs/ assets/ design/ scripts/ tests/ .github/`.

> **Refinement note:** [docs/03_System_Architecture.md](docs/03_System_Architecture.md) §4 originally specified a pnpm monorepo (`apps/desktop`, `packages/markdown-core`, `packages/themes`). We start flat and extract `packages/` **only if/when** `markdown-core` needs independent testing/publishing (revisit at Stage 4). Doc 03 §4 has been annotated. Rationale: avoid monorepo overhead before there is a second package to justify it.

---

## Phase A — Windows (Stages 0–15)

### Stage 0 — Repository Initialization  ●○○○○
- **Goals:** a repository that already looks like a mature OSS project; no application code.
- **Deliverables:** private GitHub repo `NotepadSuperPlus`; MIT `LICENSE`; `README`, `CHANGELOG`, `ROADMAP`, `CONTRIBUTING`, `SECURITY`, `CODE_OF_CONDUCT`, `MAINTAINERS`, `CONTRIBUTORS`; `.gitignore`; `.github/` (4 issue templates + PR template + `dependabot.yml` + `ci.yml`/`codeql.yml`/`release.yml` placeholders + `config.yml`); scaffold dirs (`src/ src-tauri/ assets/ design/ scripts/ tests/`); Discussions enabled; Projects board; Milestones; branch protection; `develop` branch.
- **Required docs:** all 21 `docs/` verified integrated; this ROADMAP.
- **Required tests:** `ci.yml` scaffold-check job (verifies required files present) passes.
- **Performance goals:** n/a.
- **Acceptance:** repo exists private; structure matches this doc; CI green on first PR; branch protection active.
- **Exit criteria:** maintainer approves roadmap → Stage 1 unlocked.
- **Risks:** repo-settings automation limits (some settings are API-only) → apply via `gh api` where CLI lacks a verb.
- **Dependencies:** none.
- **Duration:** ~1 day.

### Stage 1 — Workspace & Build System  ●●○○○
- **Goals:** toolchain installed and wired; app launches as an empty window; nothing more.
- **Deliverables:** Rust stable (pinned `rust-toolchain.toml`) + Tauri 2 + React + TS + Vite + pnpm; `tauri.conf.json`; dev + prod build scripts; minimal capability manifest; `tracing` + web `performance.mark` plumbing stubs.
- **Required docs:** `docs/BUILD.md` (Windows prereqs: WebView2, MSVC toolchain); update CHANGELOG.
- **Required tests:** CI: `pnpm lint`, `pnpm typecheck`, `cargo fmt --check`, `cargo clippy -D warnings`, `pnpm build`, `cargo build` all green.
- **Performance goals:** empty-shell cold start **< 400 ms** (headroom reserved for features — [docs/09](docs/09_Performance_Strategy.md)).
- **Acceptance:** `pnpm tauri dev` opens a window; `pnpm tauri build` produces a Windows binary; CI green.
- **Exit criteria:** startup baseline recorded in `scripts/bench`.
- **Risks:** Tauri/WebView2 env setup friction → documented in BUILD.md, CI uses a known-good runner image.
- **Dependencies:** Stage 0. **Duration:** ~3 days.

### Stage 2 — Core Application Shell  ●●○○○
- **Goals:** app chrome with no Markdown yet.
- **Deliverables:** title bar, menus, status bar, sidebar placeholder, command-palette placeholder, theme engine (token → CSS var, dark/light/HC), keyboard manager + command registry skeleton, view routing (source/preview/split shells empty).
- **Required docs:** update [docs/04](docs/04_UI_UX_Guidelines.md)/[docs/05](docs/05_Component_Design.md) if contracts shift; CHANGELOG.
- **Required tests:** component tests for primitives (Button, Tree, Tooltip, Menu, Dialog), theme switching, command-registry audit (every command palette-reachable), axe scan of shell states.
- **Performance goals:** cold start still **< 500 ms**; idle RAM tracked.
- **Acceptance:** themes switch; palette opens; keyboard-only navigation of chrome works; a11y zero-critical.
- **Exit criteria:** shell stable, no editor yet. **Difficulty ●●○○○ · Duration ~1 wk.**
- **Risks:** WebKit/WebView2 CSS variance (Windows: WebView2 only, but keep baseline conservative for portability).
- **Dependencies:** Stage 1.

### Stage 3 — Markdown Editor Engine  ●●●○○
- **Goals:** real editing via CodeMirror 6.
- **Deliverables:** CM6 host, per-tab view LRU, undo/redo, multi-cursor, column selection, tabs, word wrap, line numbers, zoom, font config, syntax highlighting for the supported non-MD file types (FR-1.2/1.3), large-file trims scaffold.
- **Required docs:** [docs/05](docs/05_Component_Design.md) §2.1/§3 kept current; CHANGELOG.
- **Required tests:** editor-extension unit tables ([docs/10](docs/10_Testing_Strategy.md) §2), typing-latency bench (1 MB & 100k-line).
- **Performance goals:** typing latency **< 16 ms p95** (1 MB), **< 33 ms p95** (100k lines).
- **Acceptance:** open/edit/save a `.md`; huge file stays responsive; CI + benches green.
- **Exit criteria:** editing solid, no preview. **Difficulty ●●●○○ · Duration ~1 wk.**
- **Risks:** encoding edge cases → covered by matrix tests (moved earlier with FS in Stage 5; interim in-memory only).
- **Dependencies:** Stage 2.

### Stage 4 — Markdown Rendering Engine  ●●●●○
- **Goals:** faithful GitHub-style rendering + split view + outline.
- **Deliverables:** `markdown-core` unified pipeline (remark→rehype→sanitize) in a Web Worker; block-level incremental render + block hashing + line map; Shiki worker; preview pane with virtualization; split view with leader/follower scroll sync; outline (Structure View); frontmatter panel.
- **Required docs:** [docs/03](docs/03_System_Architecture.md) §3, [docs/06](docs/06_Data_Flow.md) §2–3; CHANGELOG. **Monorepo revisit checkpoint** (extract `packages/` or stay flat — decide here).
- **Required tests:** GFM conformance (≥ 90 %); **incremental ≡ full-render** property test; sanitizer XSS corpus (zero survivors); scroll-sync unit tests; keystroke→preview bench.
- **Performance goals:** keystroke → preview **< 150 ms p75**; no main-thread parse.
- **Acceptance:** e2e journey 3 (heading → outline → navigate; bidirectional sync) green; XSS corpus green.
- **Exit criteria:** three modes work end-to-end. **Difficulty ●●●●○ · Duration ~1.5 wk.**
- **Risks:** incremental-render correctness (silent wrong output) → property tests built *before* features.
- **Dependencies:** Stage 3.

### Stage 5 — Filesystem  ●●●○○
- **Goals:** robust local file I/O in the Rust core (webview touches no fs).
- **Deliverables:** open/save/save-as, atomic writes, encoding + EOL detect/convert (full matrix), recent files, workspace scopes, file watcher with coalescing, external-change conflict flow, crash-draft snapshots.
- **Required docs:** [docs/07](docs/07_File_System_Architecture.md), [docs/16](docs/16_API_Design.md) fs commands; CHANGELOG.
- **Required tests:** encoding round-trips, atomic-save crash sim, scope/path-traversal corpus, watcher stress/coalescing.
- **Performance goals:** open 100 MB file → first paint **< 2 s**; 10k-file workspace open **< 300 ms**.
- **Acceptance:** e2e journey 1 (open→edit→save→relaunch→restored); path corpus green.
- **Exit criteria:** no data-loss paths. **Difficulty ●●●○○ · Duration ~1 wk.**
- **Risks:** ReadDirectoryChangesW quirks, atomic rename across volumes → same-dir temp + copy-fallback.
- **Dependencies:** Stage 3 (parallelizable with Stage 4).

### Stage 6 — Explorer  ●●●○○
- **Goals:** workspace sidebar.
- **Deliverables:** lazy virtualized tree, create/rename/delete(trash)/duplicate/move, drag & drop, favorites/pins, live watcher refresh, outline panel integration.
- **Required docs:** [docs/05](docs/05_Component_Design.md) §2.4, [docs/07](docs/07_File_System_Architecture.md) §5; CHANGELOG.
- **Required tests:** tree keyboard nav (WAI-ARIA APG), DnD, 10k-node virtualization, rename collisions.
- **Performance goals:** tree ops < 16 ms; memory within budget on 100k-file workspaces.
- **Acceptance:** full file management via keyboard + pointer; e2e green.
- **Exit criteria:** explorer production-quality. **Difficulty ●●●○○ · Duration ~1 wk.**
- **Risks:** Wayland DnD (deferred — Windows target); Windows shell edge cases → tested on Win 10/11.
- **Dependencies:** Stage 5.

### Stage 7 — Search System  ●●●○○
- **Goals:** in-file + workspace search/replace.
- **Deliverables:** find bar (case/word/regex, replace/replace-all single-undo); Rust workspace search (ripgrep-style `ignore`+`regex`, streaming results, cancellation, gitignore-aware); heading/link/tag search hooks.
- **Required docs:** [docs/06](docs/06_Data_Flow.md) §6, [docs/16](docs/16_API_Design.md) search; CHANGELOG.
- **Required tests:** option matrix, gitignore semantics, cancellation (CPU drops), regex-DoS safety.
- **Performance goals:** first results **< 200 ms**, complete 10k files **< 3 s**.
- **Acceptance:** e2e journey 5 (stream → open match → highlight).
- **Exit criteria:** search fast + correct. **Difficulty ●●●○○ · Duration ~4 days.**
- **Risks:** pathological regex → Rust `regex` linear-time + size caps.
- **Dependencies:** Stage 6.

### Stage 8 — Professional Editing Features  ●●●○○
- **Goals:** the Markdown-authoring niceties.
- **Deliverables:** smart lists, auto-pair-close, table Tab-nav + format, checkbox toggle write-back, image paste/drag + `nsp-asset://` protocol, formatting commands, basic snippets, shortcut coverage.
- **Required docs:** [docs/05](docs/05_Component_Design.md) §3, [docs/07](docs/07_File_System_Architecture.md) §6; CHANGELOG.
- **Required tests:** extension behavior tables (full), checkbox round-trip, asset-scope safety.
- **Performance goals:** all extensions viewport-scoped, no per-keystroke whole-doc scans.
- **Acceptance:** e2e journeys 6 & 10; behavior tables fully covered.
- **Exit criteria:** authoring feels polished. **Difficulty ●●●○○ · Duration ~1 wk.**
- **Risks:** nested-list edge cases → table-driven tests are the spec.
- **Dependencies:** Stages 4 + 5.

### Stage 9 — Settings  ●●○○○
- **Goals:** configuration surface + theme pack.
- **Deliverables:** TOML config (load/validate/watch/write, hot-reload, fallback-on-invalid), searchable settings UI, keymap remapping + conflict detection, bundled theme pack (GitHub/Nord/Dracula/Catppuccin/Solarized), import/export, portable mode.
- **Required docs:** [docs/04](docs/04_UI_UX_Guidelines.md) §4/§9, settings + keymap reference, CHANGELOG.
- **Required tests:** config fuzz (invalid → fallback+warn), keymap conflicts, theme contrast (WCAG AA) per theme.
- **Performance goals:** config apply < 50 ms; no startup regression.
- **Acceptance:** e2e journey 9 (UI↔TOML two-way); contrast tests green.
- **Exit criteria:** fully configurable. **Difficulty ●●○○○ · Duration ~1 wk.**
- **Risks:** schema churn → versioned schema + migration hook from day one.
- **Dependencies:** Stages 2 + 7.

### Stage 10 — Performance Optimization  ●●●●○
- **Goals:** hit every budget with margin.
- **Deliverables:** startup slicing, memory profiling + leak fixes, large-file tuning, preview virtualization tuning, worker recycling, `scripts/bench` suite complete, baselines locked.
- **Required docs:** [docs/09](docs/09_Performance_Strategy.md) baselines; CHANGELOG.
- **Required tests:** full budget suite ([docs/09](docs/09_Performance_Strategy.md) §1), 200-tab leak plateau, watcher stress.
- **Performance goals:** **all** budgets green p75 (cold < 500 ms, idle < 150 MB, latencies, search, installer).
- **Acceptance:** budgets green on Windows nightly for 2 consecutive weeks.
- **Exit criteria:** no budget in the red. **Difficulty ●●●●○ · Duration ~1 wk.**
- **Risks:** late regressions → benches run since Stage 3, so surprises bounded.
- **Dependencies:** Stages 3–9.

### Stage 11 — Security Hardening  ●●●○○
- **Goals:** enforce the security model.
- **Deliverables:** strict CSP, sanitizer finalization, fs scope-validation audit, `cargo audit`/`deny` + `pnpm audit` clean, CodeQL green, network-audit CI test (zero non-IPC sockets), threat-model validation ([docs/08](docs/08_Security_Model.md) §1).
- **Required docs:** [docs/08](docs/08_Security_Model.md); `SECURITY.md`; CHANGELOG.
- **Required tests:** XSS + path corpora (zero survivors), network audit, dependency audits.
- **Acceptance:** all security gates green; zero high-severity findings.
- **Exit criteria:** threat table mitigations verified. **Difficulty ●●●○○ · Duration ~4 days.**
- **Risks:** sanitizer bypass class → corpus grows on every report, never shrinks.
- **Dependencies:** Stage 4 (validated here comprehensively).

### Stage 12 — Testing  ●●●●○
- **Goals:** close the full test matrix.
- **Deliverables:** unit/integration/e2e (Windows), accessibility (axe + NVDA scripted pass), performance, regression, visual baselines; flaky-test policy enforced; coverage floors met.
- **Required docs:** [docs/10](docs/10_Testing_Strategy.md); CHANGELOG.
- **Required tests:** all 10 e2e journeys green on Windows; coverage floors (TS ≥ 80 % / Rust ≥ 85 % on core modules).
- **Acceptance:** release-blocking journeys green; NVDA pass recorded.
- **Exit criteria:** test matrix complete. **Difficulty ●●●●○ · Duration ~1 wk.**
- **Risks:** e2e flakiness → quarantine-and-fix policy, no silent retries.
- **Dependencies:** Stages 1–11.

### Stage 13 — Windows Packaging  ●●●○○
- **Goals:** shippable Windows artifacts + release pipeline.
- **Deliverables:** NSIS `.exe` + `.msi`, portable build, app icons, code-signing *placeholders* (Authenticode wiring documented, key ceremony deferred), updater design (implement or defer with ADR), `release.yml` real pipeline, SemVer wiring, SBOM + checksums.
- **Required docs:** [docs/18](docs/18_Release_Checklist.md); CHANGELOG; ROADMAP.
- **Required tests:** clean-machine install test (Win 10 + 11), update-path test.
- **Performance goals:** installer **< 15 MB**.
- **Acceptance:** installers build in CI on tag; install on clean Windows works.
- **Exit criteria:** one command → signed-ready installers. **Difficulty ●●●○○ · Duration ~1 wk.**
- **Risks:** signing cert procurement (business step) → placeholders unblock everything else.
- **Dependencies:** Stage 12.

### Stage 14 — Release Candidate  ●●○○○
- **Goals:** RC polish.
- **Deliverables:** docs review, README polish + screenshots + demo GIF, release notes, bug-fix sweep, perf + a11y validation.
- **Required docs:** README, CHANGELOG, all `docs/` current; CHANGELOG.
- **Required tests:** full [docs/18](docs/18_Release_Checklist.md) §2 gate + manual matrix §3 (Windows).
- **Acceptance:** RC tagged `v1.0.0-rc.1`; no P0/P1 open.
- **Exit criteria:** RC survives soak with no blockers. **Difficulty ●●○○○ · Duration ~1 wk.**
- **Dependencies:** Stage 13.

### Stage 15 — Version 1.0  ●●○○○
- **Goals:** ship Windows v1.0.
- **Deliverables:** tag `v1.0.0`; production release; architecture freeze; post-mortem; macOS roadmap prepared.
- **Required docs:** release notes; post-mortem; [docs/11](docs/11_Roadmap.md) updated; CHANGELOG finalized.
- **Required tests:** full [docs/18](docs/18_Release_Checklist.md) release gate.
- **Acceptance:** all P0 requirements ([docs/01](docs/01_Product_Requirements.md)) shipped + verified; every budget green.
- **Exit criteria:** `v1.0.0` published. **Difficulty ●●○○○ · Duration ~3 days.**
- **Dependencies:** Stage 14.

---

## Phase B — macOS Migration (milestone, **not started until Windows v1.0**)

Preparation only now — no implementation. Deliverables when unlocked: platform-abstraction review, compatibility checklist, signing checklist (Developer ID), notarization checklist, packaging checklist (`.dmg` universal), testing checklist (VoiceOver, WKWebView rendering parity), performance comparison vs Windows. Tracked under a dedicated `macOS Migration` GitHub milestone opened at v1.0.

---

## Effort summary

Phase A ≈ 13–15 engineer-weeks (Windows-only cuts the 3-OS QA tail from the original 46-ew cross-platform estimate). Solo ≈ 3.5–4 months to Windows v1.0. Milestones map 1:1 to GitHub Milestones; each stage = a GitHub Project column and a set of issues.
