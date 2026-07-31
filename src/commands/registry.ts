import type { Command, KeymapConflict } from "./types.ts";

/**
 * The command registry. Commands register once at startup; consumers read the
 * static list. Duplicate ids throw (a programming error, caught by tests).
 */
export class CommandRegistry {
  private readonly commands = new Map<string, Command>();

  register(command: Command): void {
    if (this.commands.has(command.id)) {
      throw new Error(`Duplicate command id: ${command.id}`);
    }
    this.commands.set(command.id, command);
  }

  registerAll(commands: readonly Command[]): void {
    for (const c of commands) this.register(c);
  }

  get(id: string): Command | undefined {
    return this.commands.get(id);
  }

  getAll(): Command[] {
    return [...this.commands.values()];
  }

  run(id: string): void {
    const command = this.commands.get(id);
    if (!command) throw new Error(`Unknown command: ${id}`);
    command.run();
  }

  /** Returns the command bound to a chord (first match), if any. */
  findByChord(chord: string): Command | undefined {
    return this.getAll().find((c) => c.defaultKeys?.includes(chord));
  }

  /** Detects chords bound to more than one command (docs/04 §9 conflict detection). */
  conflicts(): KeymapConflict[] {
    const byChord = new Map<string, string[]>();
    for (const c of this.getAll()) {
      for (const chord of c.defaultKeys ?? []) {
        byChord.set(chord, [...(byChord.get(chord) ?? []), c.id]);
      }
    }
    return [...byChord.entries()]
      .filter(([, ids]) => ids.length > 1)
      .map(([chord, commandIds]) => ({ chord, commandIds }));
  }
}
