import { LanguageDescription, type LanguageSupport } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { markdown } from "@codemirror/lang-markdown";
import type { Extension } from "@codemirror/state";

export { languageIdForFilename } from "./languageLabels.ts";

/**
 * Language resolution by filename. Markdown is the first-class citizen (rich
 * parsing + embedded fenced-code languages); the adjacent code/data formats
 * (FR-1.2/1.3) load on demand via @codemirror/language-data's dynamic imports,
 * which keeps each grammar out of the startup bundle (docs/09 §2).
 */

const MARKDOWN_RE = /\.(md|markdown|mdown|mkd)$/i;

/**
 * Synchronously resolves the language for filenames we can handle without a
 * dynamic import — currently Markdown, the primary format. Returns null for
 * everything else (resolve those with `languageForFilename`).
 */
export function syncLanguageForFilename(filename: string): Extension | null {
  if (MARKDOWN_RE.test(filename)) {
    return markdown({ codeLanguages: languages, addKeymap: true });
  }
  return null;
}

/** Resolves the CodeMirror language extension for a filename, or null for plain text. */
export async function languageForFilename(filename: string): Promise<Extension | null> {
  const sync = syncLanguageForFilename(filename);
  if (sync) return sync;
  const desc = LanguageDescription.matchFilename(languages, filename);
  if (!desc) return null;
  const support: LanguageSupport = await desc.load();
  return support;
}
