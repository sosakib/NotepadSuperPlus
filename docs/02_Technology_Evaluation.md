# 02 — Technology Evaluation

**Related:** [00_Project_Vision.md](00_Project_Vision.md) · [03_System_Architecture.md](03_System_Architecture.md) · [09_Performance_Strategy.md](09_Performance_Strategy.md)

This document records the framework decision for Notepad Super Plus and the reasoning behind it. It is written as an Architecture Decision Record at the end (§6) so the choice is auditable and revisitable.

---

## 1. Candidates

Electron · Tauri (v2) · Flutter Desktop · Qt (6, C++/QML) · Avalonia (.NET) · Native Rust GUI (egui/iced/gtk-rs/Slint)

## 2. Evaluation criteria and weights

Weights derive from the product's non-negotiables in [00_Project_Vision.md](00_Project_Vision.md) §4: performance budgets, Markdown rendering fidelity, cross-platform reach, and open-source sustainability.

| Criterion | Weight | Why |
|---|---|---|
| Startup speed | 10 | < 500 ms cold start is a headline promise |
| Memory footprint | 10 | < 150 MB idle is a headline promise |
| Markdown/HTML rendering quality | 10 | "GitHub-parity" rendering is the core product |
| Binary/installer size | 7 | Lightweight positioning |
| Cross-platform (Win/mac/Linux) | 9 | P0 requirement |
| Text-editor component maturity | 9 | A serious editor (multi-cursor, huge files) cannot be built from scratch on this budget |
| Security model | 8 | Untrusted Markdown/HTML input; sandboxing required |
| Ecosystem & long-term sustainability | 7 | MIT open-source project; must survive maintainer churn |
| Developer experience & contributor accessibility | 7 | Community-driven; contributor pool size matters |
| Packaging, signing, auto-update | 6 | Release engineering cost |

## 3. Candidate analysis

### 3.1 Electron

- **Rendering:** Chromium — perfect HTML/CSS, best-in-class Markdown fidelity. CodeMirror/Monaco run natively.
- **Startup:** 800 ms–2 s typical cold start. Fails the < 500 ms budget on mid-range hardware.
- **Memory:** Bundled Chromium + Node: 150–300 MB idle is normal. Fails the < 150 MB budget.
- **Size:** 60–100 MB installers. Fails the lightweight positioning by an order of magnitude.
- **Security:** Good modern story (context isolation, sandboxed renderers) but the app ships its own browser — the project inherits Chromium CVE cadence and must ship frequent updates just to stay patched.
- **Ecosystem:** Largest; enormous contributor pool; best tooling (electron-builder, auto-update).
- **Verdict:** Everything works, but the product's three headline numbers (start, RAM, size) are structurally unachievable. Choosing Electron would make Notepad Super Plus another VS Code-weight editor — the exact thing the vision defines itself against.

### 3.2 Tauri 2

- **Architecture:** Rust core process + OS-provided webview (WebView2/Chromium on Windows, WKWebView on macOS, WebKitGTK on Linux). Frontend is ordinary web tech; backend commands are Rust functions invoked over a typed IPC bridge.
- **Rendering:** Full HTML/CSS in the webview — GitHub-parity Markdown, KaTeX, Mermaid, Shiki all work. CodeMirror 6 runs natively.
- **Startup:** 200–400 ms cold starts are typical for lean Tauri apps — the webview is provided by (and often pre-warmed by) the OS. Meets budget.
- **Memory:** 60–120 MB idle typical (webview memory is partly shared with the OS). Meets budget with headroom.
- **Size:** 3–10 MB installers. Exceeds the target comfortably.
- **Performance-critical work in Rust:** file I/O, workspace search (ripgrep-style via `ignore` + `regex` crates), file watching (`notify`), large-file handling — native speed, no Node.
- **Security:** Strong by design — no Node in the renderer, Rust memory safety in the core, capability-based permission system for IPC (v2), CSP enforced on the webview. Webview patching is delegated to the OS vendor (Microsoft/Apple/distro), which *removes* the "ship Chromium patches forever" burden.
- **Risks (honest):**
  - **R1 — Webview divergence.** WebKitGTK lags WebView2/WKWebView in CSS/JS features and has historically had Linux quirks (rendering glitches under some compositors). *Mitigation:* target a conservative web baseline (no bleeding-edge CSS), CI screenshot tests on all three platforms ([10_Testing_Strategy.md](10_Testing_Strategy.md)), AppImage as escape hatch.
  - **R2 — Rust contributor barrier.** Smaller pool than JS. *Mitigation:* architecture keeps ~80 % of feature code in TypeScript; Rust surface is a small, stable command set ([16_API_Design.md](16_API_Design.md)).
  - **R3 — Younger ecosystem than Electron.** *Mitigation:* Tauri 2 is stable, well-funded (Commons Conservancy), and used by significant production apps; our usage is squarely on the paved path (single window, filesystem, dialogs, updater).
