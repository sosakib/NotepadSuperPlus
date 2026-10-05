import { describe, expect, it } from "vitest";
import { getDocText, pendingContent } from "./editorRegistry.ts";

describe("getDocText", () => {
  // Regression: a session restored in Preview mode rendered every tab as empty.
  it("returns the pending text of a document whose editor never mounted", () => {
    pendingContent.set("restored", "# Hello");
    expect(getDocText("restored")).toBe("# Hello");
    pendingContent.delete("restored");
  });
});
