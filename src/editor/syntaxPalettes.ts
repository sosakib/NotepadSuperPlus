/**
 * Markdown syntax palettes, as plain data, plus the function that writes them to the
 * document root as `--cm-*` CSS variables.
 *
 * Split out of `theme.ts` because `App.tsx` needs `applyEditorSyntaxVars` on the boot
 * path, and importing it from `theme.ts` dragged `@codemirror/view`,
 * `@codemirror/language` and `@lezer/highlight` into the initial chunk. On a cold
 * start that shows only the welcome screen, that is the entire editor engine parsed
 * for nothing.
 *
 * **Nothing here may import CodeMirror.** Setting a CSS variable does not need an
 * editor. Palette colours are held to >= 4.5:1 against each theme's editor background
 * by `src/theme/contrast.test.ts` (docs/04 §3.3).
 */
import type { ThemeId } from "../theme/themes.ts";

export const CM_VARS = [
  "keyword",
  "string",
  "number",
  "comment",
  "function",
  "variable",
  "type",
  "property",
  "heading",
  "link",
  "meta",
  "invalid",
] as const;

type SyntaxPalette = Record<(typeof CM_VARS)[number], string>;

/*
 * Shared by every dark theme, so each colour is tuned against the *lightest* editor
 * background that consumes it — Nord's #2e3440. comment/link/invalid were previously
 * set for a near-black shell and measured 3.03/3.95/4.20:1 there. The cost is that
 * comments read slightly brighter on the darkest themes; the alternative was text
 * nobody can read on one of them.
 */
const darkPalette: SyntaxPalette = {
  keyword: "#c07be0",
  string: "#8bc98b",
  number: "#d99a5b",
  comment: "#9d9da6",
  function: "#7fb0ff",
  variable: "#e6e6ea",
  type: "#59b3c9",
  property: "#9db8ff",
  heading: "#f0a35e",
  link: "#6f9aff",
  meta: "#a0a0ab",
  invalid: "#f7766d",
};

/* number/comment/link measured 3.41/3.41/4.50:1 on white; darkened to clear 4.6. */
const lightPalette: SyntaxPalette = {
  keyword: "#9333ea",
  string: "#197d3f",
  number: "#986d0d",
  comment: "#74747e",
  function: "#1d4ed8",
  variable: "#1a1a1e",
  type: "#0e7490",
  property: "#2f4fb0",
  heading: "#b45309",
  link: "#2e69fb",
  meta: "#55555f",
  invalid: "#d93a30",
};

const highContrastPalette: SyntaxPalette = {
  keyword: "#e5a3ff",
  string: "#7dff9e",
  number: "#ffcf70",
  comment: "#bdbdbd",
  function: "#7db8ff",
  variable: "#ffffff",
  type: "#6fe0ef",
  property: "#a9c8ff",
  heading: "#ffd166",
  link: "#7db8ff",
  meta: "#e0e0e0",
  invalid: "#ff6a5e",
};

const PALETTES: Record<ThemeId, SyntaxPalette> = {
  dark: darkPalette,
  light: lightPalette,
  "apple-dark": darkPalette,
  "apple-light": lightPalette,
  "midnight-blue": {
    ...darkPalette,
    function: "#38bdf8",
    link: "#38bdf8",
  },
  github: {
    ...darkPalette,
    keyword: "#ff7b72",
    string: "#a5d6ff",
    function: "#d2a8ff",
  },
  nord: {
    ...darkPalette,
    keyword: "#81a1c1",
    string: "#a3be8c",
    function: "#88c0d0",
  },
  catppuccin: {
    ...darkPalette,
    keyword: "#cba6f7",
    string: "#a6e3a1",
    function: "#89b4fa",
  },
  /* Everforest's own accents, with grey1 lightened — it sat at 3.84:1 on bg0. */
  everforest: {
    keyword: "#e68082",
    string: "#a7c080",
    number: "#d699b6",
    comment: "#95a098",
    function: "#83c092",
    variable: "#d3c6aa",
    type: "#dbbc7f",
    property: "#7fbbb3",
    heading: "#e69875",
    link: "#7fbbb3",
    meta: "#9da9a0",
    invalid: "#e68082",
  },
  /*
   * Solarized's accent ring is tuned for its *dark* base; on the cream base3 most of
   * it fails badly — green 2.97:1, cyan 2.93:1, blue 3.41:1. Each is darkened to the
   * nearest value clearing 4.6:1 while keeping Solarized's hue.
   */
  "solarized-light": {
    keyword: "#6468b5",
    string: "#687700",
    number: "#c24815",
    comment: "#5f737b",
    function: "#2074b0",
    variable: "#073642",
    type: "#207c75",
    property: "#6468b5",
    heading: "#c24815",
    link: "#2074b0",
    meta: "#586e75",
    invalid: "#d3302d",
  },
  /*
   * Differentiated by lightness rather than hue, so the theme's premise survives into
   * the editor. `invalid` keeps its red on purpose: an error that only differs from
   * body text by 3 % lightness is an error nobody sees.
   */
  monochrome: {
    keyword: "#f2f2f2",
    string: "#b8b8b8",
    number: "#cfcfcf",
    comment: "#7e7e7e",
    function: "#e6e6e6",
    variable: "#d4d4d4",
    type: "#c2c2c2",
    property: "#adadad",
    heading: "#ffffff",
    link: "#dcdcdc",
    meta: "#9a9a9a",
    invalid: "#e0796f",
  },
  "high-contrast": highContrastPalette,
};

/** Exported for `theme.contrast.test.ts`, which asserts the >= 4.5:1 claim above. */
export const SYNTAX_PALETTES = PALETTES;

/** Writes the active theme's syntax colors as `--cm-*` variables on the root. */
export function applyEditorSyntaxVars(themeId: ThemeId): void {
  const palette = PALETTES[themeId];
  const root = document.documentElement;
  for (const key of CM_VARS) {
    root.style.setProperty(`--cm-${key}`, palette[key]);
  }
}
