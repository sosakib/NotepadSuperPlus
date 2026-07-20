import { describe, it, expect } from "vitest";
import { buildExport } from "./exportActions.ts";

describe("buildExport", () => {
  it("renders Markdown to HTML rather than embedding the source", async () => {
    const out = await buildExport("# Hello\n\n**bold**", "html", "doc.md");
    expect(out).toContain("<h1");
    expect(out).toContain("Hello");
    expect(out).toContain("<strong>bold</strong>");
    // The raw Markdown must not survive into the exported body.
    expect(out).not.toContain("**bold**");
  });

  it("produces a standalone document with inlined styles and no remote assets", async () => {
    const out = await buildExport("# Title", "html", "doc.md");
    expect(out.startsWith("<!doctype html>")).toBe(true);
    expect(out).toContain("<style>");
    expect(out).not.toMatch(/https?:\/\//);
  });

  it("escapes the title so it cannot break out of the tag", async () => {
    const out = await buildExport("text", "html", "</title><script>alert(1)</script>");
    expect(out).not.toContain("<script>");
    expect(out).toContain("&lt;script&gt;");
  });

  it("sanitizes dangerous Markdown content on export, like the preview does", async () => {
    const out = await buildExport("<script>alert(1)</script>\n\nhi", "html", "doc.md");
    expect(out).not.toContain("<script>alert(1)</script>");
  });

  it("passes Markdown and plain text through unchanged", async () => {
    const source = "# Heading\n\n- item\n";
    expect(await buildExport(source, "md", "doc.md")).toBe(source);
    expect(await buildExport(source, "txt", "doc.md")).toBe(source);
  });
});
