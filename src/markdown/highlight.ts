/**
 * Syntax highlighting for fenced code blocks (FR-3.2).
 *
 * Runs inside the Markdown worker, so none of this is on the boot path and none of it
 * competes with typing.
 *
 * Three deliberate choices:
 *
 * 1. **The JavaScript regex engine, not Oniguruma.** The WASM engine is ~500 kB and
 *    would have to be fetched before the first code block could render. The JS engine
 *    handles the grammars bundled here.
 *
 * 2. **Grammars load per language, on first use.** A document with one `ts` fence pays
 *    for TypeScript and nothing else.
 *
 * 3. **Colours come out as classes, never inline styles.** Shiki emits
 *    `style="color:var(--shiki-token-keyword)"`, and allowing a `style` attribute
 *    through the sanitizer would open a CSS-injection surface in a pane that renders
 *    untrusted documents. `toClassNames` rewrites every style into a `tok-*` class
 *    before sanitization runs, so the schema keeps refusing `style` outright.
 *    The classes map onto the existing `--cm-*` palette, which `contrast.test.ts`
 *    already holds to 4.5:1 on every theme — so code blocks inherit that guarantee
 *    instead of introducing a second, unchecked palette.
 */
import type { Root as HastRoot, Element } from "hast";
import { visit } from "unist-util-visit";

const VAR_PREFIX = "--nsp-";

/**
 * Grammars bundled with the app. Deliberately a fixed list: Shiki ships ~200, and
 * `import(\`shiki/langs/${lang}.mjs\`)` on an attacker-controlled fence info string
 * would let a document probe the bundle. Everything not listed renders unhighlighted,
 * which is exactly what happened before this feature existed.
 */
const LANGS: Record<string, () => Promise<unknown>> = {
  bash: () => import("shiki/langs/bash.mjs"),
  c: () => import("shiki/langs/c.mjs"),
  cpp: () => import("shiki/langs/cpp.mjs"),
  csharp: () => import("shiki/langs/csharp.mjs"),
  css: () => import("shiki/langs/css.mjs"),
  diff: () => import("shiki/langs/diff.mjs"),
  go: () => import("shiki/langs/go.mjs"),
  html: () => import("shiki/langs/html.mjs"),
  java: () => import("shiki/langs/java.mjs"),
  javascript: () => import("shiki/langs/javascript.mjs"),
  json: () => import("shiki/langs/json.mjs"),
  kotlin: () => import("shiki/langs/kotlin.mjs"),
  lua: () => import("shiki/langs/lua.mjs"),
  markdown: () => import("shiki/langs/markdown.mjs"),
  php: () => import("shiki/langs/php.mjs"),
  powershell: () => import("shiki/langs/powershell.mjs"),
  python: () => import("shiki/langs/python.mjs"),
  ruby: () => import("shiki/langs/ruby.mjs"),
  rust: () => import("shiki/langs/rust.mjs"),
  sql: () => import("shiki/langs/sql.mjs"),
  swift: () => import("shiki/langs/swift.mjs"),
  toml: () => import("shiki/langs/toml.mjs"),
  tsx: () => import("shiki/langs/tsx.mjs"),
  typescript: () => import("shiki/langs/typescript.mjs"),
  xml: () => import("shiki/langs/xml.mjs"),
  yaml: () => import("shiki/langs/yaml.mjs"),
};

/** Fence info strings people actually write, mapped to a bundled grammar. */
const ALIASES: Record<string, string> = {
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  py: "python",
  rb: "ruby",
  rs: "rust",
  yml: "yaml",
  "c++": "cpp",
  cs: "csharp",
  ps1: "powershell",
  pwsh: "powershell",
  md: "markdown",
  htm: "html",
  patch: "diff",
};

/** Resolves a fence info string to a bundled grammar id, or null. */
export function resolveLang(info: string): string | null {
  const id =
    info
      .trim()
      .toLowerCase()
      .split(/[\s,{]/)[0] ?? "";
  const mapped = ALIASES[id] ?? id;
  return mapped in LANGS ? mapped : null;
}

interface Highlighter {
  codeToHast: (code: string, options: Record<string, unknown>) => HastRoot;
  getLoadedLanguages: () => string[];
  loadLanguage: (lang: unknown) => Promise<void>;
}

let highlighterPromise: Promise<Highlighter> | null = null;

async function getHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= (async () => {
    const { createHighlighterCore, createCssVariablesTheme } = await import("shiki/core");
    const { createJavaScriptRegexEngine } = await import("shiki/engine/javascript");
    return (await createHighlighterCore({
      themes: [
        createCssVariablesTheme({ name: "nsp", variablePrefix: VAR_PREFIX, fontStyle: true }),
      ],
      langs: [],
      engine: createJavaScriptRegexEngine(),
    })) as unknown as Highlighter;
  })();
  return highlighterPromise;
}

/**
 * Rewrites Shiki's inline colour styles into `tok-*` classes and removes the style
 * attribute, so the sanitizer never has to permit `style`.
 */
function toClassNames(tree: HastRoot): void {
  visit(tree, "element", (node: Element) => {
    const style = node.properties?.style;
    if (typeof style !== "string") return;
    delete node.properties.style;

    const match = /var\(\s*--nsp-(?:token-)?([a-z-]+)\s*\)/.exec(style);
    if (!match) return;
    const token = match[1];
    // `foreground` is plain body text; leaving it unclassed lets it inherit the
    // preview's own colour instead of pinning it to a palette entry.
    if (!token || token === "foreground" || token === "background") return;

    const existing = node.properties.className;
    const classes = Array.isArray(existing) ? existing.map(String) : [];
    node.properties.className = [...classes, `tok-${token}`];
  });
}

/**
 * Highlights a code string, returning hast. Returns null when the language is not
 * bundled or the grammar fails to load — the caller then leaves the block as-is
 * rather than losing the code.
 */
export async function highlightToHast(code: string, lang: string): Promise<HastRoot | null> {
  const resolved = resolveLang(lang);
  if (!resolved) return null;

  try {
    const hl = await getHighlighter();
    if (!hl.getLoadedLanguages().includes(resolved)) {
      const load = LANGS[resolved];
      if (!load) return null;
      await hl.loadLanguage(await load());
    }
    const tree = hl.codeToHast(code, { lang: resolved, theme: "nsp" });
    toClassNames(tree);
    return tree;
  } catch {
    // A grammar that fails to load must not take the whole render down; an
    // unhighlighted code block is still perfectly readable.
    return null;
  }
}
