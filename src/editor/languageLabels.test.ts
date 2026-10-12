import { describe, it, expect } from "vitest";
import { languages } from "@codemirror/language-data";
import { languageIdForFilename, isMarkdownFilename } from "./languageLabels.ts";
import { GENERATED_LABELS } from "./languageLabels.generated.ts";

/**
 * The generated table is the point of failure for this feature: it is committed data derived
 * from a dependency, so it can silently rot when that dependency updates. Re-deriving it here
 * turns rot into a failing build.
 *
 * Importing `@codemirror/language-data` is fine *in a test* — the constraint it violates is
 * about the boot path (see `languageLabels.ts`), and tests have no boot path.
 */
function deriveFromDependency(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const desc of languages) {
    for (const ext of desc.extensions ?? []) {
      const key = ext.toLowerCase();
      if (!(key in map)) map[key] = desc.name;
    }
  }
  return map;
}

describe("generated label table", () => {
  it("matches @codemirror/language-data exactly", () => {
    // Fails when the dependency is upgraded without re-running
    // `node scripts/gen-language-labels.mjs`.
    expect(GENERATED_LABELS).toEqual(deriveFromDependency());
  });

  it("covers every extension the editor can highlight", () => {
    const highlightable = Object.keys(deriveFromDependency());
    expect(highlightable.length).toBeGreaterThanOrEqual(200);
    const unlabelled = highlightable.filter(
      (ext) => languageIdForFilename(`file.${ext}`) === "Plain Text",
    );
    // Only genuinely-plain formats may resolve to "Plain Text".
    expect(unlabelled).toEqual([]);
  });
});

describe("languageIdForFilename", () => {
  it("names Markdown regardless of extension spelling", () => {
    for (const name of ["a.md", "a.markdown", "a.mdown", "a.mkd", "a.MDX", "a.MD"]) {
      expect(languageIdForFilename(name)).toBe("Markdown");
    }
  });

  it("names the languages the previous hand table missed", () => {
    // Each of these highlighted correctly at v1.0 and reported "Plain Text".
    expect(languageIdForFilename("main.dart")).toBe("Dart");
    expect(languageIdForFilename("build.gradle")).toBe("Groovy");
    expect(languageIdForFilename("main.zig")).not.toBe("Dart");
    expect(languageIdForFilename("Cargo.toml")).toBe("TOML");
    expect(languageIdForFilename("a.hs")).toBe("Haskell");
    expect(languageIdForFilename("a.jl")).toBe("Julia");
    expect(languageIdForFilename("a.scala")).toBe("Scala");
    expect(languageIdForFilename("a.proto")).toBe("ProtoBuf");
  });

  it("keeps the labels the hand table got right", () => {
    expect(languageIdForFilename("a.py")).toBe("Python");
    expect(languageIdForFilename("a.rs")).toBe("Rust");
    expect(languageIdForFilename("a.go")).toBe("Go");
    expect(languageIdForFilename("a.kt")).toBe("Kotlin");
    expect(languageIdForFilename("a.kts")).toBe("Kotlin");
    expect(languageIdForFilename("a.swift")).toBe("Swift");
    expect(languageIdForFilename("a.cs")).toBe("C#");
    expect(languageIdForFilename("a.cpp")).toBe("C++");
    expect(languageIdForFilename("a.cxx")).toBe("C++");
    expect(languageIdForFilename("a.hpp")).toBe("C++");
    expect(languageIdForFilename("a.php")).toBe("PHP");
    expect(languageIdForFilename("a.sql")).toBe("SQL");
    expect(languageIdForFilename("a.yaml")).toBe("YAML");
    expect(languageIdForFilename("a.yml")).toBe("YAML");
    expect(languageIdForFilename("a.json")).toBe("JSON");
    expect(languageIdForFilename("a.html")).toBe("HTML");
    expect(languageIdForFilename("a.scss")).toBe("SCSS");
    expect(languageIdForFilename("a.ps1")).toBe("PowerShell");
    expect(languageIdForFilename("a.sh")).toBe("Shell");
  });

  it("names formats that have no CodeMirror grammar", () => {
    expect(languageIdForFilename("a.bat")).toBe("Batch");
    expect(languageIdForFilename("a.cmd")).toBe("Batch");
    expect(languageIdForFilename("a.csv")).toBe("CSV");
    expect(languageIdForFilename("a.txt")).toBe("Plain Text");
    expect(languageIdForFilename("app.log")).toBe("Log");
  });

  it("corrects upstream names that read badly in a status bar", () => {
    expect(languageIdForFilename("setup.ini")).toBe("INI");
    expect(languageIdForFilename("a.diff")).toBe("Diff");
    expect(languageIdForFilename("a.patch")).toBe("Diff");
  });

  it("resolves dotfiles by their trailing name", () => {
    expect(languageIdForFilename(".gitignore")).toBe("Git Ignore");
    expect(languageIdForFilename(".gitattributes")).toBe("Git Attributes");
    expect(languageIdForFilename(".env")).toBe("Env");
  });

  it("falls back to Plain Text for names with no extension", () => {
    expect(languageIdForFilename("LICENSE")).toBe("Plain Text");
    expect(languageIdForFilename("Makefile")).toBe("Plain Text");
    expect(languageIdForFilename("")).toBe("Plain Text");
  });

  it("is case-insensitive about extensions", () => {
    expect(languageIdForFilename("A.PY")).toBe("Python");
    expect(languageIdForFilename("A.JSON")).toBe("JSON");
  });
});

describe("isMarkdownFilename", () => {
  it("accepts every Markdown spelling and rejects code", () => {
    expect(isMarkdownFilename("notes.md")).toBe(true);
    expect(isMarkdownFilename("notes.MARKDOWN")).toBe(true);
    expect(isMarkdownFilename("notes.mdx")).toBe(true);
    expect(isMarkdownFilename("main.py")).toBe(false);
    expect(isMarkdownFilename("main.rs")).toBe(false);
    expect(isMarkdownFilename("README")).toBe(false);
    // A file that merely contains ".md" mid-name is not Markdown.
    expect(isMarkdownFilename("a.md.bak")).toBe(false);
  });
});
