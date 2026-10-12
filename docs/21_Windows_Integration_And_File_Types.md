# 21 — Windows Integration, File Types, and Icons

**Related:** [03_System_Architecture.md](03_System_Architecture.md) · [05_Component_Design.md](05_Component_Design.md) · [08_Security_Model.md](08_Security_Model.md) · [reports/V15_AUDIT.md](reports/V15_AUDIT.md)

How the app integrates with Windows, how it decides what a file *is*, and how file icons
are meant to grow. Written against the frameless-title-bar release.

---

## 1. The frameless window

`tauri.conf.json` sets `decorations: false`, so Windows draws no caption bar and
`src/shell/TitleBar.tsx` is the caption bar.

### 1.1 What the app implements

| Piece | Where |
|---|---|
| Caption strip, brand, drag region | `src/shell/TitleBar.tsx` |
| Minimize / maximize-restore / close | `src/shell/WindowControls.tsx` |
| Win11 caption-button metrics (46px, square, full-bleed hover, red close) | `src/styles/shell.css` |
| ACL grants for the four window commands | `src-tauri/capabilities/default.json` |

### 1.2 What the app deliberately does *not* implement

This is the important half. Each of these is handled correctly by the operating system or
by `tao`, and reimplementing it would replace working platform behaviour with a worse copy:

| Behaviour | Handled by |
|---|---|
| Resize on all eight edges, per-monitor DPI | `tao` `WM_NCHITTEST` — full hit test for undecorated, resizable, non-maximized windows |
| Maximized window not covering the taskbar | `tao` `WM_NCCALCSIZE` — clamps the client rect to the monitor's work area, reserving 1px for auto-hide taskbars |
| Aero Snap, drag-to-top-maximize, drag-to-edge | Windows — `start_dragging` issues a real `WM_NCLBUTTONDOWN`/`HTCAPTION`, so this is a genuine caption drag |
| Double-click to maximize | Tauri's injected `drag.js` → `internal_toggle_maximize` |
| Rounded corners and drop shadow on Windows 11 | DWM, because `shadow` defaults to `true` |
| Buttons not swallowing drags | Tauri's `drag.js` treats `BUTTON`/`A`/`INPUT`/interactive roles as drag-blocking |

**If a title-bar bug appears, check whether the OS already solves it before writing code.**

### 1.3 The ACL is load-bearing

`core:window:default` grants read-only queries plus `allow-internal-toggle-maximize`. It
does **not** grant `allow-start-dragging`. Dragging therefore requires an explicit grant,
and without it the title bar maximizes on double-click but silently refuses to drag, with
the failure visible only in the webview console.

The capability grants exactly five window permissions and no more:

```
core:window:allow-start-dragging     data-tauri-drag-region
core:window:allow-minimize           minimize button
core:window:allow-toggle-maximize    maximize/restore button
core:window:allow-unmaximize         restore path
core:window:allow-close              close button
```

Everything else — `set-position`, `set-size`, `set-decorations`, `set-always-on-top` — stays
ungranted because the UI never performs it.

### 1.4 Snap Layouts: not implemented, and why

The Windows 11 flyout that appears when hovering a maximize button requires the window to
return `HTMAXBUTTON` from `WM_NCHITTEST`. `tao` returns only the eight resize directions and
exposes no override, so delivering it means subclassing the window procedure through raw
Win32 — which `#![forbid(unsafe_code)]` (`src-tauri/src/lib.rs:7`) rules out.

Users keep Aero Snap, `Win`+`Z` (which opens Snap Layouts for any window) and `Win`+arrow.
Only the hover affordance is missing. Revisit only if the project ever accepts a narrow,
reviewed `unsafe` shim.

---

## 2. Explorer integration

`src-tauri/windows/hooks.nsh` registers a verb per extension:

```
SHCTX\Software\Classes\SystemFileAssociations\<ext>\shell\NotepadSuperPlus
```

`SystemFileAssociations` is the Windows-recommended way to add a verb to a file type
**without** claiming its default handler. Registering ~85 extensions therefore adds a
right-click entry to `.json` and `.py` without taking those types away from VS Code.

### 2.1 Rules for editing the extension list

- **Add to `NSP_EACH_EXT` and nowhere else.** That macro takes the action macro as a
  parameter, and both the install and uninstall hooks apply it, so the two sets cannot
  diverge. A divergence leaves registry keys behind after uninstall.
- **Register each extension exactly once.** In particular, do not also register the `text`
  perceived-type key: extensions carrying `PerceivedType=text` would match twice and show
  two identical menu entries.
