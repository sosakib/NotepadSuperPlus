/**
 * Theme engine — semantic token layer (docs/04_UI_UX_Guidelines.md §3.3).
 *
 * Themes override the *semantic* tokens only. Components must consume tokens,
 * never literal colors (enforced by review — docs/13 §6). The token set here is
 * intentionally small; the bundled theme pack (Nord/Dracula/…) arrives in Stage 9.
 */

export type ThemeId = "dark" | "light" | "high-contrast";
export type ThemeSetting = ThemeId | "system";

/** Every semantic token a theme must define. Keys map 1:1 to `--<key>` CSS vars. */
export interface ThemeTokens {
  "bg-app": string;
  "bg-surface": string;
  "bg-raised": string;
  "bg-hover": string;
  "bg-active": string;
  "fg-primary": string;
  "fg-secondary": string;
  "fg-muted": string;
  "border-subtle": string;
  "border-strong": string;
  accent: string;
  "accent-fg": string;
  danger: string;
  warning: string;
  success: string;
  selection: string;
}

export interface Theme {
  id: ThemeId;
  name: string;
  /** Whether the OS chrome (scrollbars, form controls) should render dark. */
  scheme: "dark" | "light";
  tokens: ThemeTokens;
}

const dark: Theme = {
  id: "dark",
  name: "Dark",
  scheme: "dark",
  tokens: {
    "bg-app": "#1e1e22",
    "bg-surface": "#25252b",
    "bg-raised": "#2d2d34",
    "bg-hover": "#33333b",
    "bg-active": "#3c3c46",
    "fg-primary": "#e6e6ea",
    "fg-secondary": "#a0a0ab",
    "fg-muted": "#6d6d78",
    "border-subtle": "#33333b",
    "border-strong": "#45454f",
    accent: "#5b8cff",
    "accent-fg": "#ffffff",
    danger: "#f6685e",
    warning: "#e2b340",
    success: "#4fb477",
    selection: "#2f4a86",
  },
};

const light: Theme = {
  id: "light",
  name: "Light",
  scheme: "light",
  tokens: {
    "bg-app": "#ffffff",
    "bg-surface": "#f6f6f8",
    "bg-raised": "#ffffff",
    "bg-hover": "#eeeef2",
    "bg-active": "#e2e2e8",
    "fg-primary": "#1a1a1e",
    "fg-secondary": "#55555f",
    "fg-muted": "#8a8a95",
    "border-subtle": "#e4e4ea",
    "border-strong": "#cfcfd7",
    accent: "#2f6bff",
    "accent-fg": "#ffffff",
    danger: "#d93a30",
    warning: "#b5820f",
    success: "#1f9254",
    selection: "#bcd2ff",
  },
};

const highContrast: Theme = {
  id: "high-contrast",
  name: "High Contrast",
  scheme: "dark",
  tokens: {
    "bg-app": "#000000",
    "bg-surface": "#0a0a0a",
    "bg-raised": "#111111",
    "bg-hover": "#1f1f1f",
    "bg-active": "#2b2b2b",
    "fg-primary": "#ffffff",
    "fg-secondary": "#e0e0e0",
    "fg-muted": "#bdbdbd",
    "border-subtle": "#6a6a6a",
    "border-strong": "#ffffff",
    accent: "#4cc2ff",
    "accent-fg": "#000000",
    danger: "#ff6a5e",
    warning: "#ffd166",
    success: "#6ee7a0",
    selection: "#2777c4",
  },
};

export const THEMES: Record<ThemeId, Theme> = {
  dark,
  light,
  "high-contrast": highContrast,
};

/** Resolves a possibly-"system" setting to a concrete theme id using the OS preference. */
export function resolveTheme(setting: ThemeSetting): ThemeId {
  if (setting !== "system") return setting;
  const prefersLight =
    typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: light)").matches;
  return prefersLight ? "light" : "dark";
}
