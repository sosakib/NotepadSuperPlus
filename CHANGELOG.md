# Changelog

All notable changes to Notepad Super Plus are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Entries are generated from [Conventional Commits](https://www.conventionalcommits.org/)
and hand-curated before each release (see [docs/14_Git_Workflow.md](docs/14_Git_Workflow.md) §7).

## [Unreleased]

### Added
- **Stage 6 — Explorer.** Open a folder as a workspace and browse it in a **lazy file tree**
  (children load on expand, so large folders open instantly). Click a file to open it. Inline
  **file management** — new file/folder, rename, duplicate, and delete — with deletes going to
  the **OS trash**, never a permanent delete. The workspace is watched recursively, so changes
  made outside the app refresh the tree automatically. Recent files remain available when no
  folder is open. _Deferred:_ drag-and-drop and favorites/pinned files.
- **Stage 5 — Filesystem.** Documents are now backed by real files. The Rust core gains a
  typed error taxonomy (`NspError`), file reading with **encoding detection** (UTF-8, UTF-8 BOM,
  UTF-16 LE/BE, charset guess) and **line-ending** detect/preserve (LF/CRLF), binary and
  size guards, and **atomic saves** (temp file → fsync → rename) that never corrupt a file on
  crash. Adds a **file watcher** (debounced, with self-change suppression) that emits
  `fs:changed`, a persisted **recent-files** list, and the dialog plugin. The UI gains
  Open / Save / Save As commands (`Ctrl+O` / `Ctrl+S` / `Ctrl+Shift+S`), a typed IPC layer,
  recent files in the Explorer, seamless reload when a clean file changes on disk, and a
  **conflict banner** (Reload / Keep my changes) when it changes while you have unsaved edits.
- **Stage 4 — Markdown Rendering Engine.** Live GitHub-flavored rendering via a unified
  (remark → rehype → **sanitize**) pipeline running in a **Web Worker**, so parsing never
  blocks the UI. Adds **Preview** and **Split** modes (source + preview side by side with
  bidirectional scroll sync), a live **Structure View** (heading outline with click-to-jump),
  heading ids + anchor-correct slugs, and source-line mapping (`data-source-line`) for sync.
  Output is sanitized in the worker (script/`javascript:`/event-handler stripping — docs/08 §4),
  so the preview injects it safely. GitHub-style, fully token-driven preview CSS (tables, task
  lists, code, blockquotes) that follows the theme. 10 new pipeline/sanitization/outline tests.
  _Deferred:_ Shiki code-block highlighting and true per-block incremental rendering (full render
  runs off-thread and meets budget for now; incremental is a Stage 10/11 optimization).
- **Stage 3 — Markdown Editor Engine.** Real editing via CodeMirror 6: undo/redo,
  multiple cursors, column/rectangular selection, bracket matching, line numbers, code
  folding, and word wrap (toggle). Rich **Markdown syntax highlighting** with a palette
  bridged to the theme tokens as live `--cm-*` variables (instant light/dark/high-contrast
  switching, no editor rebuild). A **documents + tabs** model (in-memory; filesystem-backed
  documents arrive in Stage 5) with a real tab strip, dirty indicators, per-tab state
  preservation, and new/close commands. A **language resolver** (extension → grammar) that
  loads Markdown synchronously and lazily code-splits the adjacent code/data grammars
  (JSON/YAML/JS/Python/CSS/HTML/…, FR-1.2/1.3). Live cursor line/column and language in the
  status bar. 10 new tests (resolver, documents store, large-file plan).
- **Stage 2 — Core Application Shell.** The application chrome, with no Markdown yet:
  a design-token **theme engine** (dark / light / high-contrast, follow-OS); a layout of
  title bar, activity rail, resizable/collapsible sidebar (Explorer/Outline/Search
  placeholders), editor area with a view-mode switch (source/preview/split) and tab-bar
  placeholder, and a status bar; a **command registry** feeding a fuzzy **command palette**
  (Ctrl+Shift+P) and a global **keyboard manager**; UI primitives (Button, IconButton,
  Tooltip, Kbd, EmptyState, Resizer); a Zustand `ui` store; and the first component test
  suite (Vitest + Testing Library, 31 tests) wired into CI. Native OS menu bar is deferred
  to Stage 7 (per docs/05 §4).
- **Stage 1 — Workspace & Build System.** Toolchain wired end to end: Tauri 2 + Rust core
  (`src-tauri`), React 18 + TypeScript (strict) + Vite frontend, pnpm workspace. The app is an
  intentionally empty window that proves the stack: a single `app_version` IPC command bridges
  the webview and the Rust core. Adds `tracing` logging (Rust) and `performance.mark` startup
  instrumentation (frontend), strict ESLint + Prettier, `rust-toolchain.toml`, capability
  manifest (least-privilege `core:default`), release-profile size tuning, generated app icons,
  real CI jobs (frontend lint/typecheck/build on Linux; Rust fmt/clippy/test/build on Windows),
  and [docs/BUILD.md](docs/BUILD.md).
- **Stage 0 — Repository Initialization.** Complete project scaffolding: MIT license,
  contribution/security/conduct policies, GitHub issue & PR templates, CI/CodeQL/release
  workflow placeholders, Dependabot, and the full pre-implementation documentation set
  under [`docs/`](docs/) (21 architecture & planning documents).
- Master execution roadmap ([ROADMAP.md](ROADMAP.md)) covering Stages 0–15 (Windows-first to v1.0)
  plus the deferred macOS migration milestone.

_No application code yet — by design. Implementation begins at Stage 1 after roadmap approval._

[Unreleased]: https://github.com/sosakib/NotepadSuperPlus/commits/main
