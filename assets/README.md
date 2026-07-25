# `assets/`

Build-ready application assets consumed by the build, as opposed to the artwork masters.

| File | Role |
|---|---|
| `icon-source.png` | 1024×1024 RGBA. **The input to `pnpm tauri icon`** — the vector master cropped to its opaque bounds. Regenerating the platform icon set from anything else reintroduces the dead-margin bug (see [docs/BUILD.md](../docs/BUILD.md) § Icons). |

Artwork **masters** live in `Icon/` at the repo root — `.ai` and `.svg` vector plus a 7-frame
full-bleed `.ico`. That directory is the single source of truth for branding; never generate a
substitute mark. Usage rules are in [BRAND_GUIDELINES.md](../BRAND_GUIDELINES.md).

Outputs *derived* from `icon-source.png`, not edited by hand: `src-tauri/icons/` (the platform set
referenced by `src-tauri/tauri.conf.json`), `public/favicon.ico`, `src/assets/brand-mark.png`.
