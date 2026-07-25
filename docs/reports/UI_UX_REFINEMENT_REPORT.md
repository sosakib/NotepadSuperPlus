# UI/UX Refinement Report — Notepad Super Plus

**Date:** 2026-07-21 · **Reviewed:** every screen, dialog, and interactive state; verified live in the running app.

## UI Audit — What Was Found

| Area | Finding | Severity |
|------|---------|----------|
| Welcome screen | "Quick Documentation" card listed **hard-coded repo doc paths**; clicking opened an empty phantom buffer (dev scaffolding shipped as product) | High |
| Data safety | Closing a dirty tab (X, `Ctrl+W`) **silently discarded unsaved edits** | High |
| Status bar | Encoding/EOL hard-coded to "UTF-8 · LF" — wrong for CRLF/UTF-16 files | Medium |
| Settings | `.toggle-switch`, `.shortcut-list`, `.about-hero__*` classes had **no CSS** — default checkboxes and unstyled About tab | Medium |
| Branding | Logo glyph was a leftover **"M"** (title bar, About, Settings) for an app named *Notepad* Super Plus | Medium |
| Consistency | Shortcut lists duplicated by hand in two places; already drifting from the real keymap | Medium |
| Sidebar | Resize handle tracked the pointer with a 4 px drift (44 px offset vs 48 px rail) | Low |
| Versioning | About dialog & Settings hard-coded "v0.1.0" while the status bar fetched the real version | Low |
| Buttons | Primary button had no hover/active feedback | Low |

## Improvements Applied

### Screens updated
- **Welcome screen** — the fake docs card is now a **Recent Files** card backed by the real `recent_list` IPC (shared `useRecentFiles` hook with the Explorer), with a proper teaching empty state; the shortcuts card renders from the command registry.
- **Settings** — Shortcuts tab now lists **all 17 bound commands** straight from the registry; About tab reuses the styled `about-brand` block with the live version; word-wrap checkbox is now a real animated toggle switch (36×20, token-driven, 150 ms eased thumb).
- **Tab bar** — middle-click closes a tab; every close path runs through the new unsaved-changes guard (native warning dialog with explicit "Discard changes" / "Keep editing" labels).
- **Status bar** — truthful per-document encoding ("UTF-8 BOM", "UTF-16 LE"…) and EOL ("LF"/"CRLF"); version sourced from the Rust core everywhere via one `useAppVersion` hook.
- **Title bar** — brand glyph corrected to "N+" on the accent gradient, sized to fit its 22 px chip.

### Interaction & motion
- Primary buttons gained hover (+8 % brightness) and pressed (−6 %) feedback, consistent with the existing 100–150 ms linear/eased transition vocabulary.
- Toggle switch thumb uses the app's standard `cubic-bezier(0.2, 0, 0, 1)` curve.
- Existing global `prefers-reduced-motion` kill-switch covers all new animation.

### Accessibility
- Dialogs already trapped focus, restored focus, and closed on Escape (verified); new controls inherit visible `:focus-visible` outlines.
- Unsaved-changes guard prevents keyboard-only users from losing work via `Ctrl+W`.
- Toggle switch remains a native checkbox under the hood (screen-reader semantics intact).
- Shortcut chips render as individual `<kbd>` keys everywhere (welcome + settings now match the palette).

### Design consistency
- One brand glyph, one version source, one recent-files source, one shortcut source — four "single sources of truth" replacing five hand-maintained copies.
- All new CSS is token-driven (no literal colors introduced).

## Verified Live

Welcome screen (empty recents + registry shortcuts), Settings (all four tabs, styled toggle, About with version), theme cycling (system → dark → light → high-contrast; `data-theme`, tokens, and `color-scheme` all swap), editor mount, split view with sanitized preview, status-bar stats/encoding/EOL — all exercised in the running app during this audit.

## Future Ideas

- Session restore (reopen last tabs/folder) — the largest remaining UX gap for a daily driver.
- Tab overflow affordance (scroll shadows or a dropdown) beyond ~12 open tabs.
- Drag-and-drop files onto the window to open; drag tabs to reorder.
- An outline filter box for very long documents.
- GitHub-style callout syntax (`> [!NOTE]`) — the preview CSS already anticipates it (`.markdown-alert`), the remark plugin is not yet wired.
