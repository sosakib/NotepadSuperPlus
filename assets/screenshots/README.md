# `assets/screenshots/`

Product screenshots used by the root [README](../../README.md).

| File | Surface | Theme |
|---|---|---|
| `split-view.png` | Split mode — source and preview, scroll-synced | Solarized Light |
| `editor.png` | Source editor, explorer, recent files | Solarized Light |
| `preview.png` | Rendered Markdown preview | Solarized Light |
| `themes.png` | Preferences → Appearance, theme picker | Apple Dark |
| `about.png` | Preferences → About | Apple Dark |

All captured at 1920×1152 on a 100 % scale display.

## Replacing or adding one

- Match the existing size so the README grid stays aligned.
- Open a real document with real prose — not lorem ipsum, not an empty buffer.
- No personal file paths in the title bar, explorer or recent-files list.
- Prefer PNG. These are already well compressed; do not re-encode as JPEG, the text will smear.

> Several of these show the app previewing its own README, where the shields.io badges render as
> broken-image icons. That is correct behaviour rather than a bug: the preview blocks remote
> resources under a strict CSP, which is the same reason the app makes no network calls at all.
> If you reshoot, a document without remote images will look cleaner.
