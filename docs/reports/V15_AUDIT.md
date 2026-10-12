# v1.5 Audit — Explorer integration, title bar, file types, icons

**Date:** 2026-08-01 · **Branch:** `feature/v1.5` · **Base:** `main` @ `476798d` (tag `v1.0.0`)

Phase 1 deliverable. Every claim below was verified against the repo, the installed
dependency tree, or the `tao`/`tauri` crate sources on this machine — not recalled.
File:line references are real.

---

## 0. Baseline (measured, this machine, this commit)

| Metric | Value | How |
|---|---|---|
| Frontend tests | **353 passing / 18 files** | `pnpm test` |
| `dist` total | **7.02 MiB across 183 files** | `pnpm build`, byte sum |
| `dist` initial load | **240.5 KiB** (`index.js` + `index.css` + `react.js`) | chunks referenced from `dist/index.html` |
| Grammars available | **143**, 124 with extension maps, **223 unique extensions** | `@codemirror/language-data` at runtime |
| Extensions labelled | **56** (51 table entries + 5 Markdown) | `src/editor/languageLabels.ts` |
| Context-menu extensions | **6** | `src-tauri/windows/hooks.nsh` |
| OS file associations | **6** (`md`,`markdown`,`mdown`,`mkd`,`mdx`,`txt`) | `src-tauri/tauri.conf.json:44-59` |
| NSIS installer | **3,131,557 B** (2.99 MiB) | v1.0 bundle on disk |

**After this work** (same machine, same commands):

| Metric | Before | After | Δ |
|---|---|---|---|
| Frontend tests | 353 | **370** | +17 |
| Rust tests | 45 | **45** | — |
| `dist` total | 7.02 MiB | **7.04 MiB** | +0.02 |
| `dist` initial load | 240.5 KiB | **262.4 KiB** | +21.9 KiB |
| NSIS installer | 2.99 MiB | **2.99 MiB** (3,137,209 B) | +5.5 KiB |
| Extensions labelled | 56 | **223** | +167 |
| Context-menu extensions | 6 | **~85** | +79 |

The +21.9 KiB on the initial chunk is roughly 15 KiB of `@tauri-apps/api/window` (required by
the window controls), ~4 KiB of generated label table, and ~3 KiB of additional lucide glyphs.
The installer stayed at 2.99 MiB against a **< 15 MB** budget.

> **Correction to the handover.** `V1.5_HANDOVER.md:59` states `dist ≈ 2.46 MB`. The measured
> total is **7.02 MiB**; 2.46 MB is close to the *gzip* total of the initial chunks plus the
> eager entry graph, not the on-disk bundle. The number that governs the installer budget is
> the 7.02 MiB figure. Recorded here so the next session compares against a real baseline.

The three "measure before/after" numbers for this release are: **353 tests**, **7.02 MiB `dist`**,
**240.5 KiB initial load**.

---

## 1. Scope reconciliation

The SUPER PROMPT and `V1.5_HANDOVER.md` describe **different** work:

| | Handover Tier 1 | SUPER PROMPT |
|---|---|---|
| Content | KaTeX, Mermaid, callouts, PDF/print, auto-save, `[TOC]` | Explorer integration, integrated title bar, file-type support, icon architecture |

They intersect only at handover **§6, "Carry-over: code-file support gaps"** — its four items are
SUPER PROMPT Features 1 and 3. This audit executes the **SUPER PROMPT**. The Tier 1 rendering
features are untouched and remain available for a later pass; nothing here forecloses them.

---

## 2. Current architecture

Verified as described in the handover §4. The parts this work touches:

```
src/shell/          AppShell → TitleBar · ActivityRail · Sidebar · EditorArea · StatusBar
src/editor/         languages.ts (grammar resolution) · languageLabels.ts (status-bar label)
src/state/          Zustand: ui.ts (viewMode, panels) · documents.ts (DocMeta per tab)
src/actions/        fileActions.ts (open/save dialogs)
src-tauri/          tauri.conf.json (window + bundle) · capabilities/default.json (ACL)
src-tauri/windows/  hooks.nsh (NSIS install/uninstall hooks)
```

Four constraints from the handover were re-verified and hold:

- **(a)** `render.ts:16` — pipeline is DOM-free and worker-hosted.
- **(b)** `render.ts:177-192` — sanitizer schema is tight; `style` forbidden, `className` allowed on 6 tags only.
- **(c)** `tauri.conf.json:27` — CSP locked, `script-src 'self'`, no `unsafe-eval`.
- **(d)** `#![forbid(unsafe_code)]` at `src-tauri/src/lib.rs:7`. **This one decides Feature 2's ceiling** (§4.4).

---

## 3. Feature 1 — Windows Explorer integration

### What exists

**Shell integration is already built and correct in design.** `src-tauri/windows/hooks.nsh` registers
an explicit verb under `SystemFileAssociations`:

