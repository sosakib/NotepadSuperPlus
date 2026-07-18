# 04 — UI / UX Guidelines

**Related:** [05_Component_Design.md](05_Component_Design.md) · [01_Product_Requirements.md](01_Product_Requirements.md) §10 · design assets in `/design`

---

## 1. Design philosophy

Reference points: Linear (density + restraint), Apple HIG (predictability), Claude's document rendering (reading typography), GitHub (Markdown visual language). Governing rules:

1. **The document is the interface.** Chrome recedes; content owns ≥ 90 % of pixels in default layout.
2. **One accent color.** Interactive states, selection, focus — everything else is a neutral ramp.
3. **Motion explains, never decorates.** 120–200 ms, ease-out, opacity/transform only, fully disabled under `prefers-reduced-motion`.
4. **Keyboard-first.** Every action reachable via Command Palette; pointer is optional everywhere.
5. **No modality without necessity.** Prefer inline panels and non-blocking toasts over dialogs; dialogs only for destructive confirmation and file pickers.

## 2. Layout

```
┌────────────────────────────────────────────────────────────┐
│ Title bar (native or overlay)                              │
├──────────┬─────────────────────────────────────────────────┤
│ Activity │ Tab bar                                         │
│ rail     ├─────────────────────────────────────────────────┤
│ 44px     │                                                 │
│ ┌──────┐ │        Editor / Preview / Split                 │
│ │Files │ │                                                 │
│ │Outline│ │                                                │
│ │Search│ │                                                 │
│ └──────┘ │                                                 │
│ Sidebar  │                                                 │
│ 240–400px│                                                 │
├──────────┴─────────────────────────────────────────────────┤
│ Status bar 24px: encoding · EOL · Ln,Col · words · mode    │
└────────────────────────────────────────────────────────────┘
```

- Sidebar: collapsible (Ctrl+B), resizable 240–400 px, persisted. Panels: Explorer, Outline, Search.
- Split view divider: draggable, double-click resets 50/50, persisted per session.
- Zen mode (P1): hides all chrome except content, Esc restores.
- Minimum window 640 × 480; layout degrades gracefully (sidebar auto-collapses < 800 px).

## 3. Design tokens

Tokens are CSS custom properties, defined in `packages/themes` JSON, compiled to CSS. Three layers: primitive → semantic → component. Themes override the semantic layer only.

### 3.1 Spacing (4 px base)

`--space-1..12` = 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96 px. Component padding uses 2–4; layout gaps 4–7.

### 3.2 Typography

| Role | Token | Default | Notes |
|---|---|---|---|
| UI | `--font-ui` | system stack (`-apple-system, Segoe UI, …`) | 13 px base, 1.45 lh |
| Editor | `--font-mono` | user-configurable; default `Consolas / SF Mono / monospace` | 14 px default, ligature toggle |
| Preview body | `--font-prose` | system stack | 16 px, 1.65 lh, measure clamped 45–75 ch (`max-width: 72ch`) |
| Preview headings | scale | 2.0 / 1.5 / 1.25 / 1.1 / 1.0 / 0.9 × body; H1–H2 with hairline bottom border (GitHub idiom) |

Numeric UI (line numbers, counts): `font-variant-numeric: tabular-nums`.

### 3.3 Color (semantic layer)

`--bg-app`, `--bg-surface`, `--bg-raised`, `--bg-hover`, `--bg-active`, `--fg-primary`, `--fg-secondary`, `--fg-muted`, `--border-subtle`, `--border-strong`, `--accent`, `--accent-fg`, `--danger`, `--warning`, `--success`, plus `--code-*` (Shiki theme bridge) and `--selection`.

Contrast requirements: `--fg-primary` on `--bg-app` ≥ 7:1; `--fg-secondary` ≥ 4.5:1; all interactive states ≥ 3:1 against adjacent colors (WCAG 2.1 AA; high-contrast theme targets AAA).

### 3.4 Radii, borders, elevation

- Radii: 4 px (controls), 6 px (cards/panels), 8 px (dialogs/palette).
- Borders preferred over shadows for separation. Shadows only for floating layers: palette/dialog `0 8px 24px rgb(0 0 0 / 0.18)` (dark: 0.5), menus `0 4px 12px / 0.12`.

## 4. Bundled themes

