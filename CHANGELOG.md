# Changelog

All notable changes to Notepad Super Plus are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Entries are generated from [Conventional Commits](https://www.conventionalcommits.org/)
and hand-curated before each release (see [docs/14_Git_Workflow.md](docs/14_Git_Workflow.md) §7).

## [Unreleased]

### Added
- **Windows shell integration.** Explorer's right-click menu now offers
  **"Open with Notepad Super Plus"** for `.md`, `.markdown`, `.mdown`, `.mkd`, `.mdx`, and
  `.txt` (registered under `SystemFileAssociations` by the NSIS installer, cleaned up on
  uninstall). File associations are declared for both installers, the app is
  **single-instance** (a second launch forwards its files to the running window and focuses
  it), and files passed on the command line open on startup — relative paths resolved against
  the invoking shell's working directory.
- **Unsaved-changes guard.** Closing a dirty tab (close button, middle-click, or `Ctrl+W`)
  now asks before discarding edits; closing a file also stops its file watcher.
- **Real recent files on the welcome screen.** The "Quick Documentation" card listed
  hard-coded doc paths that opened empty phantom buffers; it now shows the actual
  recent-files list (shared hook with the Explorer panel) with a proper empty state.
- **Registry-driven shortcut lists.** The welcome screen and Settings → Shortcuts render
  from the command registry, so displayed chords can never drift from the real keymap.

### Changed
- **Markdown sanitizer hardened.** Rendered ids are prefixed (`user-content-`, GitHub-style)
  to block DOM clobbering, internal `#anchor` links are rewritten to match, raw `<input>` is
  restricted to disabled checkboxes (no live form fields in the preview), and arbitrary
  `class` attributes are no longer allowed on all elements — only where the renderer emits
  them (code fences, task lists).
- **Status bar truthfulness.** Encoding and line-ending indicators now show the active
  document's real values (UTF-8 BOM, UTF-16 LE/BE, CRLF…) instead of hard-coded "UTF-8 · LF";
  the version strings in the status bar, About dialog, and Settings all come from the Rust
  core instead of being hard-coded.
- **Filename validation (Rust).** Create/rename now reject Windows-invalid characters,
  reserved device names (`CON`, `NUL`, `COM1`…), `.`/`..`, and trailing dots/spaces, with
  clear error messages.
- Settings persistence no longer schedules a config write on every cursor move — unchanged
  snapshots are skipped before the debounce timer is armed.
- Brand glyph corrected from a leftover "M" to "N+" across the title bar, About dialog, and
  Settings; the About tab and toggle switches previously referenced unstyled CSS classes and
  now render properly.

### Fixed
- Sidebar resize tracked the pointer with a 4 px drift (offset used 44 px; the activity rail
  is 48 px).
- **Stage 9 — Settings persistence.** Preferences now survive a restart. The Rust core
  persists settings as **TOML** in the app data directory with per-field defaults, so a
  missing, partial, or hand-corrupted file degrades to defaults instead of failing to start,
  and out-of-range values are clamped rather than breaking the UI. Theme, word wrap, editor
  font family and size, zoom, sidebar width, split ratio, and hidden-file visibility are all
  saved (debounced) and restored on launch. The Settings dialog's font controls are now wired
  to real state — previously they were inert.
- **UI/UX redesign.** A 9-theme token set (Apple Light/Dark, Midnight Blue, GitHub, Nord,
  Catppuccin, High Contrast) wired through the editor syntax palettes, a welcome screen,
  Settings/Export/About dialogs, and a richer status bar. Review fixes: HTML export now renders
  and sanitizes Markdown (it previously exported the raw source, unescaped, via a browser
  download that the Tauri webview cannot perform); document statistics moved to the render
  worker (they were re-scanning the whole document on every keystroke); and modals gained
  Escape-to-close, focus management, and correct `role`/`aria-modal` placement.
- **Stage 7 — Search.** Workspace-wide text search in the Rust core using the `ignore` walker
  (so `.gitignore` is respected) and the `regex` crate, whose linear-time matching keeps
  pathological patterns safe. Literal or regex queries, case sensitivity, and whole-word
  matching, with hard caps on matches, file size, and preview length; the walk runs off the IPC
  thread. The UI adds a Search panel (`Ctrl+Shift+F`) with results grouped by file and
  click-to-jump, plus CodeMirror's in-file find/replace (`Ctrl+F`) themed to our tokens.
  Also fixes a real defect CI caught: atomic-write temp files were named per-process rather
  than per-write, so two saves into the same directory could race.
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

[Unreleased]: https://github.com/sosakib/NotepadSuperPlus/commits/main
