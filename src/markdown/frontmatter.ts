/**
 * YAML frontmatter extraction (FR-3.3).
 *
 * Without this, a `---` delimited block at the top of a document is parsed as
 * Markdown: the opening fence becomes a thematic break and the keys below it become
 * a setext heading or a stray table. Metadata leaks into the rendered body, which is
 * wrong output rather than a missing feature.
 *
 * No YAML dependency. Frontmatter in a Markdown editor is overwhelmingly flat
 * `key: value` pairs, and the panel only has to *display* the metadata — nothing
 * consumes it programmatically.
 *
 * ponytail: hand-rolled flat-YAML parser. Handles scalars, inline `[a, b]` arrays and
 * block `- item` lists; nested mappings are surfaced verbatim rather than parsed, so
 * nothing is silently lost. Swap in a real YAML parser if frontmatter ever drives
 * behaviour instead of just being shown.
 */

export interface FrontmatterEntry {
  key: string;
  /** Display value. Lists are joined; unparsed nested blocks are kept verbatim. */
  value: string;
  /** True when this is a nested block shown as raw text rather than parsed. */
  raw: boolean;
}

export interface Frontmatter {
  entries: FrontmatterEntry[];
  /** The original block, without the `---` fences. */
  source: string;
}

export interface SplitDocument {
  frontmatter: Frontmatter | null;
  /**
   * The document with the frontmatter block replaced by an equal number of blank
   * lines — **not** removed. Every heading line number, outline entry and
   * `data-source-line` stays aligned with the real file, so scroll sync and
   * click-to-line keep working. Deleting the lines instead would shift every
   * position in the document by the height of the block.
   */
  body: string;
}

/** Matches a frontmatter block only at the very start of the document. */
const FENCE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

function unquote(v: string): string {
  const t = v.trim();
  if (t.length >= 2 && ((t[0] === '"' && t.at(-1) === '"') || (t[0] === "'" && t.at(-1) === "'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function parseEntries(block: string): FrontmatterEntry[] {
  const entries: FrontmatterEntry[] = [];
  const lines = block.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue;
    // Only top-level keys start a new entry; indentation means it belongs to the
    // previous one.
    if (/^\s/.test(line)) continue;

    const sep = line.indexOf(":");
    if (sep <= 0) continue;
    const key = line.slice(0, sep).trim();
    const inline = line.slice(sep + 1).trim();

    if (inline !== "") {
      // Inline array: [a, b, c]
      if (inline.startsWith("[") && inline.endsWith("]")) {
        const items = inline
          .slice(1, -1)
          .split(",")
          .map(unquote)
          .filter((s) => s !== "");
        entries.push({ key, value: items.join(", "), raw: false });
      } else {
        entries.push({ key, value: unquote(inline), raw: false });
      }
      continue;
    }

    // Nothing after the colon: gather the indented block that follows.
    const child: string[] = [];
    while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1] ?? "")) {
      child.push(lines[++i] ?? "");
    }
    const items = child.map((l) => l.trim());
    if (items.length > 0 && items.every((l) => l.startsWith("- "))) {
      entries.push({ key, value: items.map((l) => unquote(l.slice(2))).join(", "), raw: false });
    } else if (items.length > 0) {
      // A nested mapping. Shown verbatim so the reader still sees everything.
      entries.push({ key, value: items.join("\n"), raw: true });
    } else {
      entries.push({ key, value: "", raw: false });
    }
  }

  return entries;
}

/**
 * Splits a document into its frontmatter and a body whose line numbering matches
 * the original file.
 */
export function splitFrontmatter(text: string): SplitDocument {
  const match = FENCE.exec(text);
  if (!match) return { frontmatter: null, body: text };

  const [whole, block = ""] = match;
  // An empty block (`---\n---`) is a delimiter with no metadata; treating it as
  // frontmatter would show an empty panel for what is really a thematic break.
  if (block.trim() === "") return { frontmatter: null, body: text };

  const blankLines = whole.split(/\r?\n/).length - 1;
  const body = "\n".repeat(blankLines) + text.slice(whole.length);

  return {
    frontmatter: { entries: parseEntries(block), source: block },
    body,
  };
}