Dark (default follows OS), Light, High Contrast — P0. GitHub Light/Dark, Nord, Dracula, Catppuccin (Mocha/Latte), Solarized (Dark/Light) — P1. Each theme = semantic-token JSON + matched Shiki theme + matched CM6 highlight style, so editor, preview code blocks, and UI never clash.

Custom themes (FR-10.3): user drops a token JSON into `themes/` config dir; schema-validated, hot-loaded; invalid tokens fall back to base theme with a warning toast.

## 5. Component states

Every interactive component defines: default, hover (`--bg-hover`, 100 ms), active, focused (2 px `--accent` ring, `:focus-visible` only), selected, disabled (55 % opacity, no hover), loading. No component may implement ad-hoc colors — tokens only (lint-enforced, [13_Coding_Standards.md](13_Coding_Standards.md) §6).

## 6. Motion spec

| Interaction | Duration | Easing |
|---|---|---|
| Hover/press feedback | 100 ms | linear (color only) |
| Panel collapse/expand, sidebar | 180 ms | cubic-bezier(0.2, 0, 0, 1) (transform) |
| Palette/dialog enter | 150 ms | opacity + 4 px translate-up |
| Tab reorder | 160 ms | transform |
| Toast enter/exit | 200 ms | opacity + translate |

Rules: never animate layout properties (width/height/top) on the editor path; `prefers-reduced-motion: reduce` → all durations 0; no looping/idle animation anywhere.

## 7. Iconography

Lucide icon set (MIT, tree-shakeable, consistent 1.5 px stroke). 16 px in dense chrome, 20 px in rail. Icons always paired with tooltip (500 ms delay) and `aria-label`. File-type glyphs: minimal two-tone set in `/design/icons`.

## 8. UX writing

Sentence case everywhere. Buttons are verbs ("Save", "Discard changes"). Errors state what happened + what to do, never codes alone ("Couldn't save — the file is read-only. Change permissions and retry."). Empty states teach one action each (empty workspace → "Open a folder"; empty outline → "Headings will appear here"). No exclamation marks, no blame.

## 9. Keyboard shortcuts (defaults)

Full spec: `specifications/keymap.md`. Highlights (Ctrl = Cmd on macOS):

| Action | Shortcut | | Action | Shortcut |
|---|---|---|---|---|
| Command palette | Ctrl+Shift+P | | Quick open file | Ctrl+P |
| New / Open / Save / Save As | Ctrl+N / O / S / Shift+S | | Close / reopen tab | Ctrl+W / Ctrl+Shift+T |
| Find / Replace | Ctrl+F / Ctrl+H | | Search workspace | Ctrl+Shift+F |
| Mode: source / preview / split | Ctrl+1 / 2 / 3 | | Toggle sidebar | Ctrl+B |
| Bold / Italic / Code | Ctrl+B* / Ctrl+I / Ctrl+E | | Link | Ctrl+K |
| Heading cycle | Ctrl+Shift+1..6 | | Task toggle | Ctrl+L |
| Next/prev tab | Ctrl+Tab / Ctrl+Shift+Tab | | Zoom | Ctrl+= / − / 0 |
| Next/prev heading | Ctrl+Down/Up (P1) | | Zen mode | Ctrl+Shift+Z |

\* Ctrl+B conflict (bold vs sidebar): in-editor focus = bold; chrome focus = sidebar. User-remappable; conflicts detected and surfaced in Settings → Keyboard.

Remapping: JSON keymap file (`keybindings.json`), command-id → chord list; palette shows current bindings; conflict detection at load.

## 10. Accessibility checklist (release gate)

- [ ] Tab order logical through all chrome; focus never trapped except dialogs (which trap correctly and restore focus on close)
- [ ] All controls: `aria-label`/role; tree views use `role=tree` keyboard pattern (arrows, Home/End, typeahead)
- [ ] Live regions: save status, search-result counts announced politely
- [ ] Preview headings are real `h1–h6`; landmarks: `main`, `navigation` (sidebar), `status`
- [ ] 200 % zoom usable; high-contrast theme verified with Windows HC mode
- [ ] Screen-reader smoke pass: NVDA (Win), VoiceOver (macOS) per release ([10_Testing_Strategy.md](10_Testing_Strategy.md) §6)

## 11. Wireframes & assets

`/design/wireframes/` (excalidraw + exported SVG): 01 shell, 02 split view, 03 command palette, 04 settings, 05 workspace search, 06 empty states. `/design/tokens/` holds the source token JSON. These are contributor references, not pixel contracts — tokens are the contract.
