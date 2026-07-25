# Release Preparation Report

**Scope:** de-monetisation, brand/icon integration, theme system review, release documentation.
**Dates:** 2026-07-25 → 2026-07-26 · **Branch:** `develop` (base `e100564`)
**Diff:** 40 files changed, +580 / −110, plus 6 new paths.

This report records what was done, what was found, and what still stands between this repository
and a defensible v1.0.0. Section 7 is the part to read if you read only one.

---

## 1. Summary

Six phases were run in order, each checkpointed in [PROGRESS.md](PROGRESS.md).

| Phase | Outcome |
|---|---|
| 1 — Audit | No code changed. 31 findings recorded. |
| 2 — De-monetise | **Nothing to remove** — the repo never had monetisation. One misleading word. |
| 3 — Branding & icon | All 17 platform icons regenerated from the official master; 4 in-app surfaces; favicon. |
| 4 — Theme system | **31 measured contrast failures fixed.** 3 new themes. Gradients and shadows made theme-aware. |
| 5 — Consistency & QA | **Installer was shipping the wrong icon** — found and fixed. Full gate suite run. |
| 6 — Docs & release | This report + [BRAND_GUIDELINES.md](BRAND_GUIDELINES.md). |

**Three findings mattered more than the rest**, and none were visible without doing the work:

1. **The NSIS installer shipped the stock Tauri/NSIS icon.** `installerIcon` and
   `uninstallerIcon` were never configured. The config looked complete; only extracting the icon
   from a compiled `setup.exe` exposed it.
2. **31 WCAG contrast failures across the bundled themes**, including muted text at **2.45:1** and
   editor syntax colours at **2.93:1**. The palettes had never been measured.
3. **`src/editor/theme.ts` documented a "≥ 4.5:1" guarantee that was false** for six themes. The
   claim was in a docstring; nothing checked it.

---

## 2. De-monetisation

**Result: no monetisation code, UI, or copy has ever existed in this repository.**

The whole tree (excluding `node_modules/`, `target/`) was grepped for pricing, subscription,
subscribe, paywall, stripe, checkout, billing, freemium, premium, trial, licence/license key,
activation key, purchase, payment, paddle, lemonsqueezy, gumroad, donate, sponsor, patreon, buy
now, upgrade to pro, pro plan, paid plan, and tier.

Three near-hits, all false positives: `"Premium restraint"` as a visual-design principle in
`docs/00`, plugin capability **tiers** in `docs/17`, and `actions/checkout@v4` in CI.

Two changes were made, both stating the position rather than removing anything:

- `src/components/AboutDialog.tsx` — the lead read "A **premium**, lightweight, open-source…".
  Accurate about the license, wrong about the signal: "premium" in an About dialog implies a paid
  edition. Now: *"A free, open-source desktop Markdown editor built for speed, focus, and technical
  writing. MIT-licensed and community-driven — every feature, no accounts, no paid tiers."*
- `README.md` — added under the tagline: *"**Free and open source, forever.** Every feature is in
  the box — no accounts, no paid tier, no telemetry."*

Re-read and confirmed already correct, no edit needed: `LICENSE` (MIT), `package.json` license
field, `tauri.conf.json` publisher, Settings → About, `SECURITY.md`, installer hooks, CHANGELOG.

---

## 3. Branding and icon integration

### 3.1 Pipeline

The supplied 8192×8192 master could not be used directly — its artwork occupies only **58.6 %** of
the canvas, so `pnpm tauri icon` would have baked a ~20 % dead margin into every generated size.

Corrected by measuring the opaque bounding box (LockBits on a 1024 proxy), cropping a square
around it (source-space `x=1688 y=1688 side=4824`) and resampling to 1024×1024 →
`assets/icon-source.png` → `pnpm tauri icon`.

**No substitute artwork was drawn.** Every output is a resample of the supplied master.

Two CLI behaviours needed correcting, both now documented in `docs/BUILD.md` § Icons:

