# Brand Guidelines — Notepad Super Plus

Version 1.0 · Last updated 2026-07-26

This document governs how the Notepad Super Plus mark, palette and interface conventions are
used. It describes what the repository actually contains today; where something is a
recommendation rather than a shipped rule, it says so.

---

## 1. The mark

### 1.1 Source of truth

Artwork masters live in **`assets/icon/`**. This directory is the only approved origin for the
mark. **Never draw, trace, regenerate or substitute a replacement.**

| File | Role |
|---|---|
| `notepad-super-plus.ai` | Illustrator master. Editing origin. Not a build input. |
| `notepad-super-plus.svg` | Vector export. Use for any surface that can take vector. |
| `notepad-super-plus.ico` | 7-frame Windows icon — 16, 24, 32, 48, 64, 128, 256. Ships directly as `src-tauri/icons/icon.ico` and `public/favicon.ico`. |
| `notepad-super-plus-8192.png` | 8192×8192 raster export. **Not directly usable** — see 1.2. |
| `icon-source-1024.png` | The build input. See 1.2. |

### 1.2 The padding trap

`notepad-super-plus-8192.png` centres the artwork in roughly **59 %** of its canvas. Feeding it
straight to `pnpm tauri icon` bakes a ~20 % dead margin into every generated size, which makes
the icon look small and timid next to every other taskbar icon.

`assets/icon/icon-source-1024.png` is the corrected build input: the same artwork cropped to its
opaque bounds and resampled to 1024×1024. **Always regenerate from
`assets/icon/icon-source-1024.png`**, never from the raw 8192 export. Full procedure in
[BUILD.md](BUILD.md) § Icons.

### 1.3 Anatomy

A rounded square in a navy-to-blue diagonal gradient, containing a notebook: a dark spine on the
left, a white page carrying a `#` heading and grey text rules, and a blue `+` at lower right.

The `#` and the `+` are the semantic payload — Markdown, and "plus". Neither may be removed,
recoloured or repositioned.

### 1.4 Clear space and minimum size

- **Clear space:** at least 25 % of the mark's width on every side. Nothing else — text, rules,
  other icons — enters that space.
- **Minimum size:** **16 px**. Below that the `#` and text rules stop resolving and the mark
  reads as a blue blob. Use the 16 px frame from the `.ico`; do not downscale a larger raster.

### 1.5 Never do this

- Do not apply a `border-radius` to the mark. It carries its own corner radius; a second one
  clips into the artwork. The in-app CSS documents this at `.titlebar__logo`.
- Do not place it on a coloured background of its own — no gradient chip, no accent square. The
  mark supplies its own shell.
- Do not recolour, rotate, skew, add a drop shadow, or outline it.
- Do not stretch. The artwork is square; preserve the aspect ratio.
- Do not use the mark as a bullet, a text glyph, or a repeating pattern.

### 1.6 Where the mark appears

Deliberately restrained. On four in-app surfaces only:

| Surface | Size | File |
|---|---|---|
| Title bar | 22 px | `src/shell/TitleBar.tsx` |
| Welcome hero badge | 16 px | `src/components/WelcomeScreen.tsx` |
| About dialog | 48 px | `src/components/AboutDialog.tsx` |
| Settings → About | 48 px | `src/settings/AboutTab.tsx` |

