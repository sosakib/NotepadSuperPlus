# Final Polish Report — Notepad Super Plus

**Date:** 2026-07-21 · **Branch:** `develop` · **Scope:** performance, memory, repository structure, component organization, UI/UX, responsiveness, accessibility
**Predecessor:** [FINAL_AUDIT_REPORT.md](FINAL_AUDIT_REPORT.md)

---

## Executive Summary

The previous pass made the app correct and secure. This pass made it **fast and deliberate**. The headline finding: the typing path was doing **O(document) work on every keystroke** — serializing the entire document to a string that was then thrown away by the next key, and publishing a new store object each time. Both are fixed and measured. Alongside that, the tab bar was rebuilt for real hit targets, the status bar was de-loudened, scrollbars were themed, a memory leak that retained whole file contents was closed, and the largest component was split into a coherent module.

All gates green: **77 frontend tests, 25 Rust tests, clippy `-D warnings`, rustfmt, eslint, prettier, tsc, `pnpm audit` (0 vulns)**. Cold production build compiles with zero console errors.

---

## Performance Improvements

### 1. Per-keystroke document serialization (the big one)

`renderController.requestRender(docId, text)` took an **already-serialized string**, so `update.state.doc.toString()` ran inside the CodeMirror update listener on **every keystroke**. With a 90 ms debounce, all but the last of those strings were discarded immediately. On a 10 MB document that is a 10 MB allocation and copy *per key*.

The controller now accepts a **thunk** and materializes text once, at flush time:

```ts
// before — copies the whole document on every key
renderController.requestRender(docId, update.state.doc.toString());
// after — copies once, only if the request survives the debounce
renderController.requestRender(docId, () => update.state.doc.toString());
```

### 2. Store churn on the typing path

`markDirty(docId, true)` fired on **every** document change, publishing a fresh `docs` object each time and re-rendering every subscriber (tab strip, status bar). It now fires only on the clean → dirty transition. `setCursor` likewise skips the publish when line/column are unchanged.

**Measured in the running app:** typing 61 characters produced **1** tab-strip DOM mutation (the single `tab--dirty` class addition). Previously this was one store publish and re-render per character.

### 3. Redundant re-parsing on view switching

`EditorArea` re-requested a full Markdown render on every `viewMode` change — switching Source → Split → Preview re-parsed an unchanged document three times. It now skips when output already exists for that document.

### 4. Bundle splitting

The frontend was one 1.14 MB chunk. Split into independent vendor graphs:

| Chunk | Size |
|---|---|
| `codemirror` | 547 KB |
| `index` (app) | 460 KB |
| `md.worker` | 357 KB |
| `react` | 137 KB |

Total `dist/` is unchanged at **2.46 MB** — the win is parallel parse and cacheable vendor chunks, not raw bytes.

---

## Memory Optimizations

**Leak closed:** `pendingContent` and `pendingReveal` were never pruned when a tab closed. `pendingContent` holds a document's **entire text**, so any file opened and closed without being focused was retained for the whole session. `SourcePane`'s prune effect only cleaned `savedStates` and `asyncLangLoaded`.

Added `forgetDocument()` and `cachedDocumentIds()` to the editor registry so a single call clears every map, and the prune effect now iterates the union of all of them rather than one.

Also: `renderController.forget()` now drops a pending request targeting the closed document, and no longer retains its text via the thunk closure.

---

## Tabs Redesign Summary

| Aspect | Before | After |
|---|---|---|
| Tab height | 26 px | **32 px** (in a 40 px strip) |
| Close button | 18 px | **24 px** target |
| Icon | none | file-type glyph, accent-tinted when active |
| Active styling | flat inset shadow | raised surface, inset ring, inline accent underline |
| Dirty indicator | grey dot in its own slot | accent dot **sharing** the close slot |
| Long names | 200 px hard cap | 220 px cap, ellipsized, full path on hover |
| Overflow | plain scroll | masked trailing edge, active tab auto-scrolled into view |
| Keyboard | every tab a stop | roving `tabindex` — the strip is one stop |
| Middle-click | — | closes the tab |

The dirty dot and close button occupy **one** slot, so the tab never changes width as state changes — the detail that separates a considered tab strip from a generated one. The accent underline is drawn with `::after` inset from the edges, so it cannot influence layout.

---

## UI Improvements

- **Status bar reidentified.** It was a full-width `--accent` band — the VS Code signature, and visually the loudest element on screen despite carrying the least important information. Now surface-toned with muted text, accent reserved for a single view-mode pill. Height 26 → 28 px.
- **Themed scrollbars.** Native Windows scrollbars ignore the app palette and read as a foreign element inside a dark shell. All containers now use thin, token-driven bars that gain contrast on hover.
- **Theme cards** show two swatches (accent + raised surface) against the real background, using each theme's actual tokens rather than hand-copied hex values.
- **Settings** gained grouped shortcuts (by command category) and an About tab with a proper facts grid instead of a paragraph.
- Primary buttons, brand button, and tab transitions all use one 120 ms easing vocabulary.

---

## UX Improvements

- Command palette keeps the highlighted row in view when arrowing past the visible window (previously the selection scrolled out of sight).
- Active tab scrolls into view when changed from outside the strip — command palette, search hit, or Explorer click.
- Export dialog clears its auto-dismiss timer on unmount.
- Status bar sheds least-important metadata as the window narrows rather than crowding.

