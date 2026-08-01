# v1.5 Implementation Plan

**Phase 2 deliverable.** Companion to `V15_AUDIT.md`. Ordered by risk: the feature that can fail
against the operating system goes first, so a cut decision lands on day one rather than week three.

---

## Order and rationale

| # | Feature | Why here | Effort |
|---|---|---|---|
| 1 | **Integrated title bar** | Only item that can fail against the OS. Prove `decorations: false` + drag + resize + maximize on real Windows 11 before anything else is built on top. | ~1 day |
| 2 | **File type support** | Contains the release's only real bug (preview mangling code files). | ~0.5 day |
| 3 | **Icon architecture** | Depends on the canonical `languageId` that lands in #2. | ~1 hour |
| 4 | **Explorer integration** | Zero technical risk, but only verifiable by building and running an installer. Last. | ~0.5 day |
| 5 | Polish, docs, release notes | | ~0.5 day |

---

## Feature 1 — Integrated title bar

### Architecture decisions

**AD-1: Use `decorations: false` + Tauri's own drag region. No custom window management.**
`tao` already handles resize hit-testing (`event_loop.rs:2177`) and maximized work-area clamping
(`event_loop.rs:2134`) for undecorated windows, DPI-aware. The correct implementation is therefore
*subtractive*: turn off decorations, add the attribute, add buttons, write no window code.
Rejected: `window-vibrancy`-style shims, CSS resize handles, JS hit testing — all reimplement
working OS behaviour and all break on multi-monitor mixed DPI.

**AD-2: Snap Layouts hover flyout is not implemented.** Needs `HTMAXBUTTON` from a subclassed
window proc; blocked by `#![forbid(unsafe_code)]`. Aero Snap, `Win`+`Z`, and `Win`+arrow are
unaffected. Documented in the audit §4.4 and in the release notes.

**AD-3: Relocate, don't redesign.** `ViewModeSwitch` moves beside the tab strip (per-document
control, per-document home — matches VS Code and Obsidian). Palette/Export/About join Settings and
Theme in the `ActivityRail` bottom group (global toggles, established home). Settings is currently
in both places; the duplicate goes. No new containers are introduced.

### Affected files

| File | Change |
|---|---|
| `src-tauri/tauri.conf.json` | `"decorations": false` |
| `src-tauri/capabilities/default.json` | + `core:window:allow-start-dragging`, `allow-minimize`, `allow-toggle-maximize`, `allow-unmaximize`, `allow-close` |
| `src/shell/TitleBar.tsx` | drag region; brand + name only; window controls |
| `src/shell/WindowControls.tsx` | **new** — minimize / maximize-restore / close |
| `src/shell/EditorArea.tsx` | host `ViewModeSwitch` beside `TabBar` |
| `src/shell/ActivityRail.tsx` | absorb Palette / Export / About |
| `src/styles/shell.css` | window-control styling, drag-region rules |

### Risks

| Risk | Mitigation |
|---|---|
| Drag silently dead — `allow-start-dragging` missing from the ACL | It is the first thing implemented and the first thing manually verified. Audit §4.1. |
| Buttons steal drag events | Tauri's `drag.js:32-40` already treats `BUTTON` as non-draggable. Nothing to do; verify. |
| Text selection while dragging | `.titlebar` already sets `user-select: none` (`shell.css:23`). |
| Maximize icon out of sync after `Win`+arrow / double-click | Subscribe to the window's resize event rather than tracking a local boolean. |
| `--titlebar-height: 42px` too tight for 32px Win11 buttons | 42px accommodates them; verify optically against a real Explorer window. |

### Testing

- Unit: `WindowControls` renders three buttons with correct labels; degrades to no-op without a
  Tauri runtime (the pattern `fileActions.ts:124` already uses for browser dev).
- Manual on Windows 11: drag, double-click maximize, drag-to-top, drag-to-edge snap, `Win`+arrow,
  `Win`+`Z`, all eight resize edges, taskbar not covered when maximized, light + dark, 100%/150%
  DPI, keyboard shortcuts still fire.

---

## Feature 2 — Major file type support

### Architecture decisions

**AD-4: Generate the label table from `@codemirror/language-data` at build time; commit the output.**
`languageLabels.ts` must stay free of CodeMirror imports — `documents.ts:2` imports it on the boot
path, and the file's own header records that a `language-data` import there cost ~550 kB of startup
bundle. Calling `matchFilename` for a label is therefore not available.

A generator script emits a plain `Record<string, string>` covering all 223 extensions (~4 KB of
short strings, no runtime dependency, no boot cost), and a unit test re-derives the map from
`language-data` and asserts equality — so the table cannot silently rot when the dependency updates.
Rejected: hand-extending the table (rots immediately), lazy-loading the label (a status-bar string
is not worth an async boundary).

**AD-5: Markdown-ness is a property of the document, not of the app.** `viewMode` stays global —
changing it to per-document is a session-format migration for no user-visible gain. Instead the
*effective* view mode is derived: non-Markdown documents render as Source regardless of the stored
mode, and the Preview/Split buttons are disabled with a reason. One helper, `isMarkdownFilename`,
already effectively exists as `MARKDOWN_RE` in `languageLabels.ts:16` — export it rather than
writing a second regex.

