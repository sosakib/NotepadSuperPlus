# Performance Report — Notepad Super Plus

**Date:** 2026-07-21 · **Budgets (docs/09):** < 500 ms cold start · < 150 MB idle RAM · < 15 MB installer · 100 MB files without freezing

## Architecture (why it's fast)

- **Markdown renders in a Web Worker** — parse/sanitize/stringify never touch the UI thread; requests are debounced (90 ms) and version-stamped so stale results are dropped.
- **CodeMirror owns document text** — React stores hold only metadata; no document copies on the render path.
- **Word/char stats computed in the worker**, not per keystroke on the UI thread.
- **Large-file plan** — above 4 MB, cosmetic per-line decorations (active-line/match highlight) are dropped to protect typing latency; hard 512 MB open cap with binary sniffing.
- **Lazy workspace tree** — children load per-directory on expand; huge folders open instantly.
- **Search in Rust** — `ignore` walker + linear-time `regex`, off the IPC thread via `spawn_blocking`, with match (2000), file-size (4 MB), and preview (200 ch) caps.
- **Lazy language grammars** — only Markdown ships in the startup bundle; other grammars dynamic-import per file type.
- **Release profile** — `opt-level="s"`, LTO, single codegen unit, `panic=abort`, stripped.

## Measured This Audit

| Metric | Value | Notes |
|--------|-------|-------|
| Frontend JS (main) | 1.14 MB raw (~330 KB gz est.) | CodeMirror + unified + React |
| Markdown worker | 357 KB raw | isolated chunk, loaded once |
| `dist/` payload | 10.4 MB → **2.46 MB** | ~8 MB of sourcemaps were being embedded into the installer — production sourcemaps now disabled |
| Installers | NSIS 4.4 MB · MSI 5.1 MB | well under the 15 MB budget (and built *before* the sourcemap fix — the next build shrinks further) |
| Unit tests | 72 frontend + 25 Rust, all green | vitest 82 s (jsdom-dominated), cargo 0.2 s |
| Dev startup marks | script-eval → interactive ≈ 230 ms (dev server, unminified) | production will be faster; formal bench harness remains a Stage-10 deliverable |

## Optimizations Applied

1. **Frontend payload −8 MB (10.4 → 2.46 MB)**: production sourcemaps disabled (`vite.config.ts`) — they were quadrupling the embedded frontend.
2. **Config-write churn eliminated**: settings persistence subscribed to *every* store change, so each keystroke/cursor move armed a debounced TOML write. Unchanged snapshots now bail before the timer; disk writes happen only when a persisted field actually changes.
3. **Watcher leak fixed**: closing a file now unwatches it — long sessions no longer accumulate watches or spurious `fs:changed` events.
4. **Render pipeline hardening added zero cost**: the two new rehype steps are O(nodes) passes inside the existing worker walk.

## Known Non-Issues (checked, left alone)

- `renderController` keeps a single pending request — only the active document renders, so cross-document starvation can't occur in practice.
- Recent-files JSON rewrite on every open is ≤ 20 paths — negligible.
- `body.style.zoom` for app zoom is a cheap Chromium-native path on the WebView2 target.

## Remaining Recommendations

- Stand up the Stage-10 bench harness (startup phases are already instrumented via `performance.mark` + `tracing` on the Rust side) and record cold start / idle RAM / 100 MB-file numbers on real hardware in CI.
- Consider `manualChunks` to split `@codemirror/language-data` metadata if the main chunk grows further.
