# 09 — Performance Strategy

**Related:** [01_Product_Requirements.md](01_Product_Requirements.md) §12 · [03_System_Architecture.md](03_System_Architecture.md) §3 · [10_Testing_Strategy.md](10_Testing_Strategy.md) §5

Performance is a P0 feature with hard budgets. Every budget below is CI-benchmarked; a regression beyond tolerance blocks merge.

---

## 1. Budgets (reference hardware: 4-core / 8 GB / SATA SSD; p75 unless noted)

| Metric | Budget | Tolerance (CI fail) |
|---|---|---|
| Cold start → interactive editor | < 500 ms | +10 % vs baseline |
| Warm start (session restore, 5 tabs) | < 700 ms | +10 % |
| Idle RAM (5 tabs, 1 workspace) | < 150 MB | +15 MB |
| Typing latency, 1 MB file | < 16 ms p95 | any p95 > 16 ms |
| Typing latency, 100k-line file | < 33 ms p95 | any p95 > 33 ms |
| Keystroke → preview update (split) | < 150 ms p75 | +20 % |
| Open 100 MB file → first paint | < 2 s | +20 % |
| Main-thread freeze | never > 100 ms | any long-task > 100 ms during scripted session |
| Workspace search, 10k files | first results < 200 ms, complete < 3 s | +25 % |
| Installer size | < 15 MB Win/Linux | +1 MB |

## 2. Startup plan (< 500 ms)

Startup is decomposed and each slice owned:

| Slice | Budget | Technique |
|---|---|---|
| Process + webview init | ~150 ms | Tauri defaults; no plugins beyond needed set; single window |
| First HTML/CSS paint | ~100 ms | Inline critical CSS; shell renders skeleton before JS |
| JS boot → editor interactive | ~200 ms | Code-split: boot bundle = shell + CM6 + stores only. **Deferred:** Shiki, KaTeX, Mermaid, settings UI, export, workspace search UI — dynamic `import()` on first use |
| Session restore | ~50 ms | Active tab only; other tabs hydrate on activation ([06] §8) |

Rules: no synchronous IPC during boot; config read is one command; fonts are system (no webfont fetch); tree-shaking verified via bundle-size CI report (budget per chunk).

## 3. Memory plan (< 150 MB)

- CM6 view instances: LRU cap 8; inactive tabs hold serialized state (string + positions), not live views ([05] §2.1).
- Preview DOM: virtualized — off-screen blocks unmounted beyond overscan ([03] §3.4).
- Shiki: singleton highlighter, grammars/themes lazy-loaded, LRU cap 20 grammars.
- Workspace tree: Rust-side index, UI holds expanded nodes only ([07] §5).
- Search results: capped at 5k rendered rows (banner: "refine query"), full count still reported.
- Worker memory: markdown worker recycled if heap > 256 MB (observed via `performance.memory` where available / periodic restart on threshold docs).
- Leak discipline: every subscription/watcher/timer registered with a disposer; e2e leak test opens/closes 200 tabs and asserts heap plateau ([10] §5).

## 4. Markdown pipeline performance

- **Block-level incrementality** ([03] §3.2): per-keystroke cost ∝ changed block size, not document size. Block hash = xxhash of raw block text + options fingerprint.
- Worst case (edit inside 10 MB single code fence): fence content windows into sub-chunks for hashing; Shiki depth-limited > 4 MB blocks (plain rendering + notice).
- Parse runs in worker; response is transferable-friendly (strings); main thread work = DOM patch only.
- Virtualized preview renders viewport ± 1 screen; block heights cached for stable scrollbar.
- Shiki batched: max 4 concurrent highlight jobs; results cached by content hash ([05] §6).

## 5. Editor performance

- CM6 handles 100k+ lines natively (rope + viewport rendering). Our obligations: extensions must be viewport-scoped (decorations via `ViewPlugin` with `visibleRanges`), never whole-doc scans on transaction.
- Extension perf review is a PR checklist item ([13] §8): any per-transaction work must be O(change) or viewport-bounded.
- Large-file mode trims ([03] §3.4) are automatic and reversible.

## 6. Rust-side performance

- Search: `ignore` parallel walker (all cores), `regex` (linear-time), `memmap2` for large files, early-abort on cancellation token; results batched (50) to cap event overhead ([06] §6).
- File reads: 1 MB chunk streaming; UI paints at first chunk.
- Watcher: debounced, coalesced, bulk-collapse ([07] §4) — a `git checkout` of 5k files produces 1 UI event.
- All commands `spawn_blocking` for disk work — the IPC thread never blocks.

## 7. Measurement infrastructure

- `scripts/bench/`: startup timer (spawn → window-visible → first-input-accepted, via tracing spans + webview performance marks), typing-latency harness (synthetic keystroke → DOM commit), memory sampler, search benchmark corpus (generated 10k-file tree), large-file corpus (generated 1/10/100 MB documents — checked in as generators, not blobs).
- CI job `perf` runs the suite on Linux runner per PR (relative regression vs baseline JSON committed on main); full 3-OS run nightly ([10] §7).
- `tracing` spans in Rust + `performance.mark` in UI share a session id → merged flame timeline via script for investigations.
- Baselines re-recorded only via explicit `perf-baseline` PR label with justification.

## 8. Performance anti-patterns (lint/review-enforced)

Whole-store Zustand subscriptions in hot components; unkeyed preview lists; synchronous `invoke` in event handlers on the typing path; per-keystroke IPC; unmemoized selectors feeding `<VirtualList>`; CSS animating layout properties in editor area ([04] §6); regex with user input executed on main thread.