- **Extensionless names cannot be registered.** `Dockerfile`, `Makefile` and `LICENSE` have
  no extension for Windows to key on. Dotfiles can be: Windows treats `.gitignore` as the
  extension.

### 2.2 Placement and scope limits

- **Windows 11** lists the entry under *Show more options*. Top-level placement needs an
  `IExplorerCommand` COM handler with package identity (MSIX sparse package + signed COM
  DLL) — a packaging project, and blocked while the installers are unsigned.
- **The MSI target gets no context menu.** `installerHooks` is NSIS-only.

### 2.3 Default handlers stay at Markdown and `.txt`

`bundle.fileAssociations` in `tauri.conf.json` is intentionally *not* expanded past
Markdown and `.txt`. Registering a ProgID for `.json` or `.py` can make this app the default
handler for a type another editor owns; silently doing that is how an app gets uninstalled.
The right-click entry is what users asked for and it costs nothing.

---

## 3. Deciding what a file is

Three independent questions, three different answers:

| Question | Answered by | Covers |
|---|---|---|
| How do I highlight it? | `src/editor/languages.ts` → `LanguageDescription.matchFilename` | 223 extensions + filename patterns (`Dockerfile`, `CMakeLists.txt`, `Jenkinsfile`, `Gemfile`) |
| What do I call it? | `src/editor/languageLabels.ts` | the same 223, plus formats with no grammar |
| Does the preview apply? | `isMarkdownFilename` | Markdown only |

### 3.1 Why the label table is generated

`state/documents.ts` imports the label module on the boot path. Importing
`@codemirror/language-data` there once pulled ~550 kB of editor into the initial chunk of an
app whose first screen has no editor on it, so the label cannot be looked up at runtime.

`scripts/gen-language-labels.mjs` emits `languageLabels.generated.ts` at build time — 223
extensions of plain strings, no CodeMirror import, no boot cost. `languageLabels.test.ts`
re-derives the map from the dependency and fails if they disagree, so upgrading
`@codemirror/language-data` without regenerating breaks the build instead of silently
shipping stale labels.

```bash
node scripts/gen-language-labels.mjs
```

`OVERRIDES` in `languageLabels.ts` is the only hand-maintained part. Entries belong there for
exactly two reasons — the format has no grammar upstream (`.bat`, `.csv`, `.log`), or upstream
names it badly for a status bar (`.ini` resolves to "Properties files"). Anything already
correct in the generated table stays out of it.

### 3.2 Preview is gated at the controller, not the caller

Four places request a render: open, reload, every keystroke, and the active-document effect.
The Markdown check lives in `renderController.requestRender` so that all four are covered and
a fifth cannot forget. `EditorArea` separately derives the *effective* view mode
(non-Markdown ⇒ Source) and `ViewModeSwitch` disables Preview and Split with a reason.

View mode remains **global** application state. Making it per-document would be a session
format migration for no user-visible gain — deriving the effective mode handles every route
into a code file, including a restored session that was left in Preview.

---

## 4. File icons

`src/editor/fileIcons.ts` maps a **language id** to an icon, with a category fallback.

### 4.1 Why language id, not extension

`DocMeta.languageId` is already computed for every document at open and at save, and covers
all 223 extensions. Keying on it means 223 extensions collapse to ~120 icon slots, aliases
resolve for free (`.yml`/`.yaml` are one "YAML"; `.cc`/`.cpp`/`.cxx` one "C++"), and the
status-bar label and the icon can never disagree about what a file is.

### 4.2 Adding real icon assets

`ICONS` is the only thing that changes:

1. Drop assets into `src/assets/icons/`.
2. Either point entries at components that render them, or widen `FileIconSpec` from
   `LucideIcon` to `LucideIcon | string` and branch once at the call site.
3. Add one map entry per language id.

Consumers (`TabBar`, and any future `ExplorerPanel` use) ask for an icon by language id and
never learn which representation won, so no consumer changes either way.

### 4.3 What was deliberately not built

No icon-theme registry, no pluggable providers, no per-extension overrides, no
user-selectable icon packs. There is one icon set and no requirement for a second. A lookup
table with a fallback is the entire feature until that changes; the extension point above is
the map itself.

---

## 5. Checklist for changing any of this

- Added an extension to the context menu → it went in `NSP_EACH_EXT`, once.
- Added a window command → it has a matching `core:window:allow-*` grant, and only that one.
- Added a language → nothing to do; the generated table already covers it. If it has no
  grammar upstream, add an `OVERRIDES` entry and a test case.
- Upgraded `@codemirror/language-data` → re-run the generator; the drift test will tell you.
- Tempted to fix a title-bar behaviour in CSS or JS → check §1.2 first.
