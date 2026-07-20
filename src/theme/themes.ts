/**
 * Theme engine — semantic token layer (docs/04_UI_UX_Guidelines.md §3.3).
 *
 * Themes override the *semantic* tokens only. Components must consume tokens,
 * never literal colors (enforced by review — docs/13 §6). The token set here is
 * intentionally small; the bundled theme pack (Nord/Dracula/…) arrives in Stage 9.
 */

export type ThemeId =
  | "dark"
  | "light"
  | "apple-dark"
  | "apple-light"
  | "midnight-blue"
  | "github"
  | "nord"
  | "catppuccin"
  | "high-contrast";

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
  /** One-line description, shown on the theme picker card. */
  description: string;
  /** Whether the OS chrome (scrollbars, form controls) should render dark. */
  scheme: "dark" | "light";
  tokens: ThemeTokens;
}

const appleDark: Theme = {
  id: "apple-dark",
  name: "Apple Dark",
  description: "Refined navy and slate dark mode",
  scheme: "dark",
  tokens: {
    "bg-app": "#0f172a",
    "bg-surface": "#1e293b",
    "bg-raised": "#334155",
    "bg-hover": "#3b4f6b",
    "bg-active": "#475569",
    "fg-primary": "#f8fafc",
    "fg-secondary": "#cbd5e1",
    "fg-muted": "#64748b",
    "border-subtle": "#1e293b",
    "border-strong": "#334155",
    accent: "#3b82f6",
    "accent-fg": "#ffffff",
    danger: "#ef4444",
    warning: "#f59e0b",
    success: "#10b981",
    selection: "#1d4ed8",
  },
};

const appleLight: Theme = {
  id: "apple-light",
  name: "Apple Light",
  description: "Clean, crisp light aesthetic",
  scheme: "light",
  tokens: {
    "bg-app": "#ffffff",
    "bg-surface": "#f8fafc",
    "bg-raised": "#ffffff",
    "bg-hover": "#f1f5f9",
    "bg-active": "#e2e8f0",
    "fg-primary": "#0f172a",
    "fg-secondary": "#475569",
    "fg-muted": "#94a3b8",
    "border-subtle": "#e2e8f0",
    "border-strong": "#cbd5e1",
    accent: "#2563eb",
    "accent-fg": "#ffffff",
    danger: "#dc2626",
    warning: "#d97706",
    success: "#16a34a",
    selection: "#bfdbfe",
  },
};

const midnightBlue: Theme = {
  id: "midnight-blue",
  name: "Midnight Blue",
  description: "Deep blue developer theme",
  scheme: "dark",
  tokens: {
    "bg-app": "#0a0f1d",
    "bg-surface": "#131c31",
    "bg-raised": "#1e2942",
    "bg-hover": "#283756",
    "bg-active": "#32446a",
    "fg-primary": "#e2e8f0",
    "fg-secondary": "#94a3b8",
    "fg-muted": "#64748b",
    "border-subtle": "#1e293b",
    "border-strong": "#334155",
    accent: "#38bdf8",
    "accent-fg": "#0f172a",
    danger: "#f87171",
    warning: "#fbbf24",
    success: "#34d399",
    selection: "#0369a1",
  },
};

const github: Theme = {
  id: "github",
  name: "GitHub Inspired",
  description: "Professional documentation palette",
  scheme: "dark",
  tokens: {
    "bg-app": "#0d1117",
    "bg-surface": "#161b22",
    "bg-raised": "#21262d",
    "bg-hover": "#30363d",
    "bg-active": "#3d444d",
    "fg-primary": "#f0f6fc",
    "fg-secondary": "#8b949e",
    "fg-muted": "#6e7681",
    "border-subtle": "#21262d",
    "border-strong": "#30363d",
    accent: "#2f81f7",
    "accent-fg": "#ffffff",
    danger: "#f85149",
    warning: "#d29922",
    success: "#3fb950",
    selection: "#1f6beb",
  },
};

const nord: Theme = {
  id: "nord",
  name: "Nord Inspired",
  description: "Cool arctic dark mode",
  scheme: "dark",
  tokens: {
    "bg-app": "#2e3440",
    "bg-surface": "#3b4252",
    "bg-raised": "#434c5e",
    "bg-hover": "#4c566a",
    "bg-active": "#5e81ac",
    "fg-primary": "#eceff4",
    "fg-secondary": "#e5e9f0",
    "fg-muted": "#d8dee9",
    "border-subtle": "#3b4252",
    "border-strong": "#4c566a",
    accent: "#88c0d0",
    "accent-fg": "#2e3440",
    danger: "#bf616a",
    warning: "#ebcb8b",
    success: "#a3be8c",
    selection: "#434c5e",
  },
};

const catppuccin: Theme = {
  id: "catppuccin",
  name: "Catppuccin Inspired",
  description: "Soft pastel aesthetic",
  scheme: "dark",
  tokens: {
    "bg-app": "#1e1e2e",
    "bg-surface": "#181825",
    "bg-raised": "#313244",
    "bg-hover": "#45475a",
    "bg-active": "#585b70",
    "fg-primary": "#cdd6f4",
    "fg-secondary": "#a6adc8",
    "fg-muted": "#7f849c",
    "border-subtle": "#313244",
    "border-strong": "#45475a",
    accent: "#89b4fa",
    "accent-fg": "#1e1e2e",
    danger: "#f38ba8",
    warning: "#f9e2af",
    success: "#a6e3a1",
    selection: "#45475a",
  },
};

const highContrast: Theme = {
  id: "high-contrast",
  name: "High Contrast",
  description: "Accessibility-first maximum contrast",
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

const darkAlias: Theme = { ...appleDark, id: "dark", name: "Dark" };
const lightAlias: Theme = { ...appleLight, id: "light", name: "Light" };

export const THEMES: Record<ThemeId, Theme> = {
  dark: darkAlias,
  light: lightAlias,
  "apple-dark": appleDark,
  "apple-light": appleLight,
  "midnight-blue": midnightBlue,
  github,
  nord,
  catppuccin,
  "high-contrast": highContrast,
};

/**
 * Themes offered in the picker, in display order. `dark`/`light` are excluded:
 * they are aliases of the Apple pair kept for the `system` setting to resolve to,
 * and listing them would show the same theme twice.
 */
export const SELECTABLE_THEMES: readonly Theme[] = [
  appleDark,
  appleLight,
  midnightBlue,
  github,
  nord,
  catppuccin,
  highContrast,
];

/** Resolves a possibly-"system" setting to a concrete theme id using the OS preference. */
export function resolveTheme(setting: ThemeSetting): ThemeId {
  if (setting !== "system") return setting;
  const prefersLight =
    typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: light)").matches;
  return prefersLight ? "light" : "dark";
}
