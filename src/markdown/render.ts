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
import type { Root as HastRoot, Element } from "hast";
import { splitFrontmatter, type Frontmatter } from "./frontmatter.ts";
import { highlightToHast } from "./highlight.ts";

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
  /** Parsed YAML frontmatter, or null when the document has none (FR-3.3). */
  frontmatter: Frontmatter | null;
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
 * rehype plugin: replace fenced code blocks with Shiki-highlighted markup (FR-3.2).
 *
 * Runs *before* sanitization, so the highlighted output is subject to exactly the same
 * schema as everything else — highlighting buys no trust. Shiki's inline colour styles
 * are already rewritten to `tok-*` classes by `highlightToHast`, so `style` stays
 * forbidden.
 *
 * Blocks with no language, or a language we do not bundle, are left untouched.
 */
function rehypeHighlight() {
  return async (tree: HastRoot): Promise<void> => {
    // Collected first, then awaited: `visit` is synchronous, so the work cannot be
    // done inline, and gathering lets independent blocks highlight concurrently.
    const jobs: { parent: Element; code: string; lang: string }[] = [];

    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "pre") return;
      const [child] = node.children.filter((c) => c.type === "element") as Element[];
      if (!child || child.tagName !== "code") return;

      const classes = child.properties?.className;
      const list = Array.isArray(classes) ? classes.map(String) : [];
      const langClass = list.find((c) => c.startsWith("language-"));
      if (!langClass) return;

      const text = child.children
        .filter((c): c is { type: "text"; value: string } => c.type === "text")
        .map((c) => c.value)
        .join("");
      if (text.trim() === "") return;

      jobs.push({ parent: node, code: text, lang: langClass.slice("language-".length) });
    });

    if (jobs.length === 0) return;

    const results = await Promise.all(
      jobs.map((j) => highlightToHast(j.code, j.lang).catch(() => null)),
    );

    jobs.forEach((job, i) => {
      const out = results[i];
      if (!out) return;
      const pre = out.children.find(
        (c): c is Element => c.type === "element" && c.tagName === "pre",
      );
      if (!pre) return;
      // Swap the children in rather than replacing the node, so the source-line data
      // attribute stamped on the original <pre> survives for scroll sync.
      job.parent.children = pre.children;
      const existing = job.parent.properties?.className;
      const keep = Array.isArray(existing) ? existing.map(String) : [];
      job.parent.properties = { ...job.parent.properties, className: [...keep, "shiki"] };
    });
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
  .use(rehypeHighlight)
  .use(rehypeInternalAnchors)
  .use(rehypeSanitize, schema)
  .use(rehypeStringify);

/** Renders Markdown source to sanitized HTML plus a heading outline. */
export async function renderMarkdown(text: string): Promise<RenderResult> {
  // Frontmatter is lifted out before parsing, or its fences render as a thematic
  // break and its keys as a stray heading. `body` keeps the original line numbering
  // (see splitFrontmatter), so the outline and scroll sync stay aligned.
  const { frontmatter, body } = splitFrontmatter(text);
  const file = await processor.process(body);
  const outline = (file.data as { outline?: OutlineHeading[] }).outline ?? [];
  // Stats describe the prose the reader sees, so metadata is excluded.
  return { html: String(file), outline, stats: computeStats(body), frontmatter };
}