**AD-6: Don't render what isn't Markdown.** `EditorArea.tsx:69` requests a render unconditionally.
Gating it on Markdown fixes the bug *and* removes worker time for every code file opened.

### Affected files

| File | Change |
|---|---|
| `scripts/gen-language-labels.mjs` | **new** — generator |
| `src/editor/languageLabels.ts` | generated table; export `isMarkdownFilename` |
| `src/editor/languageLabels.test.ts` | **new** — drift test against `language-data` |
| `src/shell/EditorArea.tsx` | gate render + force Source for non-Markdown |
| `src/shell/ViewModeSwitch.tsx` | disable Preview/Split for non-Markdown |
| `src/actions/fileActions.ts` | add "Code & data" and "Text" filter groups |

### Risks

| Risk | Mitigation |
|---|---|
| Generated table drifts from the dependency | The drift test is the whole point; it fails the build. |
| Labels regress for extensions the hand table named better | Test asserts the current 56 labels are preserved or improved; hand overrides layered on top of the generated base. |
| Boot bundle grows | Measure `dist` initial chunk before/after. Budget: no growth beyond the table's own bytes. |
| A user has a `.py` open in Preview from a persisted session | Effective-mode derivation handles it on restore; nothing to migrate. |

### Testing

- Label for every one of the 223 extensions is non-empty and matches `language-data`.
- `.dart` → "Dart", `.kt` → "Kotlin", `.tsx` → "TypeScript", `.bat` → "Batch", `Dockerfile` → "Dockerfile".
- Existing 56 labels unchanged where they were already correct.
- Opening a `.py` and pressing `Ctrl+2` leaves the editor in Source.
- No render is requested for a non-Markdown document.

---

## Feature 3 — File icon architecture (design + scaffold, no assets)

**AD-7: One module, keyed by `languageId`, with a default.** `src/editor/fileIcons.ts` exports
`iconForDocument(doc)`. It maps `languageId → icon`, falling back to a generic glyph. Consumers
(`TabBar`, `ExplorerPanel`) call the function instead of hardcoding a lucide component.

Adding real assets later is: drop files in `src/assets/icons/`, add map entries. No consumer
changes, no new abstraction, no registry class, no provider, no config. If per-extension overrides
are ever genuinely needed, the map gains a second lookup — but not before, and not speculatively.

Rejected: an icon-theme system with pluggable providers. One implementation, no second consumer,
no requirement — it would be scaffolding for a future that may not arrive.

### Affected files

`src/editor/fileIcons.ts` (new), `src/shell/TabBar.tsx`, `src/sidebar/ExplorerPanel.tsx`.

---

## Feature 4 — Windows Explorer integration

**AD-8: Extend `hooks.nsh`; single-source the extension list.** The registration mechanism is
already correct (audit §3). The list is defined once in a `NSP_FOR_EACH_EXT` macro that takes the
action macro as a parameter, so install and uninstall provably iterate the same set —
removing the class of bug that produces orphaned registry keys.

**AD-9: `bundle.fileAssociations` is not expanded.** The prompt asks for a right-click entry;
`SystemFileAssociations` provides exactly that without touching default handlers. See audit §7.

### Affected files

`src-tauri/windows/hooks.nsh`, plus `docs/INSTALL.md` for the Windows 11 "Show more options" note.

### Risks

| Risk | Mitigation |
|---|---|
| Register/unregister lists diverge → orphaned keys | AD-8 makes divergence structurally impossible. |
| Duplicate menu entries | Register each extension exactly once; do not additionally register the `text` perceived-type key. |
| Upgrade leaves v1.0's keys behind | Tauri's NSIS runs the old uninstaller first; with AD-8 it removes exactly what it wrote. |
| NSIS syntax error breaks the installer build | Verified by building the installer, not by reading. |

### Testing

Build the NSIS installer; install; verify the verb appears for a sampled spread of extensions
(`.md`, `.py`, `.rs`, `.json`, `.gitignore`); confirm Windows 11 placement; open a file via the
verb; open a second file while running (single-instance forward); uninstall; confirm
`HKCU\Software\Classes\SystemFileAssociations` holds no `NotepadSuperPlus` keys.

---

## Dependency changes

**None.** No package is added to `package.json` or `Cargo.toml`. `@codemirror/legacy-modes` is
already present transitively via `language-data` and is used only through it.

---

## Migration strategy

Nothing to migrate. No persisted format changes: `config.toml` gains no fields, the session schema
is untouched, and the registry keys added by the installer are additive and removed by the same
installer's uninstaller.

---

## Gates

Every phase ends green on:

```bash
pnpm lint && pnpm typecheck && pnpm format:check && pnpm test && pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml --all --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml --all
```

Baseline to hold or beat: **353 frontend tests**, **240.5 KiB initial chunk**, **7.02 MiB `dist`**,
**< 15 MB installer**.