- Its generated `icon.ico` carries only **6 frames and no 128 px**. Overwritten with the official
  7-frame file (16/24/32/48/64/**128**/256), verified by parsing the ICO directory.
- It also emits `src-tauri/icons/android/` and `ios/` (35 files). Removed — Windows-first desktop
  app, never bundled.

### 3.2 Coverage

| Surface | State | Evidence |
|---|---|---|
| Executable | ✅ | Icon extracted from compiled `notepad-super-plus.exe` — brand mark, embedded in the PE resource table |
| Taskbar · Start Menu · desktop shortcut · installed-app entry · File Explorer · Alt+Tab | ✅ | All driven by the exe's embedded icon group |
| **Installer wizard** | ✅ **after fix** | Was the stock NSIS icon. See 3.3 |
| **Uninstaller** | ✅ **after fix** | Same fix |
| Title bar | ✅ | Live DOM: `IMG`, natural 128×128, rendered 22×22, no background, no radius |
| Welcome hero badge | ✅ | Live DOM: rendered 16×16. Replaced a generic `Sparkles` glyph |
| About dialog | ✅ | Live DOM: rendered 48×48 |
| Settings → About | ✅ | Live DOM: rendered 48×48 |
| Favicon / WebView tab | ✅ | HTTP 200, `image/x-icon`, 43 027 bytes, 7 frames |
| Splash screen | **n/a** | Does not exist. Building one is a new feature, outside this brief. |
| Notification-area / tray icon | **n/a** | Does not exist; the tray plugin is not a dependency. Same reason. |

No `N+` text placeholder remains anywhere in the app (verified against the live DOM).

### 3.3 The installer icon defect

`bundle.windows.nsis` set `installerHooks` and `installMode` but **neither `installerIcon` nor
`uninstallerIcon`**. Tauri falls back to its own stock installer graphic when they are absent, and
does so silently.

Confirmed by extracting the icon from the compiled `Notepad Super Plus_0.1.0_x64-setup.exe`: a
generic globe-and-arrow install graphic, not the brand mark. Both keys now point at
`icons/icon.ico`. Re-extracted after a second full build — brand mark confirmed.

**This is the one item that could not have been verified any other way.** Reading the config, or
the generated icon files, would have shown everything as correct.

---

## 4. Theme system

### 4.1 Method

Reviewed by measurement. `src/theme/contrast.test.ts` (new) holds every bundled theme to WCAG 2.2
floors and fails CI on regression:

- 4.5:1 for all text pairs against every surface the text can land on, button label on accent, and
  text on selection.
- 3:1 for accent (the focus ring) and the three status colours.
- ≥ 1.15× separation across the primary/secondary/muted ramp — ratios alone do not catch a
  collapsed hierarchy.
- The same 4.5:1 floor for every Markdown syntax palette against its editor background.

The suite grew from **77 tests to 309**.

### 4.2 What the first run found — 31 failures

