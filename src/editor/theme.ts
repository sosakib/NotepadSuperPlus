import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import type { Extension } from "@codemirror/state";
import type { ThemeId } from "../theme/themes.ts";

/**
 * Editor theming. Base chrome (background, text, selection, gutter) is driven by
 * the app's semantic tokens via `var(--token)`, so it follows theme changes with
 * no reconfiguration. Syntax colors are a separate palette exposed as `--cm-*`
 * CSS variables (set by `applyEditorSyntaxVars`); the HighlightStyle references
 * those vars, so a theme switch is a pure variable swap — no CodeMirror rebuild.
 * Palette colors are chosen for >= 4.5:1 contrast against each theme's editor bg
 * (docs/04 §3.3).
 */

const CM_VARS = [
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

const darkPalette: SyntaxPalette = {
  keyword: "#c07be0",
  string: "#8bc98b",
  number: "#d99a5b",
  comment: "#7c7c88",
  function: "#7fb0ff",
  variable: "#e6e6ea",
  type: "#59b3c9",
  property: "#9db8ff",
  heading: "#f0a35e",
  link: "#5b8cff",
  meta: "#a0a0ab",
  invalid: "#f6685e",
};

const lightPalette: SyntaxPalette = {
  keyword: "#9333ea",
  string: "#197d3f",
  number: "#b5820f",
  comment: "#8a8a95",
  function: "#1d4ed8",
  variable: "#1a1a1e",
  type: "#0e7490",
  property: "#2f4fb0",
  heading: "#b45309",
  link: "#2f6bff",
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
  "high-contrast": highContrastPalette,
};


/** Writes the active theme's syntax colors as `--cm-*` variables on the root. */
export function applyEditorSyntaxVars(themeId: ThemeId): void {
  const palette = PALETTES[themeId];
  const root = document.documentElement;
  for (const key of CM_VARS) {
    root.style.setProperty(`--cm-${key}`, palette[key]);
  }
}

const v = (name: (typeof CM_VARS)[number]): string => `var(--cm-${name})`;

const highlightStyle = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword], color: v("keyword") },
  { tag: [t.operator, t.operatorKeyword], color: v("keyword") },
  { tag: [t.string, t.special(t.string), t.regexp], color: v("string") },
  { tag: [t.number, t.bool, t.null, t.atom], color: v("number") },
  { tag: [t.lineComment, t.blockComment, t.docComment], color: v("comment"), fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: v("function") },
  { tag: [t.variableName, t.definition(t.variableName)], color: v("variable") },
  { tag: [t.typeName, t.className, t.namespace], color: v("type") },
  { tag: [t.propertyName, t.attributeName], color: v("property") },
  { tag: [t.tagName], color: v("keyword") },
  { tag: [t.meta, t.processingInstruction, t.punctuation], color: v("meta") },
  // Markdown-specific
  { tag: [t.heading], color: v("heading"), fontWeight: "700" },
  { tag: [t.strong], fontWeight: "700" },
  { tag: [t.emphasis], fontStyle: "italic" },
  { tag: [t.strikethrough], textDecoration: "line-through" },
  { tag: [t.link, t.url], color: v("link"), textDecoration: "underline" },
  { tag: [t.monospace], color: v("string") },
  { tag: [t.quote], color: v("comment"), fontStyle: "italic" },
  { tag: [t.invalid], color: v("invalid") },
]);

const baseTheme = EditorView.theme({
  "&": {
    height: "100%",
    color: "var(--fg-primary)",
    backgroundColor: "var(--bg-app)",
    fontSize: "14px",
  },
  ".cm-scroller": {
    fontFamily: "var(--font-mono)",
    lineHeight: "1.6",
    overflow: "auto",
  },
  ".cm-content": { caretColor: "var(--accent)" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--accent)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "var(--selection)",
  },
  ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--fg-primary) 5%, transparent)" },
  ".cm-gutters": {
    backgroundColor: "var(--bg-app)",
    color: "var(--fg-muted)",
    border: "none",
    fontVariantNumeric: "tabular-nums",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "color-mix(in srgb, var(--fg-primary) 5%, transparent)",
    color: "var(--fg-secondary)",
  },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 8px 0 12px" },
  "&.cm-focused": { outline: "none" },
});

/** The complete editor theme extension (base chrome + syntax highlighting). */
export function editorTheme(): Extension {
  return [baseTheme, syntaxHighlighting(highlightStyle)];
}
