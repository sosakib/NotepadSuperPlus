# Notepad Super Plus 0.9.0

**First public pre-release** · Windows 10/11 x64 · MIT

A lightweight desktop Markdown editor: a CodeMirror 6 source pane, a sanitized GitHub-flavored
live preview, a workspace explorer with full-text search, and a keyboard-first shell. No accounts,
no paid tier, no telemetry.

## Why 0.9 and not 1.0

The feature set is close to final and the app is stable enough for daily use, but four things are
still open that a 1.0 should not have. They are listed under **Known limitations** below and
tracked in [`docs/reports/REMAINING_TASKS.md`](reports/REMAINING_TASKS.md). Shipping this as 1.0
would be a claim the code cannot back.

## Highlights

**Editing and preview**
- Source / Preview / Split view modes with synced scrolling (`Ctrl+1` `Ctrl+2` `Ctrl+3`)
- GitHub-flavored Markdown — tables, task lists, strikethrough — rendered in a Web Worker and
  sanitized before it reaches the DOM
- Document outline, live word and character counts, read-time estimate
- Export to standalone HTML, Markdown or plain text

**Workspace**
- **Session restore** — your open tabs, caret positions, view mode and workspace folder come
  back exactly as you left them. Files that moved or were deleted are dropped quietly instead of
  reopening as errors.
- Folder explorer with lazy loading; create, rename, duplicate, trash (deletes always go to the
  OS recycle bin, never a hard delete)
- Workspace search with regex, case and whole-word toggles, respecting `.gitignore`
- Command palette (`Ctrl+Shift+P`) with fuzzy matching; every command is keyboard-bindable

**Appearance**
- **10 themes** — Apple Dark/Light, Midnight Blue, GitHub, Nord, Catppuccin, Everforest,
  Solarized Light, Minimal Monochrome, High Contrast
- Every theme is held to WCAG 2.2 contrast floors by an automated test, so an unreadable palette
  fails CI rather than shipping
- Follows the OS light/dark preference

**Windows integration**
- "Open with Notepad Super Plus" in Explorer's right-click menu for `.md`, `.markdown`, `.mdown`,
  `.mkd`, `.mdx`, `.txt`
- File associations, single-instance launch, files opened from the command line
- Per-user install — no admin rights required

**File handling**
- UTF-8 / UTF-16 / BOM and LF / CRLF detected and preserved, never silently rewritten
- Atomic saves
- External-change detection: clean buffers reload silently, dirty buffers show a conflict banner

## Known limitations

Read these before installing.

| | |
|---|---|
| **Startup takes ~1.4 s** | Down from ~2 s, and the boot payload is 82 % smaller — but ~950 ms of that is Tauri/WebView2 initialising before any of our code runs, so it cannot go much lower. The original "under 500 ms" target was not achievable; see [STARTUP_PERFORMANCE.md](reports/STARTUP_PERFORMANCE.md). |
| **Installers are unsigned** | SmartScreen will warn on download. See [INSTALL.md](INSTALL.md). |
| **No end-to-end tests** | 342 unit tests and 36 Rust tests pass, but no automated test clicks through a real window. |

Also absent in this release: math (KaTeX), Mermaid diagrams, GitHub callouts, emoji shortcodes,
`[TOC]`, PDF export, auto-save, crash-draft recovery, and smart list continuation.

## Install

Download `Notepad Super Plus_0.9.0_x64-setup.exe` and run it. Full instructions, checksum
verification and uninstall steps: [INSTALL.md](INSTALL.md).

Verify your download against `SHA256SUMS.txt`:

```powershell
Get-FileHash '.\Notepad Super Plus_0.9.0_x64-setup.exe' -Algorithm SHA256
```

## Privacy

No telemetry, no analytics, no network calls of any kind. No update check, no crash reporter, no
remote resources in the preview. The WebView runs under a strict CSP with no remote origin in any
directive.

## Feedback

Bugs and feature requests: [GitHub Issues](https://github.com/sosakib/NotepadSuperPlus/issues).
Full history: [CHANGELOG.md](../CHANGELOG.md).
