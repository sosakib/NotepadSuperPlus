# 05 — Component Design

**Related:** [03_System_Architecture.md](03_System_Architecture.md) · [04_UI_UX_Guidelines.md](04_UI_UX_Guidelines.md) · [06_Data_Flow.md](06_Data_Flow.md)

---

## 1. Component hierarchy

```
<App>
├── <TitleBar>                       (overlay controls, platform-aware)
├── <CommandPalette>                 (portal; fuzzy command + file search)
├── <MainLayout>
│   ├── <ActivityRail>               (Explorer | Outline | Search toggles)
│   ├── <Sidebar>                    (resizable, collapsible)
│   │   ├── <ExplorerPanel>
│   │   │   ├── <WorkspaceHeader>
│   │   │   ├── <FileTree>           (virtualized)
│   │   │   │   └── <FileTreeNode>
│   │   │   └── <RecentFiles> / <Favorites>
│   │   ├── <OutlinePanel>
│   │   │   ├── <OutlineFilter>
│   │   │   └── <OutlineTree> → <OutlineNode>
│   │   └── <SearchPanel>
│   │       ├── <SearchInput> (+options: case/word/regex)
│   │       └── <SearchResults>      (virtualized, grouped by file)
│   ├── <EditorArea>
│   │   ├── <TabBar> → <Tab> (pinned | preview | dirty states)
│   │   └── <TabContent>             (per active tab)
│   │       ├── <SourcePane>         (CodeMirror host)
│   │       ├── <PreviewPane>        (rendered blocks, virtualized)
│   │       ├── <SplitContainer>     (both + divider + sync controller)
│   │       └── <FindBar>            (in-file find/replace overlay)
│   └── <StatusBar>
├── <SettingsWindow>                 (route/panel: searchable groups)
├── <DialogHost>                     (confirm-close, conflict, errors)
└── <ToastHost>
```

Primitives in `src/components/`: `Button, IconButton, Input, Select, Switch, Tree, Tooltip, Menu, Dialog, Toast, Kbd, EmptyState, Resizer, VirtualList`. All primitives are headless-logic + token-styled; no third-party component library (bundle + design control) — Radix-style a11y patterns implemented per WAI-ARIA APG.

## 2. Key component contracts

### 2.1 `<SourcePane>`

- Hosts one CM6 `EditorView`; view instances cached per tab id (max N=8 LRU; evicted tabs serialize state to store).
- Extensions (composed in `src/editor/extensions/`): markdown language + GFM, theme bridge, smart-lists, markdown-pair-close, table-tab-nav, search, multi-cursor (core), whitespace viz, large-file trims ([03] §3.4).
- Emits to store: `docChanged` (transaction summary), `cursorMoved (line)`, `scrolled (topLine)`.
- Receives: `revealLine(line)`, `applyTextEdit(edit)` (e.g., checkbox toggle write-back).

### 2.2 `<PreviewPane>`

- Input: `RenderedBlock[] { id, hash, html, srcLineStart, srcLineEnd }` from Markdown Worker.
- Renders blocks into a virtualized column; patches only changed hashes (keyed by block id).
- Delegated event handling: link clicks (internal anchor → scroll; external → `opener` command with confirm per [08] §5), checkbox clicks → `toggleTask(srcLine)`.
- Exposes `revealBlockForLine(line)` for sync controller.

### 2.3 `<SplitContainer>` (sync controller)

Owns the leader/follower scroll-sync state machine ([03] §3.3). Subscribes to both panes' scroll/cursor events; maps via line-map; suppresses echo for 150 ms after programmatic scrolls.

### 2.4 `<FileTree>` / `<OutlineTree>`

Both built on shared `<Tree>` primitive: `role=tree`, full APG keyboard support, virtualization > 200 visible nodes, inline-rename editing, drag-and-drop (FileTree only) with drop-target highlighting and Escape-cancel.

### 2.5 `<CommandPalette>`

Single fuzzy surface for: commands (with current keybinding shown), files (`Ctrl+P` opens pre-filtered to files), headings (`@` prefix), mode switches (`>` default). Backed by command registry (§4).

## 3. Editor extension design (CM6)

| Extension | Behavior |
|---|---|
| `smartLists` | Enter inside list item → continue marker (`-`, `1.` renumber, `- [ ]`); Enter on empty item → terminate list; Tab/Shift+Tab → indent/outdent with marker rewrite |
| `pairClose` | Auto-close `**`, `*`, `` ` ``, `[`, `(`, `"`; wrap selection on pair key; skip-over on close char |
| `tableNav` | Tab/Shift+Tab moves cells inside pipe tables; `formatTable` command aligns pipes |
| `mdCommands` | toggleBold/Italic/Code/Strike, setHeading(n), toggleTask, insertLink/Image/Table/CodeBlock — all selection-aware and undo-grouped |
| `largeFileMode` | Threshold-based feature trims; posts banner state to store |

Each extension: own file, own unit spec ([10] §2), no cross-imports except shared utils.

## 4. Command registry

All user-invokable behavior registers as `Command { id, title, category, defaultKeys, when, run }`. Menus, palette, keymap file, and shortcuts UI are all views over the registry — single source, so remapping and palette completeness are free. `when` clauses (`editorFocus`, `hasSelection`, `mode == split`…) gate enablement.

## 5. State stores (Zustand)

| Store | Shape (essentials) | Notes |
|---|---|---|
| `documents` | `Map<docId, { path, dirty, encoding, eol, version }>` | text lives in CM6, not the store; store keeps metadata |
| `tabs` | `orderedIds, activeId, pinned, previewTabId, closedStack` | session-persisted via Rust `session` |
| `workspace` | `root, treeIndex (lazy), watchStatus, favorites, recent` | tree nodes hydrate on expand |
| `outline` | `byDocId: OutlineNode[]` | fed by Markdown Worker |
| `search` | `inFile: {...}, workspace: { query, opts, results[], status, token }` | results streamed from Rust events |
| `settings` | typed mirror of TOML config | updated via config events; writes go through Rust |
| `ui` | `theme, sidebar, panel, splitRatio, zoom, statusMessage` | |

Rules: selectors everywhere (no whole-store subscriptions in hot components); derived data memoized; stores never call `invoke` directly — an `ipc/` service layer does ([16] §2), keeping stores testable with a mock transport.

## 6. Worker interfaces

```ts
// md.worker.ts
type MdRequest  = { docId: string; version: number; text: string; opts: RenderOpts };
type MdResponse = {
  docId: string; version: number;
  blocks: RenderedBlock[];          // only changed blocks + full order manifest
  outline: OutlineNode[];           // heading tree with src lines
  lineMap: LineMapEntry[];          // src line ranges → block ids
};

// shiki.worker.ts
type HlRequest  = { blockId: string; code: string; lang: string; theme: string };
type HlResponse = { blockId: string; html: string };
```

Version stamping discards stale responses (user typed again before render returned). Shiki results cached by `(hash(code), lang, theme)`.

## 7. Component conventions

- Function components + hooks only; no class components.
- Props interfaces exported; no `any`; events named `onX`, handlers `handleX`.
- Files: `PascalCase.tsx` co-located with `PascalCase.test.tsx` and optional `PascalCase.module.css` (tokens only).
- Components render from store selectors; side effects live in hooks (`useWorkspaceWatcher`, `useSessionRestore`) — components stay declarative.
- Every primitive documented with usage snippet in Storybook-lite page (`/design/components.md` until tooling lands).
