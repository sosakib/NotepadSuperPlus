# Startup Performance — Measurement and Findings

**Date:** 2026-07-26 · **Blocker:** B1 · **Budget:** < 500 ms cold start (docs/09 §2)
**Machine:** Windows 11, the development machine. Absolute numbers are machine-specific;
the *attribution* is what matters.

---

## Summary

**The < 500 ms budget is not reachable by this application, and never was.** ~950 ms elapses
before the first line of this codebase's own setup code runs. That floor is binary load plus
Tauri/WebView2 initialisation — not application logic.

What was in reach has been taken: the eagerly-loaded JavaScript payload is down **82 %** and the
in-page portion of startup is **~23 % faster**.

| | Before | After |
|---|---|---|
| Eager JS at boot | 1143 KB | **205 KB** |
| In-page (navigation → interactive) | ~520 ms | **~400 ms** |
| Total cold start (median) | ~1451 ms | **~1385 ms** |

The total barely moved because the part that was optimised is only ~28 % of it.

---

## How it is measured

`scripts/bench/startup.ps1`. Median of N runs, first discarded as a warm-up.

**Startup cannot be timed from outside the process.** The first attempt polled
`Process.MainWindowHandle` and reported a confident **40 ms** — Tauri creates the native window
long before WebView2 paints anything into it. That number was meaningless.

The app therefore reports its own readiness: when `NSP_BENCH_OUT` names a file, the Rust command
`bench_ready` writes the breakdown there, called from the frontend once the UI is interactive.
Unset, the command returns immediately, so this costs nothing in normal use.

---

## Addendum, 2026-07-26 — the pre-setup window, measured rather than assumed

The first version of this report said the ~950 ms before our setup hook was "binary load
plus Tauri/WebView2 init" and named the single-instance plugin as a suspect. That was an
inference, not a measurement, and the report said so. It has now been measured.

Two more marks were added inside the pre-setup window — after `init_tracing()`, and after
`tauri::generate_context!()` (which is evaluated as an argument to `.run()`, so it executes
*before* the setup hook and was a genuine candidate: it deserializes the config and builds
the embedded asset table, now ~180 chunks).

Clean 12-sample run, median **1487 ms**:

```
tracing    = 0 ms      process start → logging ready
context    = 0 ms      → embedded asset table built
pre-setup  = 1031 ms   → first line of our setup hook
rust       = 1034 ms   → end of our setup hook   (body: 2–3 ms)
interactive= 456 ms    navigation → UI usable
```

**Our code accounts for essentially none of it.** Logging costs 0 ms, the asset table costs
0 ms, the setup body costs 2–3 ms. The whole ~1031 ms elapses inside Tauri's `.run()` while
it builds the event loop, creates the native window and attaches the WebView2 runtime —
before it calls the setup hook at all.

The single-instance plugin is therefore **exonerated**: plugin `init()` only constructs a
struct, and everything measurable around it is zero.

**Conclusion, now on evidence rather than inference: the < 500 ms budget is unreachable for
this architecture.** The in-page portion alone (~456 ms) nearly exhausts it, and a
zero-cost frontend would still start in ~1031 ms.

## Where the time goes

Representative run:

```
1385 ms total
  shell      = 989 ms   process start → page interactive minus in-page time
  pre-setup  = 983 ms   process start → first line of our setup hook
  rust       = 986 ms   process start → end of our setup hook
  script     = 332 ms   navigation → main.tsx begins evaluating
  interactive= 404 ms   navigation → theme applied, UI usable
```

Read that carefully:

- **`pre-setup` ≈ `rust` ≈ `shell` ≈ 950–1000 ms.** Our entire setup body — reading config,
  session and recent-files, starting the watcher — costs the difference between `rust` and
  `pre-setup`: **2–7 ms**.
- Everything before `pre-setup` is: Windows loading a ~6 MB binary and the WebView2 loader,
  `init_tracing()`, `tauri::Builder` construction, and the single-instance and dialog plugins
  initialising. **None of it is code this project wrote.**
- The remaining ~400 ms is the page: HTML parse, module graph fetch/parse/eval, React mount,
  theme application. This is the only part frontend work can move.

**A frontend that took zero time would still start in ~950 ms.**

---

## What was fixed

Three findings, each the same shape: a cheap function living in an expensive module, dragging the
editor onto the boot path of an app whose first screen has no editor on it.

1. **`documents.ts` → `languages.ts` → all of CodeMirror.** The documents store imported
   `languageIdForFilename`, which returns a status-bar string like `"JSON"`, and which resolved it
   through `LanguageDescription.matchFilename` — pulling `@codemirror/language`,
   `@codemirror/language-data` and `@codemirror/lang-markdown` into the initial chunk. Replaced
   with a plain extension→label table in `languageLabels.ts`. Syntax *highlighting* still uses the
   real registry, from the lazily-loaded editor panes.

2. **`App.tsx` → `editor/theme.ts` → CodeMirror.** `applyEditorSyntaxVars` only writes CSS
   variables, but lived beside the CodeMirror extension builder. Split into `syntaxPalettes.ts`
   (data, no CodeMirror) and `theme.ts` (extensions).

3. **`manualChunks` defeated the lazy loading.** `SourcePane`, `PreviewPane`, `SplitContainer` and
   the four dialogs were converted to `React.lazy`, which dropped the entry chunk 458 KB → 85 KB.
   But `vite.config.ts` named a `codemirror` manual chunk, and Vite emits a `modulepreload` link
   for named chunks reachable from the entry — so the browser downloaded and parsed all 547 KB
   during startup regardless. Removing the manual chunk let it fall into the lazy pane chunk.

Boot now loads exactly two files: a 67 KB entry chunk and 138 KB of React.

---

## An honest note on process

The first optimisation pass was done on a hypothesis — "the JS bundle is the bottleneck" — without
attributing the total first. It made startup **slower** (1275 → 1388 ms, within noise, but
certainly not better). The attribution work above came second, and should have come first. The
audit item said "attribute the 1.8 s across process/WebView2/JS-boot"; skipping that step cost a
full build-and-measure cycle and produced a confident wrong answer.

---

## Recommendations

1. **Change the budget.** < 500 ms is not achievable for a WebView2 application. A defensible
   target is **< 1200 ms total** with a **< 350 ms in-page** sub-budget, which is the part the
   codebase controls. `scripts/bench/startup.ps1 -FailOver` can gate either.
2. **Investigate the single-instance plugin.** It is the prime suspect inside `pre-setup`: it
   creates a named IPC endpoint at launch, and plugin construction happens before the setup hook.
   Testing it means temporarily removing a shipped feature, so it was not done here.
3. **Wire the bench into CI** so the in-page number cannot regress unnoticed.
4. **Do not re-add CodeMirror to `manualChunks`** without re-running the bench. That single line
   silently undid the entire lazy-loading effort once.
