# 21 — UI/UX update spec from the showcase film

**Source:** `Downloads/NotepadSuperPlus-Film/NotepadSuperPlus_Showcase_1080p5994.mp4` (45 s, 1920×1080, 59.94 fps), cross-checked frame by frame against its source `film.html`.
**Compared against:** `main` @ `111a979` (v1.0.1). `feature/v1.5` is **not merged**. Its commit `d53df63 feat(window): integrate the title bar into the app` overlaps §2, so merge or read it first.
**Written:** 2026-10-13

## How an agent should use this

1. Read `docs/04_UI_UX_Guidelines.md` and `docs/BRAND_GUIDELINES.md` first. If this spec conflicts with them, they win unless the owner says otherwise.
2. Each item has a status: ✅ already in `main` · 🟡 partly there, needs changes · 🆕 not in the app yet.
3. **Scale:** the film draws the app 1620 px wide inside a 1920 frame, so everything is about **1.33× real size** (film title bar 56 px, app 42 px). Divide film px by ~1.33 to get app px. Both values are listed where it matters.
4. **Frames → ms:** the film runs on a 29.97 fps timeline, so 1 frame ≈ 33 ms.
5. Every motion must respect `prefers-reduced-motion`. The global rule in `global.css` already handles this, so don't bypass it with JS animation.
6. §12 lists film-only effects. Do **not** build those into the app.

---

## 1. Window and global look

| Element | Film value | App today | Status |
|---|---|---|---|
| UI font | Inter 400/500/600/700 | `--font-ui` Inter first | ✅ |
| Mono font | JetBrains Mono 400/500/600 | `--font-mono` Cascadia Code first, JetBrains Mono second | 🟡 Optional: the film's look is JetBrains Mono. Make it the default or offer it in Settings. |
| Window frame | radius 26 (≈20 app), shadow `0 50px 120px -20px rgba(15,23,42,.28)`, 1 px frame ring | OS window | — Marketing framing only. Skip unless custom chrome lands (v1.5). |
| Section borders | 1 px `--border2` (`#cbd5e1` light / `#334155` dark) between title bar, rail, panes and status bar | uses `--border-subtle` | 🟡 The film's dividers are one step stronger. Check contrast before changing. |

## 2. Title bar: one row with the tabs inline

The film shows **one unified row**, left to right:
`[logo 28 + "Notepad Super Plus"] [active tab] [inactive tab] … spacer … [theme chip] [Source|Preview|Split] [⌘]`

