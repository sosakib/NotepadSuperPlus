import { CommandRegistry } from "./registry.ts";
import { defaultCommands } from "./defaults.ts";

/** The application-wide command registry, populated with the built-in commands. */
export const registry = new CommandRegistry();
registry.registerAll(defaultCommands());

export { CommandRegistry } from "./registry.ts";
export type { Command, KeymapConflict } from "./types.ts";
