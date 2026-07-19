import { describe, it, expect } from "vitest";
import { eventToChord, normalizeChord } from "./chord.ts";

function key(init: Partial<KeyboardEvent>): KeyboardEvent {
  return new KeyboardEvent("keydown", init);
}

describe("eventToChord", () => {
  it("orders modifiers ctrl+alt+shift and lowercases the key", () => {
    expect(eventToChord(key({ key: "P", ctrlKey: true, shiftKey: true }))).toBe("ctrl+shift+p");
  });

  it("folds meta (Cmd) into ctrl", () => {
    expect(eventToChord(key({ key: "s", metaKey: true }))).toBe("ctrl+s");
  });

  it("normalizes named keys", () => {
    expect(eventToChord(key({ key: "ArrowUp" }))).toBe("up");
    expect(eventToChord(key({ key: " " }))).toBe("space");
  });

  it("returns only modifiers for a bare modifier press", () => {
    expect(eventToChord(key({ key: "Control", ctrlKey: true }))).toBe("ctrl");
  });
});

describe("normalizeChord", () => {
  it("canonicalizes authored chords", () => {
    expect(normalizeChord("Ctrl+Shift+P")).toBe("ctrl+shift+p");
    expect(normalizeChord("Cmd+B")).toBe("ctrl+b");
    expect(normalizeChord("Shift+Ctrl+K")).toBe("ctrl+shift+k");
  });
});
