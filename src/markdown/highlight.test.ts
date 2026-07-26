import { describe, expect, it } from "vitest";
import { resolveLang, highlightToHast } from "./highlight.ts";
import { renderMarkdown } from "./render.ts";

describe("resolveLang", () => {
  it("accepts bundled grammars", () => {
    expect(resolveLang("typescript")).toBe("typescript");
    expect(resolveLang("rust")).toBe("rust");
  });

  it("maps the aliases people actually write", () => {
    expect(resolveLang("ts")).toBe("typescript");
    expect(resolveLang("sh")).toBe("bash");
    expect(resolveLang("yml")).toBe("yaml");
    expect(resolveLang("ps1")).toBe("powershell");
  });

  it("is case- and whitespace-insensitive", () => {
    expect(resolveLang("  TypeScript ")).toBe("typescript");
  });

  it("takes only the language token from a fence info string", () => {
    expect(resolveLang("js title=example.js")).toBe("javascript");
    expect(resolveLang("ts{1,3}")).toBe("typescript");
  });

  it("rejects anything not bundled, rather than attempting a dynamic import", () => {
    // The grammar list is fixed on purpose: importing an arbitrary fence string would
    // let a document probe the bundle.
    expect(resolveLang("brainfuck")).toBeNull();
    expect(resolveLang("../../etc/passwd")).toBeNull();
    expect(resolveLang("")).toBeNull();
  });
});

describe("highlightToHast", () => {
  it("returns null for an unbundled language instead of throwing", async () => {
    expect(await highlightToHast("x", "cobol")).toBeNull();
  });

  it("emits tok-* classes and never an inline style", async () => {
    const tree = await highlightToHast("const x = 1;", "ts");
    expect(tree).not.toBeNull();
    const json = JSON.stringify(tree);
    expect(json).toContain("tok-keyword");
    // The sanitizer forbids `style`; highlighting must not need it.
    expect(json).not.toContain('"style"');
  });
});

describe("rendered code blocks", () => {
  it("highlights a fenced block with a known language", async () => {
    const { html } = await renderMarkdown("```ts\nconst x = 1;\n```\n");
    expect(html).toContain("tok-keyword");
    expect(html).toContain("shiki");
  });

  it("carries no style attribute into the sanitized output", async () => {
    const { html } = await renderMarkdown("```js\nlet a = 2;\n```\n");
    expect(html).not.toContain("style=");
  });

  it("leaves an unknown language as a plain code block", async () => {
    const { html } = await renderMarkdown("```nosuchlang\nhello\n```\n");
    expect(html).toContain("hello");
    expect(html).not.toContain("tok-");
  });

  it("leaves a fence with no language alone", async () => {
    const { html } = await renderMarkdown("```\nplain text\n```\n");
    expect(html).toContain("plain text");
    expect(html).not.toContain("tok-");
  });

  it("keeps the source-line attribute for scroll sync", async () => {
    const { html } = await renderMarkdown("# H\n\n```ts\nconst x = 1;\n```\n");
    // The <pre> is the third top-level block, starting on line 3.
    expect(html).toMatch(/<pre[^>]*data-source-line="3"/);
  });

  it("does not let a code block smuggle live markup through highlighting", async () => {
    const { html } = await renderMarkdown('```html\n<img src=x onerror="alert(1)">\n```\n');
    // "onerror" *does* appear — as displayed text, which is the whole point of a code
    // block. What must not appear is a live element or a real event attribute.
    expect(html).not.toMatch(/<img/i);
    expect(html).not.toMatch(/\sonerror=/i);
    expect(html).toContain("&#x3C;"); // the angle bracket is escaped
  });

  it("wraps each source line in a direct child span so lines can be blocked out", async () => {
    const { html } = await renderMarkdown("```ts\nconst a = 1;\nconst b = 2;\n```\n");
    const code = /<code>([\s\S]*?)<\/code>/.exec(html)?.[1] ?? "";
    // Two lines -> two top-level spans. The CSS blocks these out; if Shiki ever stops
    // emitting them the lines would render run-together.
    const topLevel = code.match(/^<span/gm) ?? [];
    expect(topLevel.length).toBeGreaterThanOrEqual(2);
  });
});
