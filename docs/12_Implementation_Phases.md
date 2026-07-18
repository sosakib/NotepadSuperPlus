# 12 — Implementation Phases

**Related:** [11_Roadmap.md](11_Roadmap.md) · [01_Product_Requirements.md](01_Product_Requirements.md) · [10_Testing_Strategy.md](10_Testing_Strategy.md) · [20_Master_Project_Plan.md](20_Master_Project_Plan.md)

Twelve phases. Each lists objectives, deliverables, dependencies, acceptance criteria (AC — referencing requirement IDs), testing checklist, risks, and effort (1 senior engineer-week units; parallelizable phases noted). **No phase starts until its dependencies' ACs are green in CI.**

---

## Phase 1 — Architecture & Scaffold

- **Objectives:** repo bootstrap exactly per [03] §4; CI skeleton; ADR-0001 ratified.
- **Deliverables:** pnpm workspace + Tauri app booting blank shell on 3 OS; `ci.yml` with lint/typecheck/unit jobs; error taxonomy `NspError`; tracing + perf-mark plumbing; capability manifests (minimal); this docs set merged.
- **Depends on:** docs approval.
- **AC:** shell cold start < 400 ms (headroom rule); installer < 8 MB; CI green 3 OS; NFR-4 network audit harness runs (trivially passes).
- **Testing:** startup bench baseline recorded; scaffold unit-test examples both languages.
- **Risks:** Linux webview env issues in CI runners → *mitigate:* use `tauri-driver`-supported image early, not late.
- **Effort:** 3 ew.

## Phase 2 — Core Editor

- **Objectives:** CM6 integration, document lifecycle, open/save loop.
- **Deliverables:** `fs` module (read/write/atomic/encoding/EOL, FR-1.4/1.6); SourcePane + view LRU; documents/tabs stores (single tab OK); dirty tracking + close guard (FR-6.5); zoom/font/wrap/line numbers (FR-8.4/8.5); syntax highlighting for FR-1.2/1.3 file types.
- **Depends on:** 1.
- **AC:** FR-1.1–1.4, 1.6, FR-2.1, FR-8.1 (undo/multi-cursor/column via CM6), FR-8.4/8.5; typing latency budget green on 1 MB file; encoding matrix tests pass.
- **Testing:** encoding round-trips, atomic-save crash sim, undo-history specs.
- **Risks:** encoding edge cases (BOM-less UTF-16) → chardetng + explicit reopen-with-encoding menu.
- **Effort:** 4 ew.

## Phase 3 — Markdown Engine

- **Objectives:** worker pipeline, incremental block rendering, sanitization.
- **Deliverables:** `packages/markdown-core` (unified config + block splitter + hasher + line map); md.worker + shiki.worker; sanitizer schema + XSS corpus; GFM conformance suite wired.
- **Depends on:** 1 (parallel with 2).
- **AC:** FR-3.1, FR-3.2, FR-3.3, FR-3.8; conformance ≥ 90 % (95 % by Phase 11); incremental ≡ full-render property test green; worker parse p75 < 30 ms for changed-block on corpus docs.
- **Testing:** [10] §2 pipeline items; fuzz 1k iterations in CI.
- **Risks:** block-diff correctness (silent wrong renders) → property tests are the phase's centerpiece, built first.
- **Effort:** 5 ew.

## Phase 4 — File Explorer & Workspace

- **Objectives:** workspace scopes, tree, watcher, session.
- **Deliverables:** scope registry + validation ([07] §1); lazy tree index + FileTree UI (rename/delete/duplicate/move/DnD, FR-5.1/5.2); watcher with coalescing (FR-1.5, FR-5.5); recent files/workspaces (FR-5.3); tabs complete (FR-6.1/6.4); session restore ([06] §8).
- **Depends on:** 2.
- **AC:** FR-5.1–5.3, 5.5, FR-6.1, 6.4, 6.5; e2e journey 1 green; path-traversal corpus green; 10k-file workspace opens < 300 ms.
- **Testing:** watcher stress; scope symlink escapes; tree keyboard nav (APG).
- **Risks:** inotify limits, Wayland DnD quirks → polling fallback + DnD behind capability check.
- **Effort:** 5 ew.

## Phase 5 — Rendering Views

- **Objectives:** preview pane, split mode, outline.
- **Deliverables:** PreviewPane with virtualization + keyed patch; SplitContainer sync ([03] §3.3, FR-2.3/2.4); OutlinePanel (FR-4.1–4.3); mode switching + persistence (FR-2.6); preview link/checkbox delegation (checkbox write-back may land Phase 9 if tight).
- **Depends on:** 2 + 3.
- **AC:** FR-2.2–2.4, 2.6, FR-4.1–4.3; keystroke→preview < 150 ms p75; e2e journey 3 green; scroll sync bidirectional without feedback loops.
- **Testing:** sync state-machine unit tests; virtualization scroll-position stability; visual baselines established.
- **Risks:** scroll-sync jank on huge docs → interpolation + block-height cache; budget test in CI from day one.
- **Effort:** 5 ew.