```
SHCTX\Software\Classes\SystemFileAssociations\<ext>\shell\NotepadSuperPlus
  (default) = "Open with Notepad Super Plus"
  Icon      = "$INSTDIR\<exe>"
  \command  = '"$INSTDIR\<exe>" "%1"'
```

This is the Windows-recommended way to add a verb without stealing the default handler, and
`SHCTX` correctly resolves to `HKCU` for the per-user install (`installMode: "currentUser"`).
`SHChangeNotify(SHCNE_ASSOCCHANGED)` fires after both install and uninstall.

The receiving end is complete too: `tauri-plugin-single-instance` forwards a second launch's argv
(`lib.rs:303-312`), `paths_from_args` (`lib.rs:38-54`) canonicalizes and filters to existing files,
and `useCliOpen` consumes them. **Right-click → open already works end to end for 6 extensions.**

### The actual gap

Only the extension **list** is short — 6 of the ~80 the prompt asks for. Nothing structural.

### Defects found in the existing hook

1. **The list is duplicated.** `NSIS_HOOK_POSTINSTALL` and `NSIS_HOOK_PREUNINSTALL` each spell out
   all 6 extensions independently. At 6 entries that is survivable; at 80 it guarantees an
   eventual mismatch, and a mismatch means **orphaned registry keys after uninstall** — exactly
   the "broken uninstall" the prompt forbids. This must be fixed before the list grows.
2. **MSI gets nothing.** `installerHooks` is an NSIS-only field (`tauri.conf.json:62`). The MSI
   target ships without a context menu. Pre-existing, unchanged by this work, worth documenting.

### Constraints that shape the fix

- **Windows 11 placement.** A `SystemFileAssociations\...\shell\` verb is a *legacy* shell verb.
  Windows 11 shows it under **"Show more options"** (Shift+F10), not in the compact top-level menu.
  Top-level placement requires an `IExplorerCommand` COM handler with package identity (MSIX sparse
  package + a COM DLL). That is a packaging and signing project, not a registry change, and the
  installers are still unsigned (`RELEASE_NOTES.md:60`). **Out of scope; documented, not attempted.**
  This is the same placement Notepad++, 7-Zip, and VS Code's own installer entry get.
- **Idempotency.** `WriteRegStr` overwrites, so re-running the installer cannot duplicate a key.
  Duplicate *menu entries* would only arise from registering the same extension twice through two
  different keys (e.g. both `.txt` and the `text` perceived-type key). The fix must not do that.
- **Upgrades.** Tauri's NSIS installer runs the previously installed uninstaller before installing.
  A v1.0 → v1.5 upgrade therefore removes the old 6 keys with the old uninstaller and writes the
  new set with the new installer. No orphans, provided item 1 above is fixed.
- **Extensionless files.** `Dockerfile`, `Makefile`, `LICENSE` cannot be registered — Windows keys
  the verb on the extension. `.gitignore` *can*: Windows treats the whole name as the extension.

**Reuse verdict: extend `hooks.nsh`. Do not replace it.**

---

## 4. Feature 2 — Integrated title bar

### What exists

`src/shell/TitleBar.tsx` is **already a custom in-app header** — brand button, `ViewModeSwitch`,
and four `IconButton`s, laid out as a 3-column grid at `--titlebar-height: 42px`
(`shell.css:4-61`, `global.css:29`).

The problem is not that the app lacks a title bar. It is that `tauri.conf.json:14-24` **omits
`decorations`**, which defaults to `true` — so Windows draws its own caption bar *above* the app's.
Two title bars, stacked.

### What has to change

| # | Change | Where |
|---|---|---|
| 1 | `"decorations": false` | `tauri.conf.json` window config |
| 2 | Drag region + window controls | `TitleBar.tsx` |
| 3 | ACL permissions for the control buttons | `capabilities/default.json` |
| 4 | Relocate `ViewModeSwitch` and the action buttons | `TitleBar.tsx` → `EditorArea`/`ActivityRail` |

### 4.1 The ACL is the blocking detail

`capabilities/default.json` grants `core:default` + `dialog:default`. Reading the generated manifest
at `src-tauri/gen/schemas/acl-manifests.json`, `core:window:default` contains **28 permissions, all
read-only queries plus `allow-internal-toggle-maximize`**. It does **not** contain
`allow-start-dragging`, `allow-minimize`, `allow-maximize`, `allow-unmaximize`, or `allow-close`.

This matters because of how `data-tauri-drag-region` actually works. From the Tauri 2.11.5 source
(`tauri-2.11.5/src/window/scripts/drag.js:103-104`), the injected handler is:

```js
const cmd = e.detail === 2 ? 'internal_toggle_maximize' : 'start_dragging'
window.__TAURI_INTERNALS__.invoke('plugin:window|' + cmd)
```

So **double-click-to-maximize already works** under the current capability, but **dragging does
not** — it needs `core:window:allow-start-dragging`. Adding the attribute without the permission
produces a title bar that maximizes on double-click and does nothing on drag, with the failure only
visible in the webview console. This is the single most likely way to ship this feature broken.

### 4.2 Resize regions: already handled, write no code

`tao-0.35.3/src/platform_impl/windows/event_loop.rs:2177-2224` handles `WM_NCHITTEST` for
undecorated windows: when the window is undecorated, resizable, not fullscreen and not maximized,
it runs full 8-direction hit testing against `SM_CXFRAME`/`SM_CYFRAME` at the window's DPI. With
`shadow: true` (the default — `tauri-utils/src/config.rs:2094`, `default_true`) it handles the top
edge and DWM's extended frame covers the rest.

**No custom resize borders, no CSS resize handles, no JS hit testing.** The OS already does it,
per-monitor-DPI-aware. Writing any of that would be the "hack around the operating system" the
prompt forbids.

### 4.3 Maximized clipping: also already handled

The classic undecorated-window bug — maximizing pushes the client area ~8px past every screen edge
and over the taskbar — is handled at `event_loop.rs:2134-2163`. On `WM_NCCALCSIZE` for a maximized
borderless window, tao clamps the client rect to the monitor's `rcWork`, and reserves 1px on any
edge holding an auto-hide taskbar so it can still be summoned.

**No maximize padding class, no `is-maximized` CSS compensation.** Adding one would double-inset.

**Measured on the release build** (2560×1440 monitor, taskbar at the bottom):

```
maximized client rect : 0,0 .. 2560,1392
monitor work area     : 0,0 .. 2560,1392   ← identical
monitor bounds        : 0,0 .. 2560,1440
```

Note the distinction, because it will mislead the next person to check: the *window* rect does
overhang, reading `-8,-8 .. 2568,1400`. That is normal and is not a bug — `WM_NCCALCSIZE` clamps
the **client** rect, which is what gets painted. Probe `GetClientRect` + `ClientToScreen`, not
`GetWindowRect`, or you will "find" a taskbar-covering bug that does not exist.

Two related style facts, also measured, that look alarming and are not: the window keeps
`WS_CAPTION` set (tao leaves the style bit and kills the frame in `WM_NCCALCSIZE` instead), and
it keeps `WS_THICKFRAME`, `WS_MAXIMIZEBOX` and `WS_SYSMENU` — which is precisely why OS resize,
Aero Snap, `Win`+arrow and the Alt+Space system menu all still work on a frameless window.

### 4.4 Snap Layouts: cut, with a reason

Windows 11's snap-layout flyout appears when a window returns **`HTMAXBUTTON`** from `WM_NCHITTEST`
while the cursor is over its maximize button. `tao`'s handler returns only the eight resize
directions and never `HTMAXBUTTON`, and there is no Tauri API to override it. Delivering it means
subclassing the window procedure through raw Win32 — which `#![forbid(unsafe_code)]`
(`lib.rs:7`) forbids, and the handover lists as non-negotiable (`§8`).

