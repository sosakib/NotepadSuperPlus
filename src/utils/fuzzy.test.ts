import { describe, it, expect } from "vitest";
import { fuzzyMatch } from "./fuzzy.ts";

describe("fuzzyMatch", () => {
  it("returns a zero-score match for an empty query", () => {
    expect(fuzzyMatch("", "anything")).toEqual({ score: 0, indices: [] });
  });

  it("matches a subsequence and reports indices", () => {
    const r = fuzzyMatch("cmd", "Command");
    expect(r).not.toBeNull();
    expect(r!.indices.length).toBe(3);
  });

  it("returns null when not a subsequence", () => {
    expect(fuzzyMatch("xyz", "Command")).toBeNull();
  });

  it("scores a prefix higher than a scattered match", () => {
    const prefix = fuzzyMatch("com", "command palette")!;
    const scattered = fuzzyMatch("com", "cycle open mode")!;
    expect(prefix.score).toBeGreaterThan(scattered.score);
  });

  it("is case-insensitive", () => {
    expect(fuzzyMatch("CMD", "command")).not.toBeNull();
  });
});
