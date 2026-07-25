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
 * `languages.ts`, which only the lazily-loaded editor panes import. This table only
 * has to name a file, not parse it.
 */

const MARKDOWN_RE = /\.(md|markdown|mdown|mkd|mdx)$/i;

/**
 * Extension → label. Covers the formats this editor actually opens (FR-1.2/1.3) plus
 * what a technical writer has adjacent to their notes. Anything else is Plain Text,
 * which is both true and harmless — the label is informational.
 */
const LABELS: Record<string, string> = {
  // data / config
  json: "JSON",
  jsonc: "JSON",
  yaml: "YAML",
  yml: "YAML",
  toml: "TOML",
  xml: "XML",
  csv: "CSV",
  ini: "INI",
  env: "Plain Text",
  // web
  html: "HTML",
  htm: "HTML",
  css: "CSS",
  scss: "SCSS",
  less: "Less",
  js: "JavaScript",
  jsx: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  ts: "TypeScript",
  tsx: "TypeScript",
  vue: "Vue",
  svelte: "Svelte",
  // languages
  py: "Python",
  rs: "Rust",
  go: "Go",
  java: "Java",
  kt: "Kotlin",
  swift: "Swift",
  c: "C",
  h: "C",
  cpp: "C++",
  cc: "C++",
  hpp: "C++",
  cs: "C#",
  rb: "Ruby",
  php: "PHP",
  lua: "Lua",
  r: "R",
  sql: "SQL",
  // shell
  sh: "Shell",
  bash: "Shell",
  zsh: "Shell",
  ps1: "PowerShell",
  psm1: "PowerShell",
  bat: "Batch",
  cmd: "Batch",
  // docs
  txt: "Plain Text",
  rst: "reStructuredText",
  tex: "LaTeX",
  diff: "Diff",
  patch: "Diff",
};

/** A stable, human-readable language label for the status bar (no async load). */
export function languageIdForFilename(filename: string): string {
  if (MARKDOWN_RE.test(filename)) return "Markdown";
  // A dotfile like `.gitignore` has no extension to speak of, and `LICENSE` has none
  // at all; both are Plain Text rather than a language named after the whole filename.
  const dot = filename.lastIndexOf(".");
  if (dot <= 0) return "Plain Text";
  const ext = filename.slice(dot + 1).toLowerCase();
  return LABELS[ext] ?? "Plain Text";
}
