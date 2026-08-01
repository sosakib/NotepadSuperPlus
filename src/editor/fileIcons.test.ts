import { describe, it, expect } from "vitest";
import { iconForLanguage } from "./fileIcons.ts";
import { languageIdForFilename } from "./languageLabels.ts";
import { GENERATED_LABELS } from "./languageLabels.generated.ts";

/**
 * The icon table is data, but the fallback around it is logic: an unmapped language has to
 * land on the *code* glyph rather than the document glyph, and only genuinely-prose formats
 * may land on the document glyph. Getting that backwards is invisible in review and obvious
 * in the tab strip, so it gets a check.
 */
describe("iconForLanguage", () => {
  it("returns an icon for every language the label table can produce", () => {
    const languageIds = new Set(Object.values(GENERATED_LABELS));
    for (const id of languageIds) {
      expect(iconForLanguage(id), `no icon resolved for ${id}`).toBeTruthy();
    }
  });

  it("groups files that share a shape onto the same icon", () => {
    expect(iconForLanguage("YAML")).toBe(iconForLanguage("TOML"));
    expect(iconForLanguage("Shell")).toBe(iconForLanguage("PowerShell"));
    expect(iconForLanguage("CSS")).toBe(iconForLanguage("SCSS"));
    expect(iconForLanguage("SQL")).toBe(iconForLanguage("CSV"));
  });

  it("falls back to the code glyph, not the document glyph, for unmapped languages", () => {
    const code = iconForLanguage("Rust");
    expect(iconForLanguage("Dart")).toBe(code);
    expect(iconForLanguage("Haskell")).toBe(code);
    // A language nobody has mapped yet still reads as code.
    expect(iconForLanguage("Some Future Language")).toBe(code);
    expect(iconForLanguage("Markdown")).not.toBe(code);
  });

  it("keeps prose formats on the document glyph", () => {
    const prose = iconForLanguage("Markdown");
    expect(iconForLanguage("Plain Text")).toBe(prose);
    expect(iconForLanguage("LaTeX")).toBe(prose);
    expect(iconForLanguage("Diff")).toBe(prose);
  });

  it("resolves end to end from a filename", () => {
    expect(iconForLanguage(languageIdForFilename("a.json"))).toBe(iconForLanguage("JSON"));
    expect(iconForLanguage(languageIdForFilename("a.md"))).toBe(iconForLanguage("Markdown"));
    expect(iconForLanguage(languageIdForFilename("a.ps1"))).toBe(iconForLanguage("Shell"));
  });
});
