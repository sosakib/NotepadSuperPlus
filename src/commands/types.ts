/** A user-invokable command. Menus, the palette, and the keymap are all views over
 * the command registry — a single source of truth (docs/05_Component_Design.md §4). */
export interface Command {
  id: string;
  title: string;
  category: string;
  /** Default key chords (normalized, e.g. "ctrl+shift+p"). May be empty. */
  defaultKeys?: string[];
  /** Optional icon name (lucide). */
  icon?: string;
  run: () => void;
}

export interface KeymapConflict {
  chord: string;
  commandIds: string[];
}
