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
  root.style.colorScheme = theme.scheme;
}