**Verdict: not implemented.** The prompt qualified this one as "if possible"; it is not, at the
project's stated safety posture. What users still get, unchanged:

- **Aero Snap works.** `start_dragging` issues `ReleaseCapture` + `WM_NCLBUTTONDOWN`/`HTCAPTION`,
  so Windows treats it as a genuine caption drag — drag-to-top maximizes, drag-to-edge snaps.
- **`Win`+`Z` opens Snap Layouts**, and `Win`+arrow snapping works. Both are OS-level and need
  nothing from the app.

Only the *hover-the-maximize-button* affordance is missing. Revisit if the project ever relaxes
`forbid(unsafe_code)` for a narrow, reviewed Win32 shim.

### 4.5 Free wins from `decorations: false` on Windows 11

`shadow` defaults to `true`, and per `tauri-utils/src/config.rs:2085-2091` that gives an undecorated
window a 1px border **and rounded corners on Windows 11**, drawn by DWM. The frameless look comes
with correct corner rounding and a real drop shadow at no cost.

### 4.6 The layout question the prompt creates

The prompt requires the top bar contain "only" the icon and name, plus the window buttons. Today it
also holds `ViewModeSwitch` and four action buttons. Both need a home:

- `ViewModeSwitch` is **per-document** state — it belongs beside the tab strip, which is where
  VS Code and Obsidian put the equivalent control. `EditorArea` renders `TabBar` already.
- Palette / Export / Settings / About are **global** — the `ActivityRail` bottom group already
  holds Settings and Theme, so it is the established home for global toggles. Settings is
  currently duplicated in both places.

Neither is a redesign; both are moves into containers that already exist and already hold
controls of that kind.

---

## 5. Feature 3 — Major file type support

