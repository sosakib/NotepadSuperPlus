# Notepad Super Plus 1.0.1

**Patch release** · Windows 10/11 x64 · MIT

Fixes from a security and robustness audit of 1.0.0, several of which could lose unsaved work.
No new features, no file-format or settings changes. Updating is recommended for everyone on
1.0.0 — install over the top; settings, recent files and your session are kept.

## Fixed — could lose or corrupt your work

- **Clicking a link in the preview replaced the app with that web page.** The editor unloaded
  along with every unsaved document, and the remote page rendered inside the app window.
  Now: `#heading` links scroll the preview, web and `mailto:` links open in your browser, and
  nothing else does anything. A second guard in the Rust core refuses to load any other page
  even if a link slips through.
- **Closing the window threw away unsaved edits.** Closing a *tab* asked first; X and Alt+F4
  did not. The window now lists the unsaved documents and asks.
- **Saving in a legacy encoding silently corrupted characters.** Typing an emoji into a
  windows-1252 file and saving wrote the literal text `&#128512;`. The save now stops with a
  clear message and the file on disk is left untouched — save it as UTF-8 instead.
- **New file and Duplicate could overwrite a file that appeared at the same moment**, for
  example one just synced by OneDrive or Dropbox. Both now claim the name atomically.
- **A crash while updating the recent-files list could wipe it.** It is now written the same
  atomic way as settings and session.

## Fixed — everything else

- A session restored in **Preview** mode showed "Nothing to preview yet" for every tab.
- Renaming only the capitalisation of a file (`notes.md` → `Notes.md`) failed with
  "already exists".
- A file opened from Explorer during startup could be silently dropped.
- The explorer treated `C:\notes-old` as part of a workspace at `C:\notes`.
- Opening a second folder left the first one's file watcher running in the background.
- Saving inside a workspace briefly flashed a temporary file in the explorer.
- An internal error in one background task could take the whole app down with it.

## Security and build

- Regression tests now hold the preview sanitizer to 23 known XSS payloads and fail the build
  if the content-security policy or window permissions are ever loosened.
- CodeQL analysis (TypeScript and Rust) and dependency audits run on every change; all CI
  actions are pinned to exact commits.
- The only new permission is opening `http(s)`/`mailto` links in the system browser.

## Known limitations

Unchanged from 1.0.0 unless noted.

| | |
|---|---|
| **Installers are unsigned** | SmartScreen will warn on download. See [INSTALL.md](https://github.com/sosakib/NotepadSuperPlus/blob/main/docs/INSTALL.md) for what the warning means and how to verify the download. |
| **Cold start is 0.6–1.5 s, and it depends heavily on your machine** | Most of it is Tauri/WebView2 creating the window *before any app code runs*. Measurements: [STARTUP_PERFORMANCE.md](https://github.com/sosakib/NotepadSuperPlus/blob/main/docs/reports/STARTUP_PERFORMANCE.md). |
| **No test drives the real window** | 391 TypeScript and 50 Rust tests pass, but the Tauri IPC boundary and real file dialogs are still verified by hand. Scope in [E2E_COVERAGE.md](https://github.com/sosakib/NotepadSuperPlus/blob/main/docs/reports/E2E_COVERAGE.md). |
| **Fonts are not bundled** | On a stock Windows machine you get Segoe UI and Consolas. |
| **Local images don't show in the preview** | `![](./pic.png)` is blocked by design (privacy and CSP); planned as a scoped feature. |

**Not in this release:** math (KaTeX), Mermaid diagrams, GitHub callouts, emoji shortcodes,
`[TOC]`, PDF export, auto-save, crash-draft recovery, smart list continuation, checkbox
toggle-from-preview, and a portable build.

## Install

Download `Notepad.Super.Plus_1.0.1_x64-setup.exe` and run it — it upgrades 1.0.0 in place.
Full instructions, checksum verification and uninstall steps: [INSTALL.md](https://github.com/sosakib/NotepadSuperPlus/blob/main/docs/INSTALL.md).

```powershell
Get-FileHash '.\Notepad.Super.Plus_1.0.1_x64-setup.exe' -Algorithm SHA256
```

Compare against `SHA256SUMS.txt` in the release assets.

## Feedback

[GitHub Issues](https://github.com/sosakib/NotepadSuperPlus/issues) ·
full history in [CHANGELOG.md](https://github.com/sosakib/NotepadSuperPlus/blob/main/CHANGELOG.md)
