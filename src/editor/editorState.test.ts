import { describe, it, expect } from "vitest";
import { planForSize } from "./editorState.ts";

describe("planForSize", () => {
  it("keeps all decorations for normal files", () => {
    const plan = planForSize(10_000);
    expect(plan.isLarge).toBe(false);
    expect(plan.activeLineHighlight).toBe(true);
    expect(plan.matchHighlight).toBe(true);
  });

  it("drops cosmetic decorations for very large files", () => {
    const plan = planForSize(5_000_000);
    expect(plan.isLarge).toBe(true);
    expect(plan.activeLineHighlight).toBe(false);
    expect(plan.matchHighlight).toBe(false);
  });
});
