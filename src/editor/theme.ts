/**
 * CodeMirror editor theme: base chrome driven by the app's semantic tokens via
 * `var(--token)`, plus a HighlightStyle bound to the `--cm-*` variables that
 * `syntaxPalettes.ts` writes. A theme switch is therefore a pure variable swap, with
 * no CodeMirror reconfiguration.
 *
 * This module pulls in CodeMirror, so it must stay off the boot path. It is reached
 * only through `editorState.ts`, which only the lazily-loaded editor panes import.
 */
import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import type { Extension } from "@codemirror/state";
import { CM_VARS } from "./syntaxPalettes.ts";

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
    // Driven by the persisted font-size setting (App applies the variable).
    fontSize: "var(--editor-font-size, 14px)",
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