All four import `src/assets/brand-mark.png` (the official `.ico`'s 128 px frame).

**Empty states, panel headers, toolbars and dialogs use generic
[lucide](https://lucide.dev) glyphs, not the mark.** A logo repeated on every screen stops being
a brand and becomes noise. Adding a fifth in-app placement should be argued for, not assumed.

OS-level surfaces — executable, taskbar, Start Menu, desktop shortcut, installed-app entry, File
Explorer, Alt+Tab, installer wizard, uninstaller — are all driven by `src-tauri/icons/` and the
`bundle.windows.nsis` `installerIcon` / `uninstallerIcon` keys. **Both NSIS keys must stay set**;
when they are absent Tauri silently substitutes its own stock installer icon.

---

## 2. Colour

### 2.1 Mark palette

Sampled from `assets/icon/icon-source-1024.png`. These describe the artwork; they are **not** UI tokens and
must not be hardcoded into components.

| Role | Hex |
|---|---|
| Brand blue (the `+`) | `#2978EF` |
| Shell gradient — light end | `#3A73CB` |
| Shell gradient — mid | `#415A7C` · `#2E4C7A` |
| Shell gradient — dark end | `#262C35` |
| Notebook spine | `#30363C` |
| Page | `#F8FAFB` |
| Page text rules | `#C2C5C8` |

### 2.2 Interface colour is tokens, never literals

Every interface colour comes from a semantic token. Components read `var(--token)`; they never
write a hex value. The token contract lives in `ThemeTokens` (`src/theme/themes.ts`) and is
applied to the document root by `src/theme/applyTheme.ts`.

```
bg-app  bg-surface  bg-raised  bg-hover  bg-active
fg-primary  fg-secondary  fg-muted
border-subtle  border-strong
accent  accent-fg
danger  warning  success
selection
```

There is exactly one documented exception in the codebase: `--alert-important` in
`src/styles/markdown.css`, which holds GitHub's purple for `> [!IMPORTANT]` callouts. The token
set has no purple, and mapping it onto `--accent` would make IMPORTANT and NOTE identical. The
exception is commented in place. **Do not add a second exception without recording why.**

### 2.3 Accessibility floor — enforced, not aspirational

`src/theme/contrast.test.ts` holds every bundled theme to WCAG 2.2:

- **4.5:1** — all text pairs, against every surface the text can land on, plus button label on
  accent, and text on selection.
- **3:1** — accent (the focus ring) and the three status colours against the app background.
- **≥ 1.15× separation** between the primary/secondary/muted text ramp, so the three tiers stay
  distinguishable. Ratios alone do not catch a collapsed hierarchy.
- Every Markdown syntax palette against its editor background.

Borders are deliberately **not** asserted. WCAG 1.4.11 exempts decorative dividers and
inactive-component boundaries; forcing 3:1 onto a 1 px panel seam would wreck the restraint the
palettes exist for. The focus ring, which does need 3:1, is `--accent` and is asserted.

**A theme that fails these floors fails CI.** When adding or editing a palette, run the test and
fix the palette — do not lower the threshold.

---

## 3. Gradients

Gradients are **accents, not surfaces**. Most of the interface is flat and neutral.

`--accent-gradient` and `--accent-gradient-hover` are **derived from `--accent`** via
`color-mix(in oklab, …)`, so they follow the active theme automatically. They were previously a
hardcoded blue ramp, which meant five of the bundled themes painted blue gradients that fought
their own accent.

**Approved gradient surfaces** — this list is the whole list:

- Command palette selected row
- Welcome hero title (as clipped text) and primary button
- Settings active tab

**Never**: page or panel backgrounds, the editor surface, the preview surface, the sidebar,
toolbars, status bar, tab strip, body text, or the brand mark.

Two derived shadow tokens carry the same rule: `--shadow-accent` / `--shadow-accent-hover` tint
from `--accent` and are used only on the welcome primary button.

---

## 4. Elevation and shadow

`--shadow-color` is scheme-aware. `applyTheme` stamps `data-scheme="dark"|"light"` on the root;
light themes override the tint to a hue-matched `220deg 45% 22%` at much lower opacity.

Reason: a flat 45 %-black drop reads as depth on a navy shell and as a dirty smudge on a cream
one. Light interfaces carry depth with far less shadow than dark ones.

| Token | Use |
|---|---|
| `--shadow-overlay` | Modals, command palette |
| `--shadow-dropdown` | Menus, popovers |
| `--shadow-accent` / `--shadow-accent-hover` | Welcome primary button only |

Do not write a literal `rgba(0,0,0,…)` shadow. Use `hsl(var(--shadow-color) / …)`.

---

## 5. Typography

| Token | Stack | Use |
|---|---|---|
| `--font-ui` | Inter → system sans | All interface text |
| `--font-display` | Geist → Inter → system | Headings, welcome hero, About title |
| `--font-mono` | Cascadia Code → JetBrains Mono → Geist Mono → Consolas | Editor, code blocks, `.kbd` |

Base size 13 px, line-height 1.45.

> **Known gap (D1).** Inter, Geist and JetBrains Mono are named in the stacks but **no font files
> ship**. On a stock Windows machine every one falls back to Segoe UI or Consolas, so the designed
> typography never actually renders. Either self-host the woff2 files (~200 KB, preserves the
> offline guarantee) or drop the names from the stacks so the fallback is the honest intent.
> Unresolved — this is decision #3 in `reports/REMAINING_TASKS.md` § 7.

---

## 6. Shape, spacing and motion

### 6.1 Radius

| Token | Value | Use |
|---|---|---|
| `--radius-xs` | 3 px | Dense inline controls — `.kbd`, segmented items, tree row actions |
| `--radius-sm` | 4 px | Small controls |
| `--radius-control` | 6 px | Buttons, tabs, inputs |
| `--radius-panel` | 10 px | Cards, panels |
| `--radius-overlay` | 14 px | Modals, command palette |
| `--radius-full` | 9999 px | Pills, scrollbar thumbs |

`50%` stays literal for true circles (dirty dot, avatars).

### 6.2 Spacing

`--space-1` … `--space-8` = 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 px. Use the scale for layout
gaps, padding and margins.

Small control padding is intentionally **off-scale** (`3px 10px`, `5px 8px`, …). Optical sizing
of a 24 px control does not land on a 4 px grid, and inventing a token per one-off value is churn
rather than consistency. Layout spacing uses the scale; control padding may not.

### 6.3 Motion

| Token | Value | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.22, 0.61, 0.36, 1)` | Anything that settles — hovers, fades, menus |
| `--ease-emphasis` | `cubic-bezier(0.34, 1.32, 0.64, 1)` | Slight overshoot, for things that should feel picked up |
| `--dur-instant` | 90 ms | Colour and background swaps |
| `--dur-fast` | 140 ms | Standard hover and focus |
| `--dur-base` | 200 ms | Transforms, elevation changes |

Rules:

- **Animate `transform` and `opacity` only.** Both composite off the main thread. Animating
  layout properties competes with typing latency, which is this app's core promise.
- **Never `transition: all`.** It animates layout properties and silently picks up any property
  added later.
- **Move the glyph, not the button.** A 32 px target that grows shoves its neighbours; the same
  movement inside a fixed target reads as the icon responding to the cursor.
- **Honour `prefers-reduced-motion`.** The global rule zeroes durations, which is not enough on
  its own — it turns a transform into an instant jump. Decorative transforms are additionally
  suppressed outright in `shell.css`.
- **No animation runtime.** Icon motion is plain CSS on the existing lucide glyphs. Animated-icon
  component libraries pull in an animation runtime on the boot path, and cold start is this
  project's largest open risk (blocker B1).

---

## 7. Voice

Free and open source, MIT, community-driven. No accounts, no paid tier, no telemetry — and the
copy says so plainly rather than implying a paid edition exists.

**Avoid** "premium", "pro", "upgrade", "unlock", and anything else that reads as a gated feature.
The About dialog previously opened with "A premium, lightweight…", which is exactly the wrong
signal for a project with no paid tier.

Describe what the app does, not how excellent it is. "Lightweight Markdown editor for Windows"
beats "the ultimate Markdown experience".

---

## 8. Adding a theme

1. Add the palette to `src/theme/themes.ts` and append it to `SELECTABLE_THEMES`.
2. Add a matching syntax palette to `PALETTES` in `src/editor/theme.ts`. TypeScript enforces
   this — `Record<ThemeId, SyntaxPalette>` will not compile without it.
3. Run `pnpm test`. Fix the palette until the contrast assertions pass.
4. Nothing else. The picker and the rail's cycle button are both derived from
   `SELECTABLE_THEMES`, so a new theme appears in each automatically.

**Earn the slot.** The pack is 7 dark / 2 light / 1 high-contrast. Another cool dark theme
duplicates an identity already present — Tokyo Night, One Dark Pro, Dracula and Rosé Pine were all
declined on exactly that basis. Everforest, Solarized Light and Minimal Monochrome were accepted
because each was the only warm dark, the second light theme, and the only achromatic theme
respectively.

Where a borrowed palette fails the contrast floor, **adjust it and comment the original value**.
Established schemes are tuned for their own backgrounds, not for this app's — Solarized's green
and cyan measure under 3:1 on its own light base here.

---

## 9. Recommendations

Not blocking, but the honest next steps for the brand layer.

1. **Bundle the fonts, or stop naming them.** The single largest gap between designed and
   rendered appearance (§ 5).
2. **Add a purple token** if GitHub callouts (FR-3.6) ship, and retire the `--alert-important`
   exception (§ 2.2).
3. **Sign the installers.** Unsigned builds trigger a SmartScreen warning on every download,
   which undoes a great deal of what a considered icon and interface achieve.
4. **Consider a `--brand-*` token group** if the mark's colours are ever needed in UI — today
   they are correctly kept out of the token layer.
5. **Screenshots and a demo GIF** for the README and release page. Currently there are none, so
   the interface work is invisible to anyone deciding whether to download.
