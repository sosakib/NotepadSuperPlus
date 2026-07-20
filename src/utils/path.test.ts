import { describe, it, expect } from "vitest";
import { basename, parentDir } from "./path.ts";

describe("basename", () => {
  it("returns the final segment for both separators", () => {
    expect(basename("C:\\Users\\me\\notes.md")).toBe("notes.md");
    expect(basename("/home/me/notes.md")).toBe("notes.md");
  });

  it("ignores trailing separators (directory roots)", () => {
    expect(basename("C:\\Users\\me\\project\\")).toBe("project");
    expect(basename("/home/me/project/")).toBe("project");
  });

  it("falls back to the input when there is no separator", () => {
    expect(basename("notes.md")).toBe("notes.md");
  });
});

describe("parentDir", () => {
  it("drops the final segment", () => {
    expect(parentDir("C:\\Users\\me\\notes.md")).toBe("C:\\Users\\me");
    expect(parentDir("/home/me/notes.md")).toBe("/home/me");
  });

  it("ignores trailing separators", () => {
    expect(parentDir("C:\\Users\\me\\project\\")).toBe("C:\\Users\\me");
  });
});
