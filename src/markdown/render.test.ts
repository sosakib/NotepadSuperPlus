import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./render.ts";

describe("renderMarkdown — GFM", () => {
  it("renders headings with ids and source-line attributes", async () => {
    const { html } = await renderMarkdown("# Hello World");
    expect(html).toContain("<h1");
    expect(html).toContain('id="hello-world"');
    expect(html).toContain('data-source-line="1"');
    expect(html).toContain("Hello World");
  });

  it("renders emphasis, strong, and inline code", async () => {
    const { html } = await renderMarkdown("**b** _i_ `c`");
    expect(html).toContain("<strong>b</strong>");
    expect(html).toContain("<em>i</em>");
    expect(html).toContain("<code>c</code>");
  });

  it("renders GFM tables", async () => {
    const { html } = await renderMarkdown("| a | b |\n| - | - |\n| 1 | 2 |");
    expect(html).toContain("<table");
    expect(html).toContain("<th>a</th>");
    expect(html).toContain("<td>1</td>");
  });

  it("renders task lists as checkboxes", async () => {
    const { html } = await renderMarkdown("- [x] done\n- [ ] todo");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("checked");
  });

  it("renders strikethrough", async () => {
    const { html } = await renderMarkdown("~~gone~~");
    expect(html).toContain("<del>gone</del>");
  });
});

describe("renderMarkdown — sanitization (docs/08 §4)", () => {
  it("strips script tags", async () => {
    const { html } = await renderMarkdown("hi\n\n<script>alert(1)</script>");
    expect(html).not.toContain("<script");
  });

  it("strips javascript: URLs", async () => {
    const { html } = await renderMarkdown("[x](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
  });

  it("strips event-handler attributes on raw HTML", async () => {
    const { html } = await renderMarkdown('<img src="x" onerror="alert(1)">');
    expect(html).not.toContain("onerror");
  });
});

describe("renderMarkdown — outline", () => {
  it("extracts a heading tree with depths, lines, and ids", async () => {
    const { outline } = await renderMarkdown("# A\n\n## B\n\n## C");
    expect(outline).toEqual([
      { depth: 1, text: "A", line: 1, id: "a" },
      { depth: 2, text: "B", line: 3, id: "b" },
      { depth: 2, text: "C", line: 5, id: "c" },
    ]);
  });

  it("de-duplicates repeated heading ids", async () => {
    const { outline } = await renderMarkdown("# Notes\n\n# Notes");
    expect(outline.map((h) => h.id)).toEqual(["notes", "notes-1"]);
  });
});