| Theme | Failure |
|---|---|
| Apple Light | `fg-muted` **2.45:1** on surface — the worst in the pack |
| Apple Dark | `fg-muted` 3.07:1; white button label on accent 3.68:1 |
| GitHub | `fg-muted` 3.77:1; white button label 3.75:1; text on selection 4.42:1 |
| Midnight Blue | `fg-muted` 3.56:1 |
| Catppuccin | `fg-muted` 4.44:1 |
| Nord | text ramp **10.84 / 10.26 / 9.25:1** — three tiers, no hierarchy. `bg-active` (`#5e81ac`, Nord's signature blue) carried primary text at **3.50:1** |
| dark · apple-dark | syntax `comment` 4.33:1 |
| light · apple-light | syntax `number` **3.41:1**, `comment` **3.41:1**, `link` 4.50:1 |
| nord | syntax `comment` **3.03:1**, `link` 3.95:1, `invalid` 4.20:1 |
| catppuccin | syntax `comment` 3.98:1 |

Every value is fixed and **commented in place with the ratio it replaced**, so a future edit
cannot quietly restore a failure.

### 4.3 Structural fixes

- **`--accent-gradient` was a hardcoded Apple-blue ramp.** Five themes painted blue gradients that
  clashed with their own accent across six surfaces. Now derived from `--accent` via
  `color-mix(in oklab, …)`. Verified live across all 10 themes: the mid stop equals each theme's
  accent exactly.
- **Shadows were hardcoded for dark themes** — a flat 45 %-black drop and a 50 %-black modal scrim
  greyed out the light themes. `applyTheme` now stamps `data-scheme`; light themes get a
  hue-tinted, much lighter set. Verified live.
- **The theme rail button reached only 4 of 9 themes** (defect D2). `THEME_CYCLE` is now derived
  from `SELECTABLE_THEMES`; a new theme joins automatically. Two tests added, one asserting every
  bundled theme is reachable.

### 4.4 New themes — 3 added, 4 declined

Accepted, each closing a real gap in a pack that was 5 dark / 1 light / 1 HC and entirely cool:

| Theme | Justification |
|---|---|
| **Everforest** | The only warm dark. Every other dark theme is cool — navy, slate, arctic, pastel lavender. |
| **Solarized Light** | The second light theme. A cool white page is the wrong surface for long reading in a bright room. |
| **Minimal Monochrome** | The only achromatic theme. Status colours deliberately keep their hue — a destructive confirmation that differs from body text only by lightness is a usability regression, not consistency. |

**Declined:** Tokyo Night, One Dark Pro, Dracula, Rosé Pine — all cool darks duplicating an
identity already in the pack.

Borrowed palettes were adjusted where they failed the floor. Solarized's own green and cyan
measure **2.93–2.97:1** on its light base; they are tuned for Solarized Dark, not for this app.

Final pack: **10 selectable themes**, verified live in the picker.

---

## 5. Motion and consistency

### 5.1 Motion

The shell mixed `linear` and `ease`, 100/120/150 ms, and two `transition: all` declarations across
neighbouring components — which reads as jitter. Unified into `--ease-out`, `--ease-emphasis`, and
`--dur-instant|fast|base`.

Icon motion added to rail, tab-close (rotates 90°) and new-tab glyphs. The **glyph** moves, not
the button — a 32 px target that grows shoves its neighbours around. `transform` and `opacity`
only, so it composites off the main thread and costs nothing on the typing path.

`prefers-reduced-motion` handled properly: the pre-existing global rule only zeroes *durations*,
which turns each transform into an instant jump. Decorative transforms are now suppressed outright.

> **Note on the `itshover` request.** Adopting that icon set was considered and declined, with your
> agreement. They are hover-animated React components, **not app icons** — Windows app icons are
> static raster, so they could never have replaced the brand mark. Coverage was **1 of ~19** icons
> this app uses. They are **Apache-2.0** (their `package.json` says MIT; the `LICENSE` file
> governs), which would add attribution obligations to a project documented as MIT-only. And they
> require the `motion` runtime on the boot path, directly worsening blocker B1. The same visual
> result was achieved with CSS on the existing lucide glyphs, at zero dependency cost.

### 5.2 Consistency

| Finding | Resolution |
|---|---|
| `markdown.css` hardcoded `#a855f7` on `.markdown-alert-important` while every sibling used a token | Hoisted to a documented `--alert-important` variable. The token set has no purple, and reusing `--accent` would make IMPORTANT and NOTE identical. Recorded that the whole `.markdown-alert-*` block is currently **unrendered** — FR-3.6 is unimplemented (defect D3). |
| `AboutDialog.tsx` hardcoded `#ef4444` twice | → `var(--danger)` |
| Five controls used a raw `3px` radius no token described | Added `--radius-xs`, replaced all five |
| `AlertTriangle size={15}` — the only 15 px glyph in the app | → 16 |
| Four `gap` values matching the spacing scale exactly | Tokenised. Off-scale control padding deliberately left alone — inventing a token per one-off optical value is churn, not consistency. |

---

## 6. QA results

| Gate | Result |
|---|---|
| `pnpm typecheck` | ✅ clean |
| `pnpm lint` | ✅ clean |
| `pnpm format:check` | ✅ clean |
| `pnpm test` | ✅ **309 passed / 14 files** (from 77 / 13) |
| `cargo fmt --check` | ✅ clean |
| `cargo clippy --all-targets -- -D warnings` | ✅ clean |
| `cargo test` | ✅ **25 passed / 0 failed** |
| `pnpm audit --prod` | ✅ **No known vulnerabilities** |
| `pnpm tauri build` | ✅ NSIS **2.6 MB** · MSI **3.4 MB** (budget < 15 MB) |
| `pnpm audit` (incl. dev) | ⚠️ **7** — see below |
| `cargo audit` | ✅ **0 vulnerabilities** across 513 crates. 17 informational warnings — see 6.1 |

**The 7 advisories are all devDependencies; none reach shipped code.** One was fixable and is
fixed — `brace-expansion` (HIGH, DoS) pinned to `^5.0.8` via a scoped `pnpm.overrides` entry,
taking the count 8 → 7. The remainder have no in-major fix:

| Advisory | Needs | Current |
|---|---|---|
| vitest — arbitrary file read/execute via UI server (**CRITICAL**) | ≥ 3.2.6 | 2.1.9 (latest 2.x) |
| vite — `server.fs.deny` bypass on Windows (**HIGH**) | ≥ 6.4.3 | 5.4.21 (latest 5.x) |
| vite — path traversal; NTLM hash disclosure (moderate ×2) | ≥ 6.4.3 | 5.4.21 |
| esbuild — dev-server request forgery (moderate) | via vite 6 | 0.21.5 |

Clearing these requires **vite 5 → 6 and vitest 2 → 3** — major build-toolchain upgrades, which the
brief lists as a stop-and-ask condition. Not done. Two are Windows-specific and this is a
Windows-first project, so they do affect a developer running `pnpm dev` on an untrusted network.

### 6.1 The 17 `cargo audit` warnings

None are vulnerabilities. **16 unmaintained + 1 unsound**, and the majority do not exist in the
shipped Windows binary at all:

- `atk`, `atk-sys`, `gdk`, `gdk-sys`, `gdkwayland-sys`, `gdkx11`, `gdkx11-sys`, `gtk`, `gtk-sys`,
  `gtk3-macros`, `glib` (the one *unsound* advisory, RUSTSEC-2024-0429) — **Linux GTK stack**.
  Present in `Cargo.lock` because Tauri's dependency graph names them for the Linux target; they
  are never compiled into a Windows build. Not actionable from this repository.
- `unic-char-property`, `unic-char-range`, `unic-common`, `unic-ucd-ident`, `unic-ucd-version`,
  `proc-macro-error` — unmaintained transitive crates, upstream of Tauri. They clear when Tauri
  updates its own dependencies.

Nothing here is fixable in this repo without an upstream change, and nothing here is a
vulnerability. Recorded so a future run is not mistaken for a regression.

### 6.2 Verification limits — read this

- **No screenshots.** The browser pane was not displayed in this session, so screenshot capture
  timed out throughout. In-app verification was done by reading the live DOM and computed styles,
  which is stricter than a screenshot for colours, sizes and transitions — but it is not a visual
  sign-off.
- **The OS-level surfaces were verified programmatically, not visually.** Icons were extracted
  from the compiled binaries and inspected. Taskbar, Alt+Tab, Start Menu and the installer wizard
  in flight still warrant a human look.
- **The installers were built but never installed.** No clean-machine install test was performed.
- **One bug was introduced and fixed during this work**: a misplaced brace moved the entire
  fallback-token block inside `:root[data-scheme="light"]`. Nothing detected it — `applyTheme`
  writes tokens as inline styles, which outrank stylesheet rules, so the running app looked
  perfect. Now guarded by a test asserting `:root` declares all 16 fallbacks.

---

## 7. Release checklist

### 7.1 Complete

- [x] No monetisation code, UI or copy anywhere
- [x] Official icon on every surface that exists; no placeholder or generated substitute remains
- [x] Icon confirmed **embedded** in the exe and both installers, not merely referenced
- [x] All 10 themes reviewed against the Phase 4 checklist and holding WCAG 2.2 floors in CI
- [x] Gradients and shadows derive from the active theme
- [x] Full lint / typecheck / format / test / audit suite run and documented
- [x] `RELEASE_PREPARATION_REPORT.md` and `BRAND_GUIDELINES.md` exist and match the repo
- [x] `PROGRESS.md` reflects the final status of every Phase 1 finding

### 7.2 Blocking a v1.0.0 tag — none of these are in this brief's scope

From the audited [REMAINING_TASKS.md](REMAINING_TASKS.md), unchanged by this work:

- [ ] **B1 — cold start 1.8–2.5 s against a < 500 ms budget.** The headline promise is "launches
      instantly". No bench harness exists, so there is no regression guard. *~1 week.*
- [ ] **B2 — FR-3.2 Shiki code highlighting and FR-3.3 frontmatter panel**, both marked P0.
      Fenced code renders unstyled; YAML frontmatter renders as body text. *~4 days.*
- [ ] **B3 — FR-6.4 session restore (P0).** Closing the app loses all open tabs and cursor
      positions. *~2 days.*
- [ ] **B4 — no end-to-end tests.** `docs/10 §3` defines 10 release-blocking journeys; none are
      automated. Every file-dialog path is verified only by unit tests, never clicked. *~1 week.*
- [ ] **Stage 8 — professional editing features absent entirely.** No smart lists, no auto-close
      pairs, no table navigation. *~1 week.*
- [ ] **Installers are unsigned.** SmartScreen will warn every user on every download. Requires a
      purchased certificate — a business step, not an engineering one.

### 7.3 Decisions needed from you

1. **Version bump.** All three manifests still read `0.1.0`. **Deliberately not bumped** — tagging
   `1.0.0` while §7.2 stands would ship a claim the code does not back.
2. **`Icon/` is untracked** (~4.2 MB: 2.6 MB `.ai`, 712 KB `.svg`, 806 KB `.png`, 43 KB `.ico`).
   It is the stated source of truth so it probably belongs in version control, but committing 4 MB
   of binary masters is a judgement call.
3. **vite 5 → 6 / vitest 2 → 3** to clear the dev-only advisories (§ 6). **Deliberately not done
   here:** a major build-toolchain upgrade with no end-to-end tests (blocker B4) to catch breakage
   is the wrong change to make last. Do it first in the next work block, not last in this one.
4. **Code-signing certificate** — buy, or ship unsigned with the SmartScreen warning.
5. **Repo visibility** — currently private. Public release needs a flip, which also unlocks CodeQL
   and branch protection.
6. **Bundle the fonts** — Inter/Geist/JetBrains Mono are named but no files ship, so the designed
   typography never renders (defect D1, `BRAND_GUIDELINES.md` § 5).

### 7.4 Before tagging, whenever that happens

- [ ] Human visual pass: taskbar, Alt+Tab, Start Menu, File Explorer, installer wizard in flight
- [ ] Clean-machine install test (never performed)
- [ ] Screenshots and demo GIF for README and the release page
- [ ] Bump version in `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`
- [ ] Move the `[Unreleased]` CHANGELOG section under the release heading
- [ ] SBOM, checksums, attestations (`docs/18 §4`)

---

## 8. Honest assessment

This work produced a **release-ready brand, theme and documentation layer**. The icon is correct
everywhere it can be, the themes are accessible and enforced by tests, the interface is internally
consistent, and the documentation matches the repository.

It did **not** produce a functionally complete v1.0. None of the six phases touched B1–B4, and the
brief explicitly forbade adding features. An app that takes 2.5 seconds to start, loses your open
tabs when you close it, renders fenced code unstyled, and has zero end-to-end tests is not one to
tag 1.0.0 — regardless of how good the icon looks.

The honest framing: **this is a strong 0.9.** Roughly 7–8 focused engineer-weeks of the work in
§ 7.2 stands between here and a v1.0.0 worth defending.
