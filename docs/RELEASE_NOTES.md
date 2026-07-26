# Notepad Super Plus 1.0.0

**First stable release** · Windows 10/11 x64 · MIT

A desktop Markdown editor that does one job properly: a CodeMirror 6 source pane, a sanitized
GitHub-flavored live preview with syntax-highlighted code blocks, a workspace explorer with
full-text search, session restore, and ten themes held to WCAG contrast floors by automated
test. No accounts, no paid tier, no telemetry.

## What's in it

**Write and preview**

- Source / Preview / Split with synced scrolling (`Ctrl+1` `Ctrl+2` `Ctrl+3`)
- GitHub-flavored Markdown — tables, task lists, strikethrough, autolinks
- **Syntax-highlighted fenced code blocks** — 26 languages via Shiki, grammars loaded on
  demand, coloured from the same palette as the editor so they stay readable on every theme
- **Frontmatter panel** — YAML metadata lifted into a collapsible panel instead of leaking
  into the rendered document
- Rendered in a Web Worker and sanitized before it reaches the DOM
- Document outline, live word/character counts, read-time estimate
- Export to standalone HTML, Markdown or plain text

**Work with files and folders**

- **Session restore** — open tabs, caret positions, view mode and workspace return on launch.
  Files that moved or were deleted are dropped quietly, not reopened as errors
- Workspace explorer: browse lazily, create, rename, duplicate, trash
- **Deletes always go to the recycle bin.** There is no hard delete anywhere in the app
- Workspace search with regex, case and whole-word toggles, honouring `.gitignore`
- Command palette (`Ctrl+Shift+P`), fuzzy-matched; every command is keyboard-bindable

**Ten themes, all measured**

Apple Dark · Apple Light · Midnight Blue · GitHub · Nord · Catppuccin · Everforest ·
Solarized Light · Minimal Monochrome · High Contrast

Every one is held to WCAG 2.2 floors by an automated test — 4.5:1 for text, 3:1 for accent and
status colours, plus a minimum separation across the text hierarchy. A palette that fails is a
build failure, not a shipped regression.

**Windows integration**

- "Open with Notepad Super Plus" in Explorer's context menu for `.md`, `.markdown`, `.mdown`,
  `.mkd`, `.mdx`, `.txt`
- File associations, single-instance launch, files opened from the command line
- Per-user install — no admin rights needed

**Files handled honestly**

- UTF-8 / UTF-16 / BOM and LF / CRLF detected and **preserved**, never silently rewritten
- Atomic saves — a crash mid-write cannot truncate your file
- External-change detection: clean buffers reload, dirty buffers raise a conflict banner

**Privacy** — zero telemetry, zero network calls. No update check, no crash reporter, no remote
resources in the preview. Strict CSP with no remote origin in any directive.

## Known limitations

Read these before installing. They are stated rather than implied.

| | |
|---|---|
| **Installers are unsigned** | SmartScreen will warn on download. A code-signing certificate is a purchase, not an engineering step. See [INSTALL.md](INSTALL.md) for what the warning means and how to verify the download. |
| **Cold start is ~1.5 s** | Of which **~1 s is Tauri/WebView2 creating the window before any app code runs** — our own Rust setup measures 2–3 ms. The originally documented "< 500 ms" target was not achievable on this architecture; the budget was corrected to gate the part we control (in-page, currently ~483 ms against a 500 ms ceiling). Measurements: [STARTUP_PERFORMANCE.md](reports/STARTUP_PERFORMANCE.md). |
| **No test drives the real window** | 353 TypeScript and 45 Rust tests pass, and 7 of the 10 release-blocking journeys are covered — but the Tauri IPC boundary and the real file dialogs are still verified by hand. Needs a WebDriver; scope in [E2E_COVERAGE.md](reports/E2E_COVERAGE.md). |
| **Fonts are not bundled** | Inter / Geist / JetBrains Mono are named in the token stacks but no font files ship, so on a stock Windows machine you get Segoe UI and Consolas. |
| **No screenshots yet** | The README has none. Specs for the four wanted shots are in `assets/screenshots/README.md`. |

**Not in this release:** math (KaTeX), Mermaid diagrams, GitHub callouts, emoji shortcodes,
`[TOC]`, PDF export, auto-save, crash-draft recovery, smart list continuation, checkbox
toggle-from-preview, and a portable build.

## Install

Download `Notepad Super Plus_1.0.0_x64-setup.exe` and run it. Full instructions, checksum
verification and uninstall steps: [INSTALL.md](INSTALL.md).

```powershell
Get-FileHash '.\Notepad Super Plus_1.0.0_x64-setup.exe' -Algorithm SHA256
```

Compare against `SHA256SUMS.txt` in the release assets.

## Feedback

[GitHub Issues](https://github.com/sosakib/NotepadSuperPlus/issues) ·
full history in [CHANGELOG.md](../CHANGELOG.md)
