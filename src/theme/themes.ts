/**
 * Theme engine — semantic token layer (docs/04_UI_UX_Guidelines.md §3.3).
 *
 * Themes override the *semantic* tokens only. Components must consume tokens,
 * never literal colors (enforced by review — docs/13 §6).
 *
 * Every palette here is held to the WCAG floors asserted in `contrast.test.ts`:
 * 4.5:1 for text on each surface it can land on, 3:1 for accent and status colors,
 * and a minimum separation between the primary/secondary/muted text ramp so the
 * three tiers stay distinguishable. Palettes borrowed from established schemes are
 * adjusted where the original fails those floors — the notes on each theme record
 * what moved and why, so nobody "restores" a value back into a failure.
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
  | "everforest"
  | "solarized-light"
  | "monochrome"
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

/**
 * Two values moved off the Tailwind slate/blue ramp for contrast:
 * `fg-muted` slate-500 → #8390a2 (3.07:1 on bg-surface, unreadable) and
 * `accent` blue-500 → #3473da (white label on the button was 3.68:1).
 */
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
    "fg-muted": "#8390a2",
    "border-subtle": "#1e293b",
    "border-strong": "#334155",
    accent: "#3473da",
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
    // slate-400 was 2.45:1 on bg-surface — the worst offender in the whole pack.
    "fg-muted": "#697483",
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
    "fg-muted": "#778599", // was slate-500, 3.56:1 on bg-surface
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
    "fg-muted": "#7c838d", // was GitHub's fgColor-muted, 3.77:1 on bg-surface
    "border-subtle": "#21262d",
    "border-strong": "#30363d",
    accent: "#2a74de", // GitHub's accent blue darkened: white label was 3.75:1
    "accent-fg": "#ffffff",
    danger: "#f85149",
    warning: "#d29922",
    success: "#3fb950",
    selection: "#1e68e3", // darkened from GitHub's #1f6beb: primary text was 4.42:1
  },
};

/**
 * Nord's three Snow Storm tints (#d8dee9/#e5e9f0/#eceff4) are near-identical by
 * design, which collapsed the text ramp: primary/secondary/muted measured
 * 10.84/10.26/9.25:1, so emphasis was invisible. Secondary and muted are pulled
 * down toward Polar Night to restore a real hierarchy (10.84/7.44/5.67), and
 * `bg-active` — Nord's signature #5e81ac — is darkened because primary text on it
 * was only 3.50:1.
 */
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
    "bg-active": "#506e93",
    "fg-primary": "#eceff4",
    "fg-secondary": "#c3c8d1",
    "fg-muted": "#a9afba",
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
    "fg-muted": "#81869d", // Catppuccin overlay1 nudged: was 4.44:1 on bg-app
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

/**
 * Added because every other dark theme in the pack is *cool* — navy, slate, arctic,
 * pastel lavender. Everforest is the only warm option: green-grey surfaces and a
 * sage accent, for readers who find blue-cast screens fatiguing at night.
 */
const everforest: Theme = {
  id: "everforest",
  name: "Everforest",
  description: "Warm forest greens, easy at night",
  scheme: "dark",
  tokens: {
    "bg-app": "#2d353b",
    "bg-surface": "#343f44",
    "bg-raised": "#3d484d",
    "bg-hover": "#475258",
    "bg-active": "#4a5358",
    "fg-primary": "#d3c6aa",
    "fg-secondary": "#b3bcae",
    "fg-muted": "#a4ad9f",
    "border-subtle": "#343f44",
    "border-strong": "#475258",
    accent: "#a7c080",
    "accent-fg": "#2d353b",
    danger: "#e67e80",
    warning: "#dbbc7f",
    success: "#83c092",
    selection: "#46554c",
  },
};

/**
 * Added because Apple Light was the pack's only light theme, and a cool white page
 * is the wrong surface for long reading in a bright room. Solarized's cream base is
 * a genuinely different light identity, not a second version of the same one. The
 * accent is darkened from Solarized's #268bd2, which cannot carry white label text.
 */
const solarizedLight: Theme = {
  id: "solarized-light",
  name: "Solarized Light",
  description: "Warm paper tones for bright rooms",
  scheme: "light",
  tokens: {
    "bg-app": "#fdf6e3",
    "bg-surface": "#f4ecd8",
    "bg-raised": "#fffdf5",
    "bg-hover": "#eee8d5",
    "bg-active": "#e3dcc6",
    "fg-primary": "#073642",
    "fg-secondary": "#4a5f66",
    "fg-muted": "#5a6c72",
    "border-subtle": "#e3dcc6",
    "border-strong": "#c8c0a8",
    accent: "#1f6f9f",
    "accent-fg": "#ffffff",
    danger: "#b62422",
    warning: "#8a6800",
    success: "#5c6d00",
    selection: "#d7e7f0",
  },
};

/**
 * Added because every other theme is chromatic, and an accent that draws the eye is
 * the wrong default for people who just want the prose to be the only coloured thing
 * on screen. Chrome is zero-chroma; `danger`/`warning`/`success` deliberately are
 * *not*, because a destructive confirmation must still read as destructive — losing
 * that would be a usability regression dressed up as consistency.
 */
const monochrome: Theme = {
  id: "monochrome",
  name: "Minimal Monochrome",
  description: "Zero-chroma chrome, prose is the only colour",
  scheme: "dark",
  tokens: {
    "bg-app": "#121212",
    "bg-surface": "#1a1a1a",
    "bg-raised": "#232323",
    "bg-hover": "#2c2c2c",
    "bg-active": "#383838",
    "fg-primary": "#f2f2f2",
    "fg-secondary": "#c0c0c0",
    "fg-muted": "#8e8e8e",
    "border-subtle": "#232323",
    "border-strong": "#3a3a3a",
    accent: "#d4d4d4",
    "accent-fg": "#121212",
    danger: "#e0796f",
    warning: "#d3ac63",
    success: "#7fb98a",
    selection: "#3a3a3a",
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
  everforest,
  "solarized-light": solarizedLight,
  monochrome,
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
  everforest,
  solarizedLight,
  monochrome,
  highContrast,
];

/** Resolves a possibly-"system" setting to a concrete theme id using the OS preference. */
export function resolveTheme(setting: ThemeSetting): ThemeId {
  if (setting !== "system") return setting;
  const prefersLight =
    typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: light)").matches;
  return prefersLight ? "light" : "dark";
}
