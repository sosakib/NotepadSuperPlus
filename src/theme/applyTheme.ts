import { THEMES, type ThemeId } from "./themes.ts";

/**
 * Applies a theme by writing its semantic tokens as CSS custom properties on the
 * document root and stamping `data-theme` / `color-scheme`. This is the single
 * place tokens reach the DOM; everything else reads `var(--token)`.
 */
export function applyTheme(id: ThemeId): void {
  const theme = THEMES[id];
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.tokens)) {
    root.style.setProperty(`--${key}`, value);
  }
  root.dataset.theme = id;
  // Exposed as an attribute as well as `color-scheme` so CSS can branch on it —
  // shadows need to lighten on light themes, and there is no CSS selector for
  // `color-scheme` itself.
  root.dataset.scheme = theme.scheme;
  root.style.colorScheme = theme.scheme;
}