- **Ecosystem:** Vite/React/CodeMirror on the frontend (the largest editor-component ecosystem in existence) + crates.io for systems work.

### 3.3 Flutter Desktop

- **Rendering:** Skia/Impeller canvas — everything is custom-drawn. There is **no HTML engine**: GitHub-parity Markdown means reimplementing HTML/CSS semantics (tables, inline HTML, KaTeX, Mermaid) in Flutter widgets. `flutter_markdown` covers a fraction of GFM and was deprecated by the Flutter team.
- **Text editing:** No mature CodeMirror-class editor widget (multi-cursor, 100k-line virtualization, regex search). Building one is a multi-year project by itself.
- **Startup/memory:** Good-to-acceptable (light runtime, ~ 40–90 MB), binary ~ 20–40 MB.
- **Verdict:** Excellent toolkit — wrong problem shape. The product *is* HTML-quality document rendering plus a world-class code editor; Flutter provides neither and both would need reinvention. Eliminated on rendering (10-weight criterion scored 3/10).

### 3.4 Qt 6

- **Rendering:** Widgets/QML have no GFM-parity path; QtWebEngine (bundled Chromium) restores fidelity but re-imports Electron's weight problem *and* adds LGPL/commercial licensing complexity.
- **Editing:** QScintilla/QPlainTextEdit are capable but well behind CodeMirror 6 for the required feature set.
- **Licensing:** LGPL dynamic-linking obligations complicate a simple MIT story; the open-source/commercial dual model is a long-term governance risk for a community project.
- **Contributors:** C++/QML pool for OSS desktop apps is comparatively small and aging.
- **Verdict:** Technically viable, strategically poor. Eliminated.

### 3.5 Avalonia

- **Rendering:** Skia-drawn, same "no HTML engine" problem as Flutter. AvaloniaEdit is a decent code editor but far from CM6.
- **Runtime:** .NET adds 30–80 MB and AOT-trimmed startup is workable but not exceptional.
- **Ecosystem:** Smallest community of all candidates for this app category.
- **Verdict:** Eliminated for the same structural reason as Flutter, with a smaller ecosystem.

### 3.6 Native Rust GUI (egui / iced / Slint / gtk-rs)

- **Rendering:** Immediate-mode or custom-widget canvases; no HTML/CSS. Markdown rendering exists (`egui_commonmark` etc.) at demo quality — tables, inline HTML, math, diagrams all missing or primitive.
- **Editing:** No production-grade editor widget; text input itself (IME, RTL, a11y) is still maturing across these toolkits.
- **Accessibility:** Significantly behind webview-based stacks (AccessKit is improving but partial) — conflicts with FR-10.4/10.5.
- **Startup/memory/size:** Best-in-class (instant, tiny) — but on a product whose core is rich document rendering, that advantage cannot be cashed in.
- **Verdict:** The performance ideal, the functionality dead end. Eliminated for v1; noted in [19_Future_Features.md](19_Future_Features.md) as a long-horizon curiosity, not a plan.

## 4. Scoring matrix

Scores 1–10 per criterion, × weight. (Rendering and editor scores dominate by design — they are the product.)

