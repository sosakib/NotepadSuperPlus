import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
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

export interface RenderResult {
  html: string;
  outline: OutlineHeading[];
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

// GitHub-flavored sanitize schema: the default plus task-list checkboxes, code
// language classes, heading ids, and our source-line data attribute.
const schema = {
  ...defaultSchema,
  // Keep heading ids clean so in-document anchor links and the outline agree.
  clobberPrefix: "",
  tagNames: [...(defaultSchema.tagNames ?? []), "input"],
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "className", "id", "dataSourceLine"],
    input: ["type", "checked", "disabled"],
    code: [...(defaultSchema.attributes?.code ?? []), "className"],
    span: [...(defaultSchema.attributes?.span ?? []), "className"],
  },
};

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkOutline)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSourceLines)
  .use(rehypeSanitize, schema)
  .use(rehypeStringify);

/** Renders Markdown source to sanitized HTML plus a heading outline. */
export async function renderMarkdown(text: string): Promise<RenderResult> {
  const file = await processor.process(text);
  const outline = (file.data as { outline?: OutlineHeading[] }).outline ?? [];
  return { html: String(file), outline };
}
