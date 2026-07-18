# 01 — Product Requirements Document (PRD)

**Related:** [00_Project_Vision.md](00_Project_Vision.md) · [03_System_Architecture.md](03_System_Architecture.md) · [12_Implementation_Phases.md](12_Implementation_Phases.md)

Requirement IDs are stable and referenced by phase acceptance criteria in [12_Implementation_Phases.md](12_Implementation_Phases.md). Priority: **P0** = v1.0 blocker, **P1** = v1.x, **P2** = roadmap ([11_Roadmap.md](11_Roadmap.md)).

---

## 1. File support

| ID | Requirement | Priority |
|---|---|---|
| FR-1.1 | Open, edit, save `.md`, `.markdown`, `.txt` with full feature set | P0 |
| FR-1.2 | Open, edit, save `.json`, `.yaml`, `.yml`, `.toml`, `.ini`, `.xml`, `.csv` with syntax highlighting (no preview) | P0 |
| FR-1.3 | Open, edit, save `.html`, `.css`, `.js`, `.py`, `.cpp`, `.java`, `.php`, `.rb` with syntax highlighting | P0 |
| FR-1.4 | Encoding: UTF-8 (default), UTF-8 BOM, UTF-16 LE/BE detect + convert; line endings LF/CRLF detect, preserve, convert | P0 |
| FR-1.5 | Detect external file changes; prompt reload (or auto-reload if unmodified) | P0 |
| FR-1.6 | Atomic saves (write-temp-then-rename); never corrupt on crash | P0 |
| FR-1.7 | Unsaved-changes recovery after crash (periodic draft snapshot) | P1 |

## 2. Editing modes

| ID | Requirement | Priority |
|---|---|---|
| FR-2.1 | **Source mode**: raw Markdown text editing, monospace, no inline rendering | P0 |
| FR-2.2 | **Preview mode**: read-only rendered GFM view | P0 |
| FR-2.3 | **Split mode**: source + preview side-by-side, live update ≤ 100 ms after keystroke idle | P0 |
| FR-2.4 | Split: synchronized scrolling (source line ↔ rendered block mapping, bidirectional) | P0 |
| FR-2.5 | Split: cursor position highlights corresponding preview block | P1 |
| FR-2.6 | Mode toggle per tab, persisted per file in session | P0 |

## 3. Markdown rendering (GFM parity)

| ID | Requirement | Priority |
|---|---|---|
| FR-3.1 | CommonMark + GFM: headings, emphasis, lists, task lists, tables, code blocks, inline code, links, images, blockquotes, autolinks, strikethrough, footnotes | P0 |
| FR-3.2 | Syntax highlighting in fenced code blocks (Shiki, ≥ 40 languages lazy-loaded) | P0 |
| FR-3.3 | YAML/TOML frontmatter: parsed, shown as collapsible styled panel (not rendered as body text) | P0 |
| FR-3.4 | Math: inline `$…$` and block `$$…$$` via KaTeX (lazy-loaded) | P1 |
| FR-3.5 | Mermaid diagrams in ```` ```mermaid ```` fences (lazy-loaded, sandboxed render) | P1 |
| FR-3.6 | GitHub-style callouts/alerts (`> [!NOTE]`, `> [!WARNING]`, etc.) | P1 |
| FR-3.7 | Emoji shortcodes (`:smile:`) | P1 |
| FR-3.8 | Inline HTML rendered through sanitizer allowlist (see [08_Security_Model.md](08_Security_Model.md) §4) | P0 |
| FR-3.9 | Definition lists | P2 |
| FR-3.10 | Wiki links `[[page]]` rendered as styled links (navigation P2) | P2 |
| FR-3.11 | Auto-generated TOC block via `[TOC]` marker | P1 |
| FR-3.12 | Checkbox toggling in preview writes back to source | P1 |

## 4. Structure View (outline)

| ID | Requirement | Priority |
|---|---|---|
| FR-4.1 | Live H1–H6 tree in sidebar panel; updates as document changes | P0 |
| FR-4.2 | Click heading → jump (editor and/or preview) | P0 |
| FR-4.3 | Collapse/expand tree nodes; current section auto-highlighted on scroll | P0 |
| FR-4.4 | Filter/search headings (fuzzy) | P1 |

## 5. File explorer

| ID | Requirement | Priority |
|---|---|---|
| FR-5.1 | Open folder as workspace; recursive tree view with lazy expansion | P0 |
| FR-5.2 | Create, rename, delete (to OS trash), duplicate, move (drag & drop) files/folders | P0 |
| FR-5.3 | Recent files + recent workspaces lists | P0 |
| FR-5.4 | Favorites / pinned files | P1 |
| FR-5.5 | Watch workspace for external changes; tree refreshes live | P0 |
| FR-5.6 | Multiple workspace folders per window | P2 |

## 6. Tabs & session

| ID | Requirement | Priority |
|---|---|---|
| FR-6.1 | Unlimited tabs; overflow scrolling; drag-reorder | P0 |
| FR-6.2 | Pinned tabs; preview (italic) tab replaced by next single-click open | P1 |
| FR-6.3 | Reopen closed tab (Ctrl+Shift+T), recently-closed list | P1 |
| FR-6.4 | Full session restore: open tabs, active tab, cursor/scroll positions, mode per tab | P0 |
| FR-6.5 | Dirty-state indicator; close guard with save/discard/cancel | P0 |

## 7. Search

| ID | Requirement | Priority |
|---|---|---|
| FR-7.1 | In-file find: incremental, highlight-all, match count, F3/Shift+F3 | P0 |
| FR-7.2 | Options: case sensitive, whole word, regex (Rust `regex` semantics in workspace search; CM6 in-file) | P0 |
| FR-7.3 | Replace / Replace All with undo as single step | P0 |
| FR-7.4 | Workspace search: streaming results, file/line grouping, context lines, respect `.gitignore` (toggle) | P0 |
| FR-7.5 | Workspace replace with per-match preview and confirm | P1 |
| FR-7.6 | Search headings / links / tags across workspace | P2 |

## 8. Editor capabilities

| ID | Requirement | Priority |
|---|---|---|
| FR-8.1 | Undo/redo (unbounded within session), multiple cursors, column/rectangular selection | P0 |
| FR-8.2 | Bracket + Markdown-pair matching and auto-close (`**`, `_`, `` ` ``, `[`, `(`) | P0 |
| FR-8.3 | Smart lists: Enter continues list/task/quote; Tab/Shift+Tab indent; auto-renumber ordered lists | P0 |
| FR-8.4 | Line numbers, word wrap, whitespace/invisible-char visualization (toggles) | P0 |
| FR-8.5 | Zoom (Ctrl+= / Ctrl+- / Ctrl+0), custom font family/size, ligature toggle | P0 |
| FR-8.6 | Unicode, RTL text support | P1 |
| FR-8.7 | Minimap (off by default) | P2 |
| FR-8.8 | Live table editing aids: Tab navigates cells, auto-format/align pipes | P1 |