| Criterion (weight) | Electron | **Tauri 2** | Flutter | Qt | Avalonia | Native Rust |
|---|---|---|---|---|---|---|
| Startup (10) | 4 | 9 | 7 | 7 | 6 | 10 |
| Memory (10) | 3 | 8 | 7 | 6 | 5 | 10 |
| Rendering quality (10) | 10 | 9 | 3 | 5 | 3 | 2 |
| Binary size (7) | 2 | 10 | 6 | 5 | 5 | 10 |
| Cross-platform (9) | 10 | 9 | 8 | 9 | 7 | 6 |
| Editor component maturity (9) | 10 | 10 | 3 | 6 | 5 | 2 |
| Security model (8) | 7 | 9 | 7 | 6 | 6 | 8 |
| Ecosystem/sustainability (7) | 9 | 8 | 7 | 6 | 4 | 5 |
| Contributor DX (7) | 9 | 8 | 6 | 4 | 5 | 5 |
| Packaging/update (6) | 9 | 8 | 6 | 5 | 5 | 4 |
| **Weighted total (÷ 830 max)** | **605** | **738** | **489** | **496** | **423** | **512** |

## 5. Decision

**Tauri 2 + React + TypeScript + Vite frontend, Rust core.**

Tauri is the only candidate that satisfies *both* halves of the product thesis simultaneously: web-grade document rendering and editing components (the Electron advantage) at near-native footprint (the native-toolkit advantage). Electron fails the footprint promise; every non-webview toolkit fails the rendering/editing promise. This is not a popularity choice — Electron scored higher on popularity criteria and still lost on the weighted product requirements.

### Supporting stack decisions (summarized; details in [03_System_Architecture.md](03_System_Architecture.md))

| Concern | Choice | Over | Reasoning |
|---|---|---|---|
| Editor | **CodeMirror 6** | Monaco | CM6: ~ 300 KB min core vs Monaco ~ 3 MB+, better mobile/IME/a11y, first-class Markdown language package, precise incremental parsing (Lezer), designed for exactly this embedding. Monaco's advantages (IntelliSense, LSP) serve IDE use-cases we exclude. |
| Markdown pipeline | **unified (remark + rehype)** | markdown-it | AST-based: one parse feeds preview rendering, outline extraction, TOC, and scroll-sync position mapping ([06_Data_Flow.md](06_Data_Flow.md)). micromark core is CommonMark/GFM spec-exact. Plugin ecosystem (remark-gfm, remark-math, rehype-katex, rehype-sanitize) covers FR-3.x without custom parser work. markdown-it is faster per-parse but string-oriented; we need the tree. Perf gap closed by incremental block-level rendering (see [09_Performance_Strategy.md](09_Performance_Strategy.md) §4). |
| Code-block highlighting (preview) | **Shiki** | highlight.js/Prism | TextMate-grammar accuracy, theme parity with editor themes, lazy per-language loading. Runs in a Web Worker to keep main thread free. |
| State | **Zustand** | Redux/Jotai/MobX | Minimal API, no boilerplate, excellent selector-based re-render control for a perf-critical UI, tiny bundle. Store design in [05_Component_Design.md](05_Component_Design.md) §5. |
| Workspace search / FS | **Rust crates: `ignore`, `regex`, `notify`, `memmap2`, `encoding_rs`** | JS equivalents | Native-speed grep, gitignore semantics, robust watching, zero main-thread cost. |
| Config format | **TOML** | JSON | Comments, human-friendly, Rust-native (`toml` crate). Themes/keymaps stay JSON (machine-edited, web-side consumed). |
| Database | **None** | SQLite | v1 state = files (config TOML, session JSON). Revisit only if workspace-wide indexed search lands (P2). |

## 6. ADR-0001 (record)

- **Status:** Accepted (pending user/maintainer sign-off before Phase 1 — see [12_Implementation_Phases.md](12_Implementation_Phases.md)).
- **Decision:** Tauri 2 / Rust / React / TypeScript / Vite / CodeMirror 6 / unified / Shiki / Zustand / TOML.
- **Consequences:** (+) meets all NFR budgets; smallest attack surface among webview options; 80/20 TS/Rust split keeps contributor bar low. (−) must engineer around WebKitGTK divergence (CI matrix, conservative CSS baseline); Rust toolchain required for building from source; per-platform rendering QA is mandatory ongoing cost.
- **Revisit trigger:** if Linux webview defects consume > 15 % of maintenance effort for two consecutive releases, evaluate bundling a fixed webview on Linux only.
