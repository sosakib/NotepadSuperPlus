# `assets/`

Design and branding assets. Nothing here is imported by application code — the app imports
`src/assets/brand-mark.png` and Vite serves `public/`.

```
assets/
├── icon/         artwork masters + the build input
├── branding/     ready-to-use exports for README, GitHub, release pages
└── screenshots/  product screenshots used by the README
```

## `icon/` — source of truth

The **only** approved origin for the mark. Never draw, trace or substitute a replacement.
Usage rules: [docs/BRAND_GUIDELINES.md](../docs/BRAND_GUIDELINES.md).

| File | Role |
|---|---|
| `notepad-super-plus.ai` | Illustrator master. Editing origin. Not a build input. |
| `notepad-super-plus.svg` | Vector export. |
| `notepad-super-plus.ico` | 7-frame Windows icon (16/24/32/48/64/128/256). Ships as `src-tauri/icons/icon.ico` and `public/favicon.ico`. |
| `notepad-super-plus-8192.png` | Raw raster export. **Not a build input** — its artwork fills only ~59 % of the canvas. |
| `icon-source-1024.png` | **The build input.** The master cropped to its opaque bounds. `pnpm tauri icon` runs against this file and nothing else. |

Regenerating the platform icon set: [docs/BUILD.md](../docs/BUILD.md) § Icons.

## `branding/`

Exports for documentation and release pages. Derived from `icon/`; regenerate rather than edit.

## `screenshots/`

Product screenshots referenced by the README. See `screenshots/README.md`.

## Generated elsewhere — do not hand-edit

`src-tauri/icons/` (platform set), `public/favicon.ico`, `src/assets/brand-mark.png`. All three
derive from `icon/`.