## Phase 6 — Search

- **Objectives:** in-file find/replace; workspace search.
- **Deliverables:** FindBar (CM6 search, FR-7.1–7.3); Rust search engine + streaming events + cancellation ([06] §6); SearchPanel UI (FR-7.4).
- **Depends on:** 4.
- **AC:** FR-7.1–7.4; search budgets ([09] §1); Replace-All single undo; cancellation verified (CPU drops).
- **Testing:** option matrix; gitignore semantics; result-cap behavior.
- **Risks:** regex DoS via user patterns → Rust `regex` linear-time guarantees; size caps.
- **Effort:** 3 ew.

## Phase 7 — Settings & Commands

- **Objectives:** config subsystem, settings UI, command registry, palette, keymaps.
- **Deliverables:** TOML config load/validate/watch/write ([06] §7, FR-11.1/11.2); settings UI (searchable groups); command registry ([05] §4); CommandPalette (FR-10.4); keybindings.json + conflict detection (FR-10.7); native menus.
- **Depends on:** 2 (parallel with 5/6).
- **AC:** FR-10.4, FR-11.1/11.2; e2e journey 9; every shipped command palette-reachable (automated registry audit test).
- **Testing:** config fuzz (invalid TOML/values → fallback); keymap conflicts; palette fuzzy-match specs.
- **Risks:** settings schema churn → schema versioned from day one with migration hook.
- **Effort:** 4 ew.

## Phase 8 — Themes & Accessibility

- **Objectives:** token system, theme pack, a11y completion.
- **Deliverables:** token compiler (`packages/themes` → CSS vars); Dark/Light/HC (FR-10.1) + bundled pack (FR-10.2); Shiki/CM6 theme bridges; custom-theme loading (FR-10.3); a11y checklist [04] §10 executed; reduced-motion audit.
- **Depends on:** 5, 7.
- **AC:** FR-10.1–10.3, 10.5, 10.6; axe scan zero critical; contrast tests automated per theme; e2e journeys 7–8.
- **Testing:** visual matrix themes × platforms; NVDA/VoiceOver manual pass recorded.
- **Risks:** WebKitGTK rendering variance → conservative CSS baseline; Linux visual baselines separate.
- **Effort:** 3 ew.

## Phase 9 — Markdown Enhancements & Export

- **Objectives:** editing niceties + export.
- **Deliverables:** smart lists / pair-close / table nav / md commands ([05] §3, FR-8.2/8.3/8.8); checkbox write-back (FR-3.12); paste/drag image + asset protocol (FR-9.1/9.2, [07] §6); copy-as (FR-9.3); export HTML (FR-9.4); frontmatter panel polish.
- **Depends on:** 5, 7.
- **AC:** FR-8.2, 8.3; FR-9.4; e2e journeys 6, 10; extension behavior tables fully unit-covered.
- **Testing:** [10] §2 extension items; export sanitization equivalence.
- **Risks:** smart-list edge cases (nested mixed lists) → behavior table is the spec; ship table-driven tests first.
- **Effort:** 4 ew.

## Phase 10 — Hardening & Test Completion

- **Objectives:** close the test matrix; security pass.
- **Deliverables:** full e2e journey suite 3-OS; visual baselines reviewed; leak tests; network audit in CI (NFR-4); crash-draft recovery (FR-1.7); conflict flows polished ([06] §5); fuzz durations raised; external dependency audit clean.
- **Depends on:** all feature phases.
- **AC:** [10] §3 journeys 1–10 green 3-OS; leak plateau test green; XSS + path corpora green; zero high-severity audit findings.
- **Effort:** 4 ew.

## Phase 11 — Optimization

- **Objectives:** hit every budget with margin; GFM parity to 95 %.
- **Deliverables:** profiling passes (startup slices, worker, memory); bundle-size shave; large-file mode tuning; conformance deviations burned down; perf baselines locked for 1.0.
- **Depends on:** 10.
- **AC:** every [09] §1 budget green p75 on 3-OS nightly for 2 consecutive weeks; GFM ≥ 95 %.
- **Risks:** platform-specific regressions late → nightly 3-OS perf ran since Phase 5, so surprises are bounded.
- **Effort:** 3 ew.

## Phase 12 — Release

- **Objectives:** ship v1.0.
- **Deliverables:** signing/notarization pipeline; updater keys + flow ([08] §5); SBOM + attestations; release notes; docs site; README/screenshots/GIFs; store/package submissions (winget, Homebrew cask, AUR, Flathub — best effort); [18] checklist executed.
- **Depends on:** 11.
- **AC:** [18] all gates checked; clean-machine install test 3 OS; update v0.x→1.0 path verified.
- **Effort:** 3 ew.

---

## Effort & schedule model

Sum ≈ 46 engineer-weeks. Phases 2∥3 and 5∥6∥7 parallelize: with 2 engineers ≈ 6–7 months; solo ≈ 11–12 months — matching the v1.0 target in [11]. Buffer policy: each phase carries +20 % contingency inside its estimate; schedule slips are taken from scope (P1 deferrals), never from Phase 10/11.
