# `design/`

Design source-of-truth assets referenced by [docs/04_UI_UX_Guidelines.md](../docs/04_UI_UX_Guidelines.md).

Planned contents:

```
design/
├── wireframes/   # shell, split view, command palette, settings, search, empty states
├── tokens/       # source design-token JSON (compiled to CSS vars in packages/themes)
└── icons/        # file-type glyphs
```

Tokens — not pixel mockups — are the contract. Populated as UI stages land
(Stages 2, 8, 9). Added during Stage 0 to keep the directory tracked.

> **App icon masters do not live here.** They live in `Icon/` at the repo root (`.ai`/`.svg`
> vector plus a full-bleed `.ico`), which is the single source of truth for the brand mark. See
> [BRAND_GUIDELINES.md](../BRAND_GUIDELINES.md) and [docs/BUILD.md](../docs/BUILD.md) § Icons.
