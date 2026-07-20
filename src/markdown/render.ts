import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema, type Options as SanitizeSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import { toString } from "mdast-util-to-string";
import type { Root as MdastRoot } from "mdast";
import type { Root as HastRoot } from "hast";

/**
 * The Markdown rendering pipeline (pure — no DOM, no worker), so it can be unit-
 * and conformance-tested directly (docs/10 §1). The worker (md.worker.ts) is a
 * thin wrapper. Output HTML is sanitized here (docs/08 §4), so the preview may
 * inject it directly.
 *
 * Kept in `src/markdown` rather than a separate package: there is still only one
 * consumer, so the pnpm-workspace split (docs/03 §4) stays deferred (revisited at
 * this stage — see ROADMAP.md).
 */

export interface OutlineHeading {
  depth: number;
  text: string;
  line: number;
  id: string;
}

/** Document statistics, computed in the worker so the UI thread never scans the text. */
export interface DocStats {
  words: number;
  chars: number;
}

export interface RenderResult {
  html: string;
  outline: OutlineHeading[];
  stats: DocStats;
}

function computeStats(text: string): DocStats {
  const trimmed = text.trim();
  return {
    words: trimmed === "" ? 0 : trimmed.split(/\s+/).length,
    chars: text.length,
  };
}

function slugify(text: string, seen: Map<string, number>): string {
  const base =
    text
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/g, "-") || "section";
  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
}

/** remark plugin: collect a heading outline and assign stable heading ids. */
function remarkOutline() {
  return (tree: MdastRoot, file: { data: Record<string, unknown> }): void => {
    const outline: OutlineHeading[] = [];
    const seen = new Map<string, number>();
    visit(tree, "heading", (node) => {
      const text = toString(node);
      const id = slugify(text, seen);
      node.data = node.data ?? {};
      node.data.hProperties = { ...(node.data.hProperties ?? {}), id };
      outline.push({ depth: node.depth, text, line: node.position?.start.line ?? 1, id });
    });
    (file.data as { outline?: OutlineHeading[] }).outline = outline;
  };
}

/** rehype plugin: stamp each top-level block with its source line for scroll sync. */
function rehypeSourceLines() {
  return (tree: HastRoot): void => {
    for (const node of tree.children) {
      if (node.type === "element" && node.position) {
        node.properties = node.properties ?? {};
        node.properties["dataSourceLine"] = node.position.start.line;
      }
    }
  };
}

/**
 * All rendered ids are prefixed (DOM-clobbering defense — a document must not be
 * able to shadow `document.getElementById` lookups the app relies on). Internal
 * `#anchor` links are rewritten to the prefixed form so they keep working.
 */
const CLOBBER_PREFIX = "user-content-";

/** rehype plugin: point in-document anchor links at the prefixed heading ids. */
function rehypeInternalAnchors() {
  return (tree: HastRoot): void => {
    visit(tree, "element", (node) => {
      if (node.tagName !== "a") return;
      const href = node.properties?.href;
      if (typeof href === "string" && href.startsWith("#") && href.length > 1) {
        node.properties.href = `#${CLOBBER_PREFIX}${href.slice(1)}`;
      }
    });
  };
}

// GitHub-flavored sanitize schema: the default plus task-list checkboxes, code
// language classes, heading ids, and our source-line data attribute. Inputs are
// restricted to disabled checkboxes; class names are allowed only where the
// renderer emits them (code fences, task lists), never on arbitrary elements.
const schema: SanitizeSchema = {
  ...defaultSchema,
  clobberPrefix: CLOBBER_PREFIX,
  tagNames: [...(defaultSchema.tagNames ?? []), "input"],
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "id", "dataSourceLine"],
    input: [["type", "checkbox"], "checked", ["disabled", true]],
    code: [...(defaultSchema.attributes?.code ?? []), "className"],
    span: [...(defaultSchema.attributes?.span ?? []), "className"],
    ul: [...(defaultSchema.attributes?.ul ?? []), "className"],
    ol: [...(defaultSchema.attributes?.ol ?? []), "className"],
    li: [...(defaultSchema.attributes?.li ?? []), "className"],
    pre: [...(defaultSchema.attributes?.pre ?? []), "className"],
  },
};

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkOutline)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSourceLines)
  .use(rehypeInternalAnchors)
  .use(rehypeSanitize, schema)
  .use(rehypeStringify);

/** Renders Markdown source to sanitized HTML plus a heading outline. */
export async function renderMarkdown(text: string): Promise<RenderResult> {
  const file = await processor.process(text);
  const outline = (file.data as { outline?: OutlineHeading[] }).outline ?? [];
  return { html: String(file), outline, stats: computeStats(text) };
}
