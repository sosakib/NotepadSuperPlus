# Changelog

All notable changes to Notepad Super Plus are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Entries are generated from [Conventional Commits](https://www.conventionalcommits.org/)
and hand-curated before each release (see [docs/14_Git_Workflow.md](docs/14_Git_Workflow.md) §7).

## [Unreleased]

### Changed
- Release packaging names installers the way GitHub serves them (`Notepad.Super.Plus_…`), so
  `SHA256SUMS.txt` verifies the downloaded files directly; release drafts are titled
  automatically.

## [1.0.1] — 2026-10-05

Patch release from the 2026-10-05 security and robustness audit of 1.0.0. No new features,
no file-format or settings changes.

### Fixed (data integrity)
- **Clicking a link in the preview replaced the app with that page.** The WebView navigated
  away, unloading the editor and every unsaved buffer, and a remote page rendered inside the
  app window. `#anchors` now scroll the preview, web and `mailto:` links open in the system
  browser, everything else is ignored, and a Rust navigation guard refuses any other origin.
- **Closing the window discarded unsaved edits.** X / Alt+F4 quit without asking (only tab
  close asked). The window now lists the unsaved documents and asks first.
- **Saving in a legacy encoding silently corrupted characters.** An emoji in a windows-1252
  file was written as `&#128512;`. The save now fails with a clear error and the file on disk
  is left untouched.
- **New file / Duplicate could overwrite a file that appeared at the same moment** (e.g. from
  a sync client). Both now claim the name atomically.
- **`recent.json` was written non-atomically**; a crash mid-write emptied the recent list.

### Fixed
- **A session restored in Preview mode showed "Nothing to preview yet" for every tab.**
- Renaming only the case of a file (`notes.md` → `Notes.md`) was rejected as "already exists".
- A panic while holding internal state could abort the whole app on the next access; locks now
  recover instead.
- A file opened from Explorer while the app was still starting up could be dropped.
- The workspace treated sibling folders sharing a name prefix (`C:\notes-old` for `C:\notes`)
  as inside it, and was case-sensitive on NTFS.
- Opening another folder left the previous folder's recursive file watch running.
- Saving inside an open workspace briefly flickered a temporary file in the explorer.

### Security
- XSS regression net: 23 payloads against the preview and HTML export, plus a test that fails
  if the CSP or window capabilities are loosened.
- CI: CodeQL re-enabled (JavaScript/TypeScript and Rust), `pnpm audit` and `cargo audit` jobs
  added, every GitHub Action pinned to a commit SHA.
- Development dependencies updated (Vitest 3, Vite 6); `pnpm audit` went from 1 critical and
  20 high findings to 2 moderate, all in test tooling. Shipped dependencies had none.

## [1.0.0] — 2026-07-26

First stable release. All four v1.0 blockers from the 2026-07-21 audit are closed or
substantially closed; the startup budget was corrected after measurement proved the
original unreachable (see [docs/09](docs/09_Performance_Strategy.md) §2). Remaining gaps
are listed in the release notes rather than implied to be absent.

### Fixed (data integrity)
- **Every UTF-16 file was rejected as binary.** `read_file` sniffed the first 8 KB for a
  NUL byte and bailed; UTF-16 encodes ASCII as `XX 00`, so *no* UTF-16 document could
  ever be opened. The UTF-16 branches in `decode`/`encode` were unreachable dead code
  and the documented "UTF-8 / UTF-16 / BOM are detected and preserved" was false. The
  BOM check now runs before the binary sniff.
- **CRLF was silently converted to LF when saving a UTF-16 file.** `detect_eol` scanned
  raw bytes for `0D 0A`, which are never adjacent in UTF-16, so every such file reported
  LF. It now reads the decoded text.
- **`.gitignore` was ignored outside a git repository.** The `ignore` crate defaults to
  `require_git(true)`, so the "respect .gitignore" toggle did nothing in a plain folder —
  and a workspace here is just a folder. Now `require_git(false)`.

All three were found by the new journey tests, having survived 300+ unit tests: each
only appears when modules are combined.

### Added
- **Journey test suites (blocker B4, partial).** `src-tauri/src/journeys.rs` (9 tests)
  drives the Rust surface across module boundaries against a real temporary filesystem —
  open/edit/save round-trips, session save→restore, workspace open→list→search, settings
  persistence. `src/journeys.test.tsx` (11 tests) renders the **real `App`** and clicks
  through it, covering the lazily-loaded panes and dialogs that unit tests cannot see.
  7 of the 10 release-blocking journeys in `docs/10 §3` are now covered or substantially
  covered; what is *not* is enumerated in
  [docs/reports/E2E_COVERAGE.md](docs/reports/E2E_COVERAGE.md).
- `matchMedia` stubbed in the test setup — jsdom does not implement it, so mounting the
  real `App` previously threw on its first effect and rendered nothing.
- **Syntax highlighting in fenced code blocks (FR-3.2), via Shiki.** 26 grammars, each
  loaded on first use, running inside the Markdown worker — the eager boot payload is
  **unchanged at 204.7 KB** and cold start did not regress. Uses Shiki's JavaScript
  regex engine rather than Oniguruma, avoiding a ~500 KB WASM fetch before the first
  code block can render.
  - Colours are emitted as `tok-*` **classes, never inline styles**. Shiki normally
    writes `style="color:…"`, and permitting a `style` attribute through the sanitizer
    would open a CSS-injection surface in a pane that renders untrusted documents. The
    rewrite happens before sanitization, so the schema still refuses `style` outright.
  - Those classes map onto the existing `--cm-*` editor palette, so code blocks inherit
    the WCAG contrast guarantee `contrast.test.ts` already enforces on all 10 themes
    instead of introducing a second, unchecked palette. Verified: rendered token colour
    tracks `--cm-keyword` exactly as the theme changes.
  - The grammar list is fixed rather than a dynamic import of the fence string, so a
    document cannot probe the bundle. Unknown languages render unhighlighted, as before.
- **Frontmatter panel (FR-3.3).** YAML frontmatter is lifted out of the document and
  shown as a collapsible metadata panel above the preview. Previously its `---` fences
  rendered as a thematic break and its keys as a stray heading, so metadata leaked into
  the rendered body — wrong output, not just a missing feature. The block is replaced by
  an equal number of blank lines rather than removed, so every heading line number,
  outline entry and `data-source-line` stays aligned and scroll sync keeps working. No
  YAML dependency added: flat `key: value` pairs, inline `[a, b]` arrays and `- item`
  lists are parsed; nested mappings are shown verbatim rather than silently dropped.
- **Session restore (FR-6.4).** Open documents, caret positions, view mode and the
  workspace folder are saved to `session.json` and restored on launch. Files that moved
  or were deleted are dropped silently rather than restored as error tabs, and the
  active tab is re-found by path so dropping an earlier tab cannot select the wrong
  document. Unsaved buffers are deliberately not persisted — writing their text to disk
  unasked is crash-draft recovery (FR-1.7), a separate feature.
- **Startup benchmark harness** (`scripts/bench/startup.ps1`). Median-of-N cold start
  with `-FailOver` for CI gating, plus a per-phase breakdown. The app reports its own
  readiness because startup cannot be timed from outside the process — the native
  window handle exists long before WebView2 paints.

### Performance
- **Boot JavaScript cut from 1143 KB to 205 KB (-82 %)**; in-page startup ~520 ms →
  ~400 ms. Three causes, all the same shape — a cheap function in an expensive module:
  the documents store pulled all of CodeMirror through `languageIdForFilename` (which
  returns a status-bar string); `App.tsx` pulled it through `applyEditorSyntaxVars`
  (which writes CSS variables); and a `codemirror` entry in `manualChunks` made Vite
  `modulepreload` all 547 KB, silently defeating the lazy-loaded editor panes.
- Editor panes and all four dialogs are now `React.lazy`.

### Changed
- **The startup budget was corrected, and is now gated.** The original
  "< 500 ms cold start" allotted ~150 ms to process + webview init; measurement put that
  slice at **~1031 ms** — inside Tauri's `.run()`, before the first line of this crate's
  setup hook. Logging init measures 0 ms, the embedded asset table 0 ms, our setup body
  2–3 ms. The single-instance plugin, previously suspected, is exonerated.
  The budget is therefore split into what the platform imposes and what this codebase
  owns, and only the second is gated:
  **in-page (navigation → interactive) < 500 ms — currently ~483 ms, enforced in
  `release.yml`**; total cold start < 2000 ms — currently ~1482 ms, reported only, since
  it moves with machine load and a tight gate there would be flaky rather than
  informative. Full attribution in
  [docs/reports/STARTUP_PERFORMANCE.md](docs/reports/STARTUP_PERFORMANCE.md).
- README no longer claims "opens fast" or "Notepad++-quick". At ~1.5 s cold start those
  claims were not defensible, and the release notes now state the number instead.
- CI runs `pnpm format:check`, which was enforced locally but never in CI.

## [0.9.0] — 2026-07-26

First public pre-release. Feature set is close to final; see
[docs/reports/REMAINING_TASKS.md](docs/reports/REMAINING_TASKS.md) for what still stands between
this and 1.0.0.

### Performance
- **Stopped per-keystroke document serialization.** The render controller took an
  already-serialized string, so the whole document was copied on every key only to be
  discarded by the next one inside the 90 ms debounce. It now takes a thunk and
  materializes the text once, at flush time.
- **Stopped store churn on the typing path.** `markDirty` fired on every change,
  publishing a new `docs` object and re-rendering every tab-strip/status-bar
  subscriber; it now fires only on the clean → dirty transition (measured: 61
  keystrokes → 1 tab-strip DOM mutation, previously one per keystroke). `setCursor`
  skips the publish when the position is unchanged.
- Switching view modes no longer re-parses a document whose output is already current.
- Split the 1.14 MB frontend chunk into react / codemirror / app vendor graphs.
- **Fixed a memory leak:** `pendingContent`/`pendingReveal` were never pruned when a
  tab closed, retaining whole file contents for the session.

### Added
- Tab bar redesign: 32 px tabs in a 40 px strip, 24 px close target, file-type icon,
  shared dirty-dot/close slot so tab width never shifts, masked overflow with
  auto-scroll to the active tab, middle-click to close, roving tab index.
- Themed scrollbars across every scroll container.
- Settings shortcuts grouped by command category; About tab facts grid.
- **Official brand icon across every surface.** The placeholder "M" set is gone: the exe,
  taskbar, Start Menu, desktop shortcut, installed-app entry, File Explorer, Alt+Tab,
  installer and uninstaller now carry the real mark, as do the title bar, welcome screen,
  About dialog and Settings → About. `public/favicon.ico` added for the WebView tab.
- **Three new themes**, each filling a gap the pack actually had rather than adding
  another variation: **Everforest** (the only warm dark — every other one is cool),
  **Solarized Light** (a second light theme, warm paper rather than cool white), and
  **Minimal Monochrome** (zero-chroma chrome; status colours deliberately kept).
- **`src/theme/contrast.test.ts`** — 215 assertions holding all 10 themes to WCAG 2.2
  floors (4.5:1 text, 3:1 accent and status colours) plus a minimum separation for the
  primary/secondary/muted text ramp, and the same floor for every Markdown syntax
  palette. A theme that regresses now fails CI.
- Icon motion: rail, tab-close and new-tab glyphs respond to hover and press with
  transform-only CSS (no animation runtime added). Fully suppressed under
  `prefers-reduced-motion`.

### Fixed (packaging)
- **The NSIS installer shipped the stock NSIS icon, not the app icon.** `installerIcon`
  and `uninstallerIcon` were never set, so Tauri used its default; the app `.exe` itself
  was always correct. Confirmed by extracting the icon from the compiled `setup.exe`
  before and after the fix.

### Fixed (themes)
- **31 contrast failures across the bundled themes.** Measured, not eyeballed. Worst
  cases: Apple Light's muted text at **2.45:1**, Solarized's green and cyan at
  **2.93/2.97:1** in the editor, Apple Dark's muted at 3.07:1, and white button labels on
  the Apple Dark / GitHub accents at 3.68/3.75:1. Nord's three Snow Storm tints measured
  10.84/10.26/9.25:1 — a text ramp with no hierarchy — and its signature `#5e81ac` active
  row carried primary text at 3.50:1. Every palette now clears its floor; each adjustment
  is commented with the value it replaced.
- **Gradients ignored the active theme.** `--accent-gradient` was a hardcoded Apple-blue
  ramp, so Nord, Catppuccin, Midnight Blue, GitHub and High Contrast painted blue
  gradients that clashed with their own accent across six surfaces. Now derived from
  `--accent` via `color-mix()`.
- **Shadows were hardcoded for dark themes.** A flat 45 %-black drop and a 50 %-black
  modal scrim greyed out the light themes. Shadow tint and opacity now follow the theme's
  scheme through a new `data-scheme` attribute.
- **The theme rail button reached only 4 of the bundled themes** (D2). The cycle is now
  derived from the theme pack, so a new theme joins it automatically.
- **Editor syntax palettes never met their documented 4.5:1 claim.** The docstring in
  `src/editor/theme.ts` asserted it; nothing checked. Six themes were failing.

### Changed
- **Status bar is no longer a full-width accent band** — surface-toned with muted text,
  accent reserved for the view-mode pill, and least-important metadata dropped at
  narrow widths.
- Themes are self-describing: adding one to `themes.ts` now makes it appear in the
  picker automatically (the picker previously re-declared every theme's name and colors).
- `SettingsDialog` (264 lines) split into `src/settings/` with one component per tab.
- `basename()` existed in five files with two different implementations; consolidated
  with `parentDir()` into `src/utils/path.ts` with tests.
- Removed the unused `codemirror` meta-package.

### Fixed
- Accessibility: the title-bar brand was a `div` with `onClick` (unreachable by
  keyboard) and is now a button; file-tree row actions used `display: none`, removing
  them from the tab order entirely; tooltip bubbles are `aria-hidden` so screen readers
  no longer announce the label twice.
- Responsiveness: welcome grid collapses via `auto-fit`; modals cap their height and the
  overlay scrolls, so a dialog can no longer run off a 13" screen. Verified 800 px →
  2560 px with no horizontal overflow.
- Command palette keeps the highlighted row in view when arrowing past the visible window.
- Export dialog clears its auto-dismiss timer on unmount.

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
- Master execution roadmap ([docs/ROADMAP.md](docs/ROADMAP.md)) covering Stages 0–15 (Windows-first to v1.0)
  plus the deferred macOS migration milestone.

[Unreleased]: https://github.com/sosakib/NotepadSuperPlus/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/sosakib/NotepadSuperPlus/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/sosakib/NotepadSuperPlus/releases/tag/v1.0.0
