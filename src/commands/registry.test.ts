import { describe, it, expect, vi } from "vitest";
import { CommandRegistry } from "./registry.ts";
import { defaultCommands } from "./defaults.ts";

describe("CommandRegistry", () => {
  it("registers and runs a command", () => {
    const reg = new CommandRegistry();
    const run = vi.fn();
    reg.register({ id: "a", title: "A", category: "Test", run });
    reg.run("a");
    expect(run).toHaveBeenCalledOnce();
  });

  it("throws on duplicate id", () => {
    const reg = new CommandRegistry();
    reg.register({ id: "a", title: "A", category: "T", run: () => {} });
    expect(() => reg.register({ id: "a", title: "A2", category: "T", run: () => {} })).toThrow(
      /Duplicate command id/,
    );
  });

  it("throws when running an unknown command", () => {
    const reg = new CommandRegistry();
    expect(() => reg.run("nope")).toThrow(/Unknown command/);
  });

  it("finds a command by chord", () => {
    const reg = new CommandRegistry();
    reg.register({ id: "a", title: "A", category: "T", defaultKeys: ["ctrl+b"], run: () => {} });
    expect(reg.findByChord("ctrl+b")?.id).toBe("a");
    expect(reg.findByChord("ctrl+x")).toBeUndefined();
  });

  it("detects keymap conflicts", () => {
    const reg = new CommandRegistry();
    reg.register({ id: "a", title: "A", category: "T", defaultKeys: ["ctrl+k"], run: () => {} });
    reg.register({ id: "b", title: "B", category: "T", defaultKeys: ["ctrl+k"], run: () => {} });
    const conflicts = reg.conflicts();
    expect(conflicts).toEqual([{ chord: "ctrl+k", commandIds: ["a", "b"] }]);
  });
});

describe("default command set", () => {
  const commands = defaultCommands();

  it("every command has an id, title, category, and run", () => {
    for (const c of commands) {
      expect(c.id).toBeTruthy();
      expect(c.title).toBeTruthy();
      expect(c.category).toBeTruthy();
      expect(typeof c.run).toBe("function");
    }
  });

  it("has no duplicate ids", () => {
    const ids = commands.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has no keymap conflicts", () => {
    const reg = new CommandRegistry();
    reg.registerAll(commands);
    expect(reg.conflicts()).toEqual([]);
  });
});