| Element | Film spec (film px) | App today | Status |
|---|---|---|---|
| Row | height 56 (≈42 app), padding `0 18 0 20`, gap 14, bg `--bg-surface`, bottom border 1 px `--border2` | `--titlebar-height: 42px` | ✅ height · 🟡 contents |
| Brand | 28 px logo, name Inter 600 / 17 px / tracking −0.01em, gap 10 | logo + name button (opens About) | ✅ |
| **Tabs in the title bar** | Sit right of the brand (margin-left 22). Tabs live **inside** the title bar, with no separate tab row. | `TabBar` is a separate row in `EditorArea` | 🆕 Saves ~32 px of vertical space. Check `feature/v1.5` `d53df63` first. |
| Active tab | height 38, padding `0 16`, radius 10, bg `--bg-app`, ring `0 0 0 1px --border2`, 15.5 px `--fg1`; dirty dot 8 px `--accent` **after** the name | 32 px tab with FileText icon, shared dot/close slot | 🟡 Keep the shared dot/close slot (it's better). Adopt the pill shape: radius 10, ring border, no fill change. The file icon is optional (the film has none). |
| Inactive tab | transparent, no ring, `--muted` text | — | 🟡 |
| **Theme chip** | height 34, radius 9, ring `0 0 0 1px --border2`, 14 px swatch square (radius 4, theme bg colour) + theme name 15 px `--fg2` | Theme name shows only in the status bar. The rail has a "Cycle Theme" button. | 🆕 Clicking opens a theme picker (§9). |
| View-mode switch | Track: padding 3, radius 10, gap 2, bg `--bg-active`. Items: 14.5 px / 500, padding `6 14`, radius 8, `--fg2`. **Active: bg `--bg-raised`, `--fg1`, shadow `0 1px 3px rgba(15,23,42,.18)`** (raised pill on a darker track) | Track `--bg-app` + border. Active `--bg-active`. 12 px, padding `3 10`. | 🟡 Restyle as an iOS-style raised segment. Keep `role=tablist` and the `Ctrl+1/2/3` titles. |
| Right actions | **Only** a ⌘ command-palette button, 36×36, radius 9, `--fg2` | Palette, Export, Settings, About icon buttons | 🟡 Optional declutter. Settings is already in the rail, and Export/About are in the palette. Keep them reachable if removed. |

## 3. Activity rail

| Element | Film spec | App today | Status |
|---|---|---|---|
| Width | 58 (≈44–48 app) | `--rail-width: 48px` | ✅ |
| Top icons | Files (Explorer), ListTree (Outline), Search. 22 px, stroke 1.9, `--muted` | same three, lucide 20 px | ✅ |
| Bottom | **One** icon: sliders (Settings), 12 px from the bottom | Toggle Sidebar, Cycle Theme, Preferences | 🟡 Optional. The film suggests one bottom icon. Cycle Theme could move to the theme chip (§2) and Toggle Sidebar is `Ctrl+B`. |
| **Active item** | 42×42 tile, radius 10, bg `--bg-active`, icon `--fg1`, **plus a 3 px accent bar** at the rail's left edge (`left:-8px; top:10px; bottom:10px; radius 2px; bg --accent`) | `box-shadow: inset 2px 0 0 var(--accent)` on the button | 🟡 Add the filled tile behind the active icon and make the accent bar 3 px, inset top/bottom, with rounded ends. |
| Hover | not shown | existing glyph motion | ✅ keep |

## 4. Sidebar

| Element | Film spec | App today | Status |
|---|---|---|---|
| Width | 310 (≈232–260 app) | resizable | ✅ |
| Open/close | `Ctrl+B` animates width 0→310 over **12 frames ≈ 400 ms**, expo-out (`1-2^(-10t)`). The editor reflows live. | Mounts and unmounts instantly (`{!sidebarCollapsed && <Sidebar/>}`) | 🆕 Animate width (or `grid-template-columns`) and keep it mounted during the exit. Reduced motion means instant. |
| Panel switch (Explorer → Search) | Old panel slides out left 320 px while the new one slides in from the right, **9 frames ≈ 300 ms**, expo-out | instant swap | 🆕 Optional. A 120–160 ms cross-slide is enough at app scale. |
| Section heading | "EXPLORER" / "SEARCH": 12.5 px / 600, uppercase, tracking 0.08em, `--muted`, margin `0 6 14` | — | Check against the current panel header. Match it if it differs. |
| Tree row | height 36, padding `0 8`, radius 8, gap 9, 15.5 px `--fg2`, icons 18 px. Folder chevron + folder icon. Children indented 30 px. | `FileTree` | 🟡 Match the row height, radius and indent. |
| Active file row | bg `--bg-active`, text `--fg1`. The open file is highlighted in the tree. | — | 🟡 Make sure the active document is highlighted in the tree. |

## 5. Workspace search panel

Film sequence: `Ctrl+Shift+F` → the search panel slides in → the input springs open → you type `scroll-synced` → results stagger in → the editor jumps to the match → the match is highlighted in **both** panes and the status bar shows `Ln 27, Col 15`.

| Element | Film spec | App today | Status |
|---|---|---|---|
| Input | height 46, radius 12, padding `0 14`, gap 10, leading search icon, 17 px. **Focus ring:** `0 0 0 1.5px --accent`, glow `0 10px 30px -8px rgba(52,115,218,.6)`, inner top highlight `inset 0 1px 0 rgba(255,255,255,.08)`. Caret `#7aa7f0`. | plain input + case/word/regex toggles + "Search" submit button | 🟡 Restyle the focus state and keep the toggles. |
| Open spring | input `scaleX` .55 → 1.05 → 1 over ~15 frames (≈500 ms), origin left | — | 🆕 Optional polish. |
| Search-as-you-type | Results appear while typing, with no submit | form `onSubmit` only | 🆕 Debounce ~200 ms. Keep Enter working, plus the busy spinner. |
| Result group header | file icon + filename 15.5 px / 500 `--fg1` + **count pill** right-aligned (12.5 px, padding `2 8`, radius 9, bg `#334155` / `--bg-active`, text `#cbd5e1`) | `basename` + `.search-results__count` | 🟡 Style the count as a pill. |
| Result snippet | 14.5 px `--muted`, line-height 1.4, indented 30 px under the filename. **Matched text wrapped in `<mark>`**: bg accent at 35%, text `--fg1`, radius 4, padding `0 2` | line number + plain preview | 🟡 Highlight the match inside the snippet. Escape the snippet text and insert `<mark>` safely (no `innerHTML` with file content). |
| Result entrance | each row rises 26 px and fades in, **3 frames (100 ms) stagger** | — | 🆕 Optional. Cap the stagger at ~8 rows. |
| **Jump to match** | Editor scrolls to the line, ~14 frames ≈ 470 ms, expo-out. Preview follows through scroll sync. | `revealSourceLine` | ✅ jump · 🟡 easing |
| **Match highlight** | Source line bg = accent at 12%. Matched word bg = accent at 34%, radius 4. **The same word is also marked in the preview.** | — | 🆕 A CodeMirror line decoration + mark decoration, and a temporary mark in the preview DOM. Clear it on the next edit or search. |
| Status bar | Updates `Ln/Col` to the match | ✅ (cursor-driven) | ✅ |

## 6. Source editor (CodeMirror)

| Element | Film spec | Status |
|---|---|---|
| Text | JetBrains Mono 19.5 px (≈14.5 app), line height 35 (≈1.8) | 🟡 Line height looks roomier than a typical editor. Optional. |
| Gutter | 64 px wide, numbers right-aligned, padding-right 22, 16 px, `--muted` at **60% opacity** | 🟡 Check the gutter opacity. |
| Markdown syntax ink | `#`, `**`, `- [ ]`, `\|`, `>`, backticks in `--muted`; heading text `--accent` 600; bold text 600; blockquote text italic `--fg2`; inline-code text `--accent` | ✅ probably exists via the highlight style. Verify per theme. |
| Active/search line | bg `color-mix(in srgb, var(--accent) 12%, transparent)` | 🆕 for search hits (§5) |

## 7. Preview (GitHub-flavoured)

| Element | Film spec | Status |
|---|---|---|
| Container | padding `30 46`, 20 px / 1.55 (≈15 px app), `--fg1` | ✅ verify `markdown.css` |
| h1 / h2 | 38 / 29 px, weight 600, line-height 1.25, padding-bottom .28em, **1 px bottom rule `--border2`**, h2 margin-top 30 | ✅ GitHub style |
| Task list | **19 px checkbox, radius 5.** Unchecked: `inset 0 0 0 1.6px --border2` on `--bg-app`. **Checked: solid `--accent` fill + white check (stroke 3.2).** Gap 12. List bullets hidden on task items. | 🟡 Check that checkboxes are custom-styled to this (not native grey). |
| Bullets | 7 px solid dots `--fg1` | ✅ |
| Tables | collapse, cells padding `8 18`, 1 px `--border2`, `th` 600 left-aligned on `--bg-surface`. Centre-aligned column for `:-:` | ✅ verify alignment support |
| Blockquote | 4 px bar, radius 2, `--border2`, padding-left 22, text `--fg2` | ✅ |
| Code block | radius 10, bg `--code`, padding `18 22`, mono 17.5 / 1.5. Syntax: keyword `--kw`, string `--str` per theme | ✅ |
| Inline code | .84em, padding `.15em .42em`, radius 6, bg `--code` | ✅ |
| Pane divider | 1 px `--border2` | ✅ |
| **Scroll sync** | Proportional both ways: `previewY = srcY / srcMax × prevMax` | ✅ `markdown/scrollSync.ts` |
| **Sync indicator** | 58 px (≈40 app) round glass button sitting **on the split divider**, holding a ⇅ icon in accent | 🆕 Optional: a toggle on the divider that turns scroll sync on or off, with a tooltip saying "Scroll sync on". |

## 8. View-mode transition

| Behaviour | Film spec | App today | Status |
|---|---|---|---|
| Source → Split | Clicking Split (or `Ctrl+3`) moves the segmented control at once, then the **preview pane width animates 0 → 50% over 14 frames ≈ 470 ms, expo-out**. The source pane shrinks in step. | instant | 🆕 Animate the width/flex-basis. At app scale use ~200–250 ms. Instant under reduced motion. Never animate while typing. |

## 9. Themes

The film shows **"Ten accessible themes"** and switches between **Apple Light → Apple Dark → Solarized Light**. The tokens it uses match `src/theme/themes.ts` (✅ all 10 themes already exist).

| Element | Film spec | Status |
|---|---|---|
| Theme names shown | Apple Light / Apple Dark / Solarized Light in the title-bar chip **and** at the status bar's right end | 🟡 Status bar ✅. Chip 🆕 (§2). |
| **Swatch row** | 10 dots, 26 px, gap 9, ring `0 0 0 1.5px rgba(15,23,42,.18)`. **Active theme ring: `0 0 0 2px #fff, 0 0 0 4.5px --accent`** | 🆕 Use this as the theme-picker popover from the chip. Show each swatch with the theme name, and use arrow keys plus Enter. |
| Swatch colours (in order) | `#0f172a` Apple Dark, `#ffffff` Apple Light, `#0a0f1d` Midnight Blue, `#0d1117` GitHub, `#2e3440` Nord, `#1e1e2e` Catppuccin, `#2d353b` Everforest, `#fdf6e3` Solarized Light, `#111111` Monochrome, `#000000` High Contrast | Get these from `THEMES[*].colors.bgApp`. Don't hard-code them. |
| Theme switch motion | Film: a slit-scan wipe (cinematic only) | 🆕 Optional app version: a 150–200 ms colour cross-fade (`transition: background-color, color, border-color`), turned off under reduced motion. **No wipe effect in the app.** |

Film token reference (copied from `themes.ts` for the three themes on screen):

```json
{
  "apple-light":     {"bgApp":"#ffffff","bgSurface":"#f8fafc","bgRaised":"#ffffff","bgHover":"#f1f5f9","bgActive":"#e2e8f0","fg1":"#0f172a","fg2":"#475569","muted":"#697483","border":"#e2e8f0","border2":"#cbd5e1","accent":"#2563eb","code":"#f1f5f9","kw":"#1d4ed8","str":"#0a6b3d"},
  "apple-dark":      {"bgApp":"#0f172a","bgSurface":"#131d33","bgRaised":"#1e293b","bgHover":"#1e293b","bgActive":"#334155","fg1":"#f8fafc","fg2":"#cbd5e1","muted":"#8390a2","border":"#1e293b","border2":"#334155","accent":"#3473da","code":"#1e293b","kw":"#7dd3fc","str":"#86efac"},
  "solarized-light": {"bgApp":"#fdf6e3","bgSurface":"#f4ecd8","bgRaised":"#fffdf5","bgHover":"#eee8d5","bgActive":"#e3dcc6","fg1":"#073642","fg2":"#4a5f66","muted":"#5a6c72","border":"#e3dcc6","border2":"#c8c0a8","accent":"#1f6f9f","code":"#eee8d5","kw":"#1f6f9f","str":"#5c6d00"}
}
```

## 10. Command palette (`Ctrl+Shift+P`)

Film scene: the query `view` filters to **View: Source · View: Preview · View: Split (selected) · Toggle Sidebar · Search in Workspace**, each with its shortcut on the right.

| Element | Film spec (film px) | App today | Status |
|---|---|---|---|
| Panel | 1060 wide (≈600 app), radius 40 (≈16–20 app), padding 34. **Frosted glass:** bg `rgba(255,255,255,.58)`, `backdrop-filter: blur(26px) saturate(1.5)`, `inset 0 1.5px 0 rgba(255,255,255,.95)`, `inset 0 0 0 1px rgba(255,255,255,.55)`, shadow `0 24px 60px -18px rgba(15,23,42,.35)`. Dark variant: bg `rgba(30,41,59,.62)`, inset highlight `.16`. | `width: min(600px, 92vw)`, solid `--bg-surface`, `--radius-overlay: 14px` | 🟡 Optional glass material. Fall back to solid when `backdrop-filter` is unsupported or High Contrast is active. |
| Input | height 72 (≈44 app), radius 20 (≈12 app), ring `inset 0 0 0 1.5px --accent`, leading ⌘ icon, 28 px (≈16 app) | placeholder "Type a command…" | 🟡 Add the leading ⌘ icon and an always-on accent ring while open. |
| Rows | height 76 (≈36–40 app), radius 18 (≈8–10 app), gap 4, title 27 px / 500 | category + title + `Kbd` | ✅ |
| **Selected row** | **Solid `--accent` bg, white text**, shortcut stays at opacity .7 | `palette__item--selected` | 🟡 Check the selected style. Make it solid accent with white text. Each theme's accent is already contrast-checked against white (see the GitHub accent comment in `themes.ts`). |
| Shortcut | Right-aligned plain text 22 px / 500 at opacity .7 (`Ctrl+1`) | `<Kbd>` keycaps | ✅ Either works. Keep `Kbd`. |
| Entrance | Rises from below with motion blur (cinematic) | — | 🆕 Optional app version: 8 px rise + fade, 150 ms, ease-out. |

## 11. Keyboard shortcuts featured

All present in `commands/defaults.ts` ✅:

| Chord | Command shown in film |
|---|---|
| `Ctrl+1` | View: Source |
| `Ctrl+2` | View: Preview |
| `Ctrl+3` | View: Split |
| `Ctrl+B` | Toggle Sidebar |
| `Ctrl+Shift+F` | Search in Workspace |
| `Ctrl+Shift+P` | Command Palette |

The film's on-screen keycaps (white gradient caps, a 6 px "travel" shadow, a spring press) are a marketing overlay. Don't add them to the app.

## 12. Status bar

Film: left `Markdown · UTF-8 · Ln 2, Col 14`, right the theme name. Height 32 (≈28 app), 13.5 px `--muted`, gap 22, bg `--bg-surface`, top border `--border2`.
App: richer (words/chars, read time, EOL, view mode, zoom, version). **✅ No change needed.** The film is a simplification. Optional: order the right side as language → encoding → Ln/Col so it reads like the film.

## 13. Motion language (for anything you animate)

| Use | Curve | Film duration | Suggested app duration |
|---|---|---|---|
| Panels opening (sidebar, split, search slide) | expo-out `1 - 2^(-10t)` | 9–14 f (300–470 ms) | 160–250 ms |
| Scroll jumps | cubic in-out or expo-out | 14 f (470 ms) | 250–350 ms |
| Small pops (checkbox, rule, badge) | back-out (overshoot ~1.9) | 10 f (330 ms) | 150–200 ms |
| List stagger | translateY 26 → 0 + fade | 3 f (100 ms) apart | 30–40 ms apart, max 8 items |
| Overlays (palette) | ease-out rise + fade | — | 150 ms |

Rules: animate `transform`/`opacity` (or a single width/flex-basis for panes) and nothing on the typing path. Reduced motion means instant.

## 14. Film-only (do NOT build into the app)

- Markdown glyphs "flying" from source to preview ("ink becomes type")
- Slit-scan theme-wipe with a glowing scan line
- Floating keycap overlays and frosted-glass caption pills
- Camera pushes and motion blur
- The "Preview / Themes" frosted-title cards
- The "No accounts. No paid tier. No telemetry." checkbox sequence
- The end card (logo assembling, wordmark streaks, underline sweep)

**Messaging the film uses** (for the README, website and release notes, not UI):
"GitHub-accurate preview" · "Ten accessible themes" · "Keyboard-first" · "Everything stays on this PC." · "No accounts. No paid tier. No telemetry." · "Free for Windows 10 & 11" · `github.com/sosakib/NotepadSuperPlus/releases`

---

## 15. Prioritised change list

| # | Change | Section | Size | Acceptance check |
|---|---|---|---|---|
| 1 | Merge or reconcile `feature/v1.5` title-bar work **before** touching the title bar | §2 | — | No duplicate title-bar implementations |
| 2 | Highlight the search match in the snippet, editor line + word, and preview word | §5 | M | Searching `scroll-synced` and clicking a hit marks the line and word in source **and** preview. The mark clears on the next edit. |
| 3 | Search-as-you-type (debounced ~200 ms) + count pill | §5 | S | Results update while typing. Enter still works. No search runs per keystroke without the debounce. |
| 4 | View-mode switch restyle (raised active pill on a `--bg-active` track) | §2 | S | Matches §2 in all 10 themes. Contrast ≥ 4.5:1 for labels. |
| 5 | Theme chip in the title bar + swatch picker popover | §2, §9 | M | The chip shows the current theme. The picker lists all 10 with names, works with the keyboard, and rings the active theme. |
| 6 | Rail active state: filled tile + 3 px rounded accent bar | §3 | S | Visual match. The active state is still announced (`aria-pressed`/`aria-current`). |
| 7 | Tasks render as the custom 19 px accent checkbox | §7 | S | Checked = accent fill + white check in every theme |
| 8 | Animate sidebar open/close and the Source→Split pane reveal | §4, §8 | M | ~200 ms expo-out. Instant with reduced motion. No layout jank while typing (perf test stays green). |
| 9 | Tabs moved into the title bar (if v1.5 doesn't already do it) | §2 | L | One row. Drag region still works. Dirty dot/close slot behaviour kept. |
| 10 | Optional: glass command palette, scroll-sync divider toggle, theme cross-fade, JetBrains Mono default | §7, §9, §10 | S each | Behind solid fallbacks. High Contrast theme stays solid. |

After any change: `npm test` (vitest), `cargo test`, and a visual check in Apple Light, Apple Dark, Solarized Light and High Contrast.
