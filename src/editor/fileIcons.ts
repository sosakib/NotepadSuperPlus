import {
  FileText,
  FileCode,
  FileJson,
  FileCog,
  FileTerminal,
  Database,
  Braces,
  Globe,
  Palette,
  type LucideIcon,
} from "lucide-react";

/**
 * File icons, resolved from a document's language id.
 *
 * ## Why the key is the language id, not the extension
 *
 * `DocMeta.languageId` (state/documents.ts) is already computed for every document at open
 * and at save, and since the label table was generated from `@codemirror/language-data` it
 * covers all 223 highlightable extensions. Keying here off that id means:
 *
 * - 223 extensions collapse to ~120 icon slots, so few entries cover most files;
 * - aliases resolve for free — `.yml`/`.yaml` are one "YAML", `.cc`/`.cpp`/`.cxx` one "C++";
 * - the status-bar label and the icon can never disagree about what a file is.
 *
 * ## Adding real icon assets later
 *
 * `ICONS` is the only thing that has to change. Drop assets into `src/assets/icons/`, then
 * either point entries at components that render them, or widen `FileIconSpec` to
 * `LucideIcon | string` and branch once at the call site. Consumers ask for an icon by
 * language id and never learn which happened, so no consumer changes either way.
 *
 * Deliberately not built: an icon-theme registry with pluggable providers, per-extension
 * overrides, or user-selectable icon packs. There is one icon set and no requirement for a
 * second; a lookup table with a fallback is the whole feature until that changes.
 */

/** What a language id maps to. Widen this union when non-lucide assets arrive. */
export type FileIconSpec = LucideIcon;

/**
 * Language id → icon. Grouped by the *shape* of the file rather than one glyph per language:
 * lucide has no per-language marks, and inventing near-identical ones would read as noise at
 * 14px. Anything absent falls back by category (see `iconForLanguage`).
 */
const ICONS: Record<string, FileIconSpec> = {
  // Prose
  Markdown: FileText,
  "Plain Text": FileText,
  reStructuredText: FileText,
  LaTeX: FileText,
  Log: FileText,

  // Data and configuration
  JSON: FileJson,
  YAML: FileCog,
  TOML: FileCog,
  INI: FileCog,
  "Properties files": FileCog,
  Env: FileCog,
  XML: Braces,
  CSV: Database,
  SQL: Database,

  // Web and styles
  HTML: Globe,
  CSS: Palette,
  SCSS: Palette,
  Sass: Palette,
  LESS: Palette,

  // Shell
  Shell: FileTerminal,
  PowerShell: FileTerminal,
  Batch: FileTerminal,
  Dockerfile: FileTerminal,
};

/**
 * Language ids that are prose rather than code, so they keep the document glyph when absent
 * from `ICONS`. Everything else defaults to the code glyph — a `.dart` file with no entry
 * should still read as code rather than as a text document.
 */
const PROSE = new Set(["Markdown", "Plain Text", "reStructuredText", "LaTeX", "Diff", "Log"]);

/** The icon for a language id, falling back to a document or code glyph by category. */
export function iconForLanguage(languageId: string): FileIconSpec {
  return ICONS[languageId] ?? (PROSE.has(languageId) ? FileText : FileCode);
}
