import { describe, expect, it } from "vitest";
import { splitFrontmatter } from "./frontmatter.ts";

describe("splitFrontmatter", () => {
  it("extracts a simple block and keeps the body", () => {
    const { frontmatter, body } = splitFrontmatter("---\ntitle: Hello\n---\n# Heading\n");
    expect(frontmatter?.entries).toEqual([{ key: "title", value: "Hello", raw: false }]);
    expect(body.trimStart()).toBe("# Heading\n");
  });

  it("preserves line numbering so scroll sync stays aligned", () => {
    // The heading is on line 5 of the real file. Removing the block instead of
    // blanking it would report line 1 and every scroll-sync target would be wrong.
    const text = "---\ntitle: T\nauthor: A\n---\n# Heading\n";
    const { body } = splitFrontmatter(text);
    expect(body.split("\n").indexOf("# Heading")).toBe(4);
    expect(body.split("\n").length).toBe(text.split("\n").length);
  });

  it("strips matching quotes", () => {
    const { frontmatter } = splitFrontmatter("---\na: \"one\"\nb: 'two'\n---\n");
    expect(frontmatter?.entries.map((e) => e.value)).toEqual(["one", "two"]);
  });

  it("reads inline arrays", () => {
    const { frontmatter } = splitFrontmatter("---\ntags: [a, b, c]\n---\n");
    expect(frontmatter?.entries[0]).toEqual({ key: "tags", value: "a, b, c", raw: false });
  });

  it("reads block lists", () => {
    const { frontmatter } = splitFrontmatter("---\ntags:\n  - one\n  - two\n---\n");
    expect(frontmatter?.entries[0]).toEqual({ key: "tags", value: "one, two", raw: false });
  });

  it("surfaces nested mappings verbatim rather than dropping them", () => {
    const { frontmatter } = splitFrontmatter("---\nauthor:\n  name: Ada\n  city: London\n---\n");
    const entry = frontmatter?.entries[0];
    expect(entry?.raw).toBe(true);
    expect(entry?.value).toContain("name: Ada");
    expect(entry?.value).toContain("city: London");
  });

  it("ignores a block that is not at the very start", () => {
    const text = "# Heading\n\n---\ntitle: T\n---\n";
    const { frontmatter, body } = splitFrontmatter(text);
    expect(frontmatter).toBeNull();
    expect(body).toBe(text);
  });

  it("treats an empty block as a thematic break, not frontmatter", () => {
    const text = "---\n---\n";
    expect(splitFrontmatter(text).frontmatter).toBeNull();
  });

  it("returns null when there is no frontmatter", () => {
    expect(splitFrontmatter("# Just a document\n").frontmatter).toBeNull();
  });

  it("skips comments and blank lines", () => {
    const { frontmatter } = splitFrontmatter("---\n# a comment\n\ntitle: T\n---\n");
    expect(frontmatter?.entries).toEqual([{ key: "title", value: "T", raw: false }]);
  });

  it("handles CRLF documents", () => {
    const { frontmatter, body } = splitFrontmatter("---\r\ntitle: T\r\n---\r\n# H\r\n");
    expect(frontmatter?.entries[0]?.value).toBe("T");
    expect(body).toContain("# H");
  });

  it("keeps a colon inside a value", () => {
    const { frontmatter } = splitFrontmatter("---\nurl: https://example.com/x\n---\n");
    expect(frontmatter?.entries[0]?.value).toBe("https://example.com/x");
  });
});
