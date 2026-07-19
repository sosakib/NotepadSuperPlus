import { describe, it, expect } from "vitest";
import { languageIdForFilename } from "./languages.ts";

describe("languageIdForFilename", () => {
  it("identifies Markdown variants", () => {
    expect(languageIdForFilename("README.md")).toBe("Markdown");
    expect(languageIdForFilename("notes.markdown")).toBe("Markdown");
  });

  it("identifies common code and data formats", () => {
    expect(languageIdForFilename("data.json")).toBe("JSON");
    expect(languageIdForFilename("app.js")).toBe("JavaScript");
    expect(languageIdForFilename("main.py")).toBe("Python");
    expect(languageIdForFilename("styles.css")).toBe("CSS");
    expect(languageIdForFilename("index.html")).toBe("HTML");
  });

  it("falls back to Plain Text for unknown extensions", () => {
    expect(languageIdForFilename("mystery.zzz")).toBe("Plain Text");
    expect(languageIdForFilename("LICENSE")).toBe("Plain Text");
  });
});