### The single most important finding

**Syntax highlighting for every requested language already works.**
`src/editor/languages.ts:30-37` calls `LanguageDescription.matchFilename(languages, filename)` and
awaits `desc.load()`. Measured against the installed `@codemirror/language-data`: **143 grammars,
223 unique extensions**, each lazily imported so no grammar is in the startup bundle. Every language
named in the prompt resolves, and `matchFilename` additionally handles filename patterns —
`Dockerfile`, `CMakeLists.txt`, `Jenkinsfile`, `Gemfile`, `Rakefile`, `PKGBUILD` — for free.

Of the prompt's extension list, exactly five have no grammar in `language-data`:
`.txt`, `.log`, `.env`, `.csv`, `.bat`. The first three *are* plain text. `.csv` and `.bat` have no
CodeMirror 6 mode anywhere (`@codemirror/legacy-modes`, already present transitively, has PowerShell
and Shell but no Batch). They can be correctly **labelled** but not highlighted.

So Feature 3 is not "add language support". It is **surfacing** support that already ships.

### The four real gaps

**1. Preview mangles code files — the only genuine bug.**
`EditorArea.tsx:66-70` requests a Markdown render for the active document unconditionally, and
`viewMode` lives in `ui.ts:41` as **global** state, not per-document. Open a `.py`, press `Ctrl+2`,
and the Python source goes through remark/rehype: `#` comments become `<h1>`, `*args` becomes
emphasis, indented blocks become code fences. It also burns worker time rendering something no one
should see. Fix: derive "is Markdown" from the document and force Source for everything else,
disabling the Preview/Split controls rather than silently ignoring them.

**2. Labels cover 56 of 223 extensions.**
`languageLabels.ts:23-80` is a hand-maintained table. A `.dart` file highlights perfectly and reads
"Plain Text" in the status bar. The table is deliberately CodeMirror-free — the file's own header
comment records that importing `language-data` here once pulled ~550 kB of editor into the boot
chunk, because `documents.ts:2` imports it on the startup path. **That constraint is real and must
be preserved**, which rules out simply calling `matchFilename` for the label.

**3. Open dialog is Markdown-first.** `fileActions.ts:20-23` offers only "Markdown (md/markdown/txt)"
and "All Files". Opening a `.rs` requires switching to All Files first.

**4. OS file associations claim 6 extensions** (`tauri.conf.json:44-59`). Distinct from Feature 1's
context menu: this sets the *default handler*. Left alone deliberately — see §7.

---

## 6. Feature 4 — File icon architecture (design only)

Current icon usage is two hardcoded lucide glyphs: `FileText` in `TabBar.tsx:62`, `FolderOpen` in
`ExplorerPanel.tsx:49`. There is no icon abstraction, and nothing needs one yet.

The design constraint worth naming now: **the key must be the language id, not the extension.**
`DocMeta.languageId` (`documents.ts:15`) already exists, is already computed for every document at
open and save, and after §5 gap 2 it will cover all 223 extensions. Keying icons off `languageId`
means 223 extensions collapse to ~140 icon slots, aliases resolve for free (`.yml`/`.yaml` are one
"YAML"), and adding an icon later is a one-line map entry rather than a code change.

---

## 7. Decisions taken, and one flagged for the owner

**Taken — file associations stay at 6.** The prompt's Feature 1 asks for a *right-click entry*, and
the `SystemFileAssociations` verb delivers exactly that without touching defaults. Expanding
`bundle.fileAssociations` is a different act: it registers ProgIDs and, on a fresh install of a
type nothing else claims, can make this app the default handler for `.json` or `.py`. Handover §10.3
flags that as a real user-hostility risk and `§6.3` says it should be opt-in if done at all.
Doing nothing here is both the lazy and the correct call.

**Flagged — the MSI target gets no context menu.** Fixing it means WiX registry fragments, roughly
duplicating `hooks.nsh` in XML. The NSIS installer is the one the release workflow promotes and the
one users download. Recommend leaving MSI as-is and documenting it; raise if MSI is a supported path.

---

## 8. Reuse summary

| Feature | Reuse | Build new |
|---|---|---|
| 1 · Explorer | `hooks.nsh` macros, `SHCTX`, `SHChangeNotify`, single-instance argv path | One shared extension list, consumed by both hooks |
| 2 · Title bar | `TitleBar.tsx`, `IconButton`, tao's hit-test + `WM_NCCALCSIZE`, `data-tauri-drag-region` | Window-control buttons, 5 ACL entries, `decorations: false` |
| 3 · File types | `languages.ts` resolution (all 223 exts), `DocMeta.languageId`, `ViewModeSwitch` | Generated label table, per-document Markdown gate |
| 4 · Icons | `DocMeta.languageId` as the key | One `languageId → icon` module |

Nothing in this release requires a new runtime dependency.