---

## Accessibility Changes

| Issue | Fix |
|---|---|
| Title-bar brand was a `div` with `onClick` — **unreachable by keyboard** | now a `<button>` with hover/focus styling |
| File-tree row actions used `display: none` — **removed from the tab order entirely**, so rename/duplicate/delete were keyboard-unreachable | `opacity` + `:focus-within`, kept in the layout |
| Tooltip bubbles carried `role="tooltip"` duplicating the button's `aria-label` — announced twice | `aria-hidden` (the accessible name already carries the text) |
| Close-button target 18 px | 24 px |
| Settings controls had no label association | `<label for>` on every row |

Reduced-motion handling extended to `scroll-behavior`.

---

## Responsiveness

Verified live at **800 × 600**, **1024 × 640**, **1280 × 720**, and **2560 × 1080** — zero horizontal overflow, zero clipped elements at every size.

- Welcome grid: hard `1fr 1fr` → `auto-fit / minmax(260px, 1fr)`, collapsing to one column below ~800 px.
- Modals: `max-height` cap with a scrolling overlay and `padding: min(10vh, 72px)`, so a dialog can no longer run off a 13" screen. Settings body switched from `min-height: 380px` to a bounded `height` that respects the cap.
- Content columns (`markdown-body`, welcome) stay centered at 860 px on ultrawide instead of stretching.

---

## Folder Restructuring & Removed Files

**New module** `src/settings/` — `SettingsDialog` (264 lines, the largest component) split into `SettingsDialog` (chrome + tab state) plus `AppearanceTab`, `EditorTab`, `ShortcutsTab`, `AboutTab`.

**New** `src/utils/path.ts` — `basename()` existed in **5 files with 2 different implementations** (only one handled trailing separators, so a workspace root ending in `\` displayed wrong); `parentDir()` lived in an actions module and was imported across layers. Both consolidated, with tests.

**Removed:** `src/components/SettingsDialog.tsx` (replaced), `codemirror` npm package (meta-package, never imported — the app uses the individual `@codemirror/*` packages).

**Verified still needed:** `@types/hast`, `@types/mdast`, `@types/unist` (back the type-only imports in the render pipeline), `decode-named-character-reference` (the Vite alias that keeps the worker DOM-free).

---

## Simplified Architecture

- Themes are now **self-describing**: adding a theme to `themes.ts` makes it appear in the picker automatically. Previously the picker re-declared each theme's name, description, background, and accent, so a new theme would silently not be selectable.
- Shortcut lists render from the command registry (already true) and now group by category from the same source.
- One `basename`/`parentDir`, one version source, one recent-files source.

---

## Benchmarks — Before vs After

| Metric | Before | After |
|---|---|---|
| Document serializations per keystroke | **1 (full document)** | 0 (one per 90 ms flush) |
| Store publishes per keystroke | 1–2 | **0** after the first |
| Tab-strip DOM mutations / 61 keystrokes | ~61 | **1** (measured) |
| Markdown re-parses per view switch | 1 (always) | 0 when output is current |
| Largest JS chunk | 1.14 MB | 547 KB |
| Retained memory after opening + closing a file | full document text | **0** |
| Tab height / close target | 26 px / 18 px | 32 px / 24 px |
| Frontend tests | 72 | **77** |

Cold-start, RAM, and 100 MB-file figures still require the Stage-10 bench harness on real hardware; the instrumentation (`performance.mark` + Rust `tracing`) is in place but dev-server numbers are not representative and are deliberately not quoted here.

---

## Remaining Technical Debt

1. **No formal performance harness.** Startup/RAM/large-file budgets remain unverified by measurement on real hardware.
2. **Preview re-renders wholesale.** `dangerouslySetInnerHTML` replaces the entire preview DOM per render. Debounced and off-thread, so not currently a bottleneck, but DOM morphing would help very large documents.
3. **No error boundary.** A render error in the editor tree blanks the pane instead of degrading gracefully.
4. **No session restore.** Tabs and workspace do not reopen on launch — the largest remaining gap for daily use.
5. **`UI_UX_Progress_Report.md` appears stale** — dated 2026-07-20, authored by a different tool, references external Stitch project IDs, and describes a design that has since changed. It is superseded by `UI_UX_REFINEMENT_REPORT.md`. **Not deleted** — I did not create it and cannot be certain it is disposable; recommend removing it yourself.
6. **MSI lacks the extra context-menu verb** (NSIS-only; MSI still gets file associations).
7. **Installers unsigned** — SmartScreen friction until a certificate exists.
8. Callout CSS (`.markdown-alert*`) anticipates a `> [!NOTE]` remark plugin that is not yet wired.

---

## Release Readiness Score

**9.5 / 10.**

The application now behaves like considered desktop software: the typing path does no wasted work, memory is released when tabs close, hit targets are comfortable, the chrome is recessive where it should be, and every keyboard path reaches every control. What separates it from a 10 is measurement rather than craft — the performance budgets are architecturally satisfied but not yet *proven* on real hardware, and the installers are unsigned.

Ship-ready for public **v1.0.0** once the installer is smoke-tested on a clean Windows machine and the unsigned-installer trade-off is accepted.