## 9. Markdown enhancements & export

| ID | Requirement | Priority |
|---|---|---|
| FR-9.1 | Paste image from clipboard → saved to configurable `assets/` path, link inserted | P1 |
| FR-9.2 | Drag image file into editor → copy + link | P1 |
| FR-9.3 | Copy as: Markdown link, rendered HTML fragment, plain text | P1 |
| FR-9.4 | Export HTML (standalone, styles inlined) | P0 |
| FR-9.5 | Export PDF (via OS webview print-to-PDF) + Print | P1 |
| FR-9.6 | Export DOCX (via bundled converter or documented Pandoc integration) | P2 |
| FR-9.7 | Image hover-preview of local image links in source mode | P2 |

## 10. Themes, UX, accessibility

| ID | Requirement | Priority |
|---|---|---|
| FR-10.1 | Light, Dark, High-contrast; follow-OS default | P0 |
| FR-10.2 | Bundled themes: GitHub Light/Dark, Nord, Dracula, Catppuccin, Solarized | P1 |
| FR-10.3 | Custom themes: user JSON token files ([04_UI_UX_Guidelines.md](04_UI_UX_Guidelines.md) §7) | P1 |
| FR-10.4 | 100 % keyboard operability; every command in Command Palette (Ctrl+Shift+P) | P0 |
| FR-10.5 | Screen-reader: ARIA roles/labels on all chrome; editor a11y via CodeMirror | P0 |
| FR-10.6 | WCAG 2.1 AA contrast in all bundled themes; respects `prefers-reduced-motion` | P0 |
| FR-10.7 | Fully re-mappable shortcuts, JSON keymap, conflict detection ([04_UI_UX_Guidelines.md](04_UI_UX_Guidelines.md) §9) | P1 |

## 11. Settings

| ID | Requirement | Priority |
|---|---|---|
| FR-11.1 | Settings UI: searchable, grouped; writes TOML config file | P0 |
| FR-11.2 | Config file directly editable; hot-reloaded; invalid values fall back with warning | P0 |
| FR-11.3 | Import/export settings; reset to defaults | P1 |
| FR-11.4 | Portable mode: config next to executable when `portable` marker file present | P1 |

## 12. Non-functional requirements

| ID | Requirement | Priority |
|---|---|---|
| NFR-1 | Cold start < 500 ms (p75 mid-range hardware); see [09_Performance_Strategy.md](09_Performance_Strategy.md) budgets | P0 |
| NFR-2 | Idle RAM < 150 MB with 5 tabs open | P0 |
| NFR-3 | 100 MB / 100k-line file: open < 2 s, typing latency < 16 ms p95, no freeze > 100 ms | P0 |
| NFR-4 | Zero network I/O except user-initiated update check; no telemetry (verifiable in CI by network audit) | P0 |
| NFR-5 | Windows 10+ (x64/ARM64), macOS 12+ (universal), Linux glibc 2.31+ (deb, rpm, AppImage) | P0 |
| NFR-6 | Installer < 15 MB (Win/Linux), < 20 MB (macOS) | P1 |
| NFR-7 | Signed releases, reproducible builds where toolchain permits ([18_Release_Checklist.md](18_Release_Checklist.md)) | P0 |
| NFR-8 | Crash rate: no data loss on crash (FR-1.6/1.7); recover session on restart | P0 |

## 13. Out of scope (v1)

Plugin execution (proposal only — [17_Plugin_System_Proposal.md](17_Plugin_System_Proposal.md)), settings sync, cloud anything, WYSIWYG mode, mobile, collaborative editing, vault/database features.
