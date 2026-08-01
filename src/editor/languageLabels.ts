import { GENERATED_LABELS } from "./languageLabels.generated.ts";

/**
 * Filename → human-readable language label, for the status bar.
 *
 * Deliberately free of CodeMirror. This used to call
 * `LanguageDescription.matchFilename(languages, …)`, which meant the documents store —
 * on the boot path of every launch — statically imported `@codemirror/language`,
 * `@codemirror/language-data` and `@codemirror/lang-markdown` just to turn "a.json"
 * into the string "JSON". That pulled ~550 kB of editor into the initial chunk of an
 * app whose first screen is a welcome page with no editor on it.
 *
 * Actual syntax highlighting still resolves through the real registry in
 * `languages.ts`, which only the lazily-loaded editor panes import. This module only
 * has to name a file, not parse it.
 *
 * The bulk of the table is now *generated* from `@codemirror/language-data`
 * (`scripts/gen-language-labels.mjs`) rather than hand-listed. The hand-maintained version
 * named 56 of the 223 highlightable extensions, so a `.dart` file highlighted perfectly and
 * then reported itself as "Plain Text". `OVERRIDES` below is the only hand-maintained part,
 * and it exists for exactly two reasons — see its comment.
 */

/**
 * Hand-maintained corrections layered over the generated table.
 *
 * Two kinds of entry, and no others:
 *
 * 1. **Absent from `language-data`** — formats with no CodeMirror grammar, which still need
 *    a truthful name. `.bat` and `.csv` have no CM6 mode anywhere; the rest are plain text
 *    or are matched by alias rather than extension upstream.
 * 2. **Named awkwardly upstream** — `.ini` resolves to the properties-file grammar, whose
 *    description is "Properties files"; a status bar reading that for an `.ini` is worse
 *    than useless. `.diff` is lowercased upstream.
 *
 * Anything that is *correct* in the generated table does not belong here, however tempting.
 * Cosmetic disagreements (LESS vs Less, JSX vs JavaScript for `.jsx`) are left to the
 * generated value: it names the grammar CodeMirror actually loads, which is the more useful
 * fact and the one that cannot drift.
 */
const OVERRIDES: Record<string, string> = {
  // No grammar upstream
  txt: "Plain Text",
  log: "Log",
  csv: "CSV",
  bat: "Batch",
  cmd: "Batch",
  env: "Env",
  jsonc: "JSON",
  rst: "reStructuredText",
  svelte: "Svelte",
  zsh: "Shell",
  gitignore: "Git Ignore",
  gitattributes: "Git Attributes",
  // Named awkwardly upstream
  ini: "INI",
  diff: "Diff",
  patch: "Diff",
};

const MARKDOWN_RE = /\.(md|markdown|mdown|mkd|mdx)$/i;

/**
 * Whether a filename is Markdown, and therefore whether the preview pipeline applies to it.
 *
 * Exported because the answer decides more than a label: `EditorArea` uses it to skip the
 * render for code files, and `ViewModeSwitch` uses it to disable Preview and Split. Running a
 * `.py` through remark turns `#` comments into headings and `*args` into emphasis, so this is
 * a correctness gate, not a preference.
 */
export function isMarkdownFilename(filename: string): boolean {
  return MARKDOWN_RE.test(filename);
}

/** A stable, human-readable language label for the status bar (no async load). */
export function languageIdForFilename(filename: string): string {
  if (isMarkdownFilename(filename)) return "Markdown";

  const dot = filename.lastIndexOf(".");
  // A dotfile like `.gitignore` has no extension in the usual sense, but Windows and this
  // table both key it on the whole trailing name, so `.gitignore` resolves rather than
  // falling through to "Plain Text". A name with no dot at all (`LICENSE`) still does.
  const ext =
    dot === 0
      ? filename.slice(1).toLowerCase()
      : dot > 0
        ? filename.slice(dot + 1).toLowerCase()
        : "";
  if (ext === "") return "Plain Text";

  return OVERRIDES[ext] ?? GENERATED_LABELS[ext] ?? "Plain Text";
}
