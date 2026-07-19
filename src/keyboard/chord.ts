/**
 * Keyboard chord normalization. A chord is a lowercase, plus-joined string with
 * modifiers in a stable order, e.g. "ctrl+shift+p", "ctrl+=", "escape".
 * On macOS the platform Meta key is folded into "ctrl" so one keymap serves both
 * (docs/04 §9 — "Ctrl = Cmd on macOS").
 */

const MODIFIER_ORDER = ["ctrl", "alt", "shift"] as const;

export function eventToChord(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("ctrl");
  if (e.altKey) parts.push("alt");
  if (e.shiftKey) parts.push("shift");

  let key = e.key.toLowerCase();
  // Normalize a few names for stability across platforms/layouts.
  const aliases: Record<string, string> = {
    " ": "space",
    esc: "escape",
    arrowup: "up",
    arrowdown: "down",
    arrowleft: "left",
    arrowright: "right",
  };
  key = aliases[key] ?? key;

  // Ignore bare modifier presses.
  if (key === "control" || key === "meta" || key === "alt" || key === "shift") {
    return sortModifiers(parts).join("+");
  }
  return [...sortModifiers(parts), key].join("+");
}

function sortModifiers(mods: string[]): string[] {
  return MODIFIER_ORDER.filter((m) => mods.includes(m));
}

/** Normalizes an authored chord (e.g. "Ctrl+Shift+P") to canonical form. */
export function normalizeChord(chord: string): string {
  const raw = chord.split("+").map((p) => p.trim().toLowerCase());
  const mods = raw.filter(
    (p) => p === "ctrl" || p === "cmd" || p === "meta" || p === "alt" || p === "shift",
  );
  const key = raw.find((p) => !["ctrl", "cmd", "meta", "alt", "shift"].includes(p)) ?? "";
  const normMods = mods.map((m) => (m === "cmd" || m === "meta" ? "ctrl" : m));
  return [...MODIFIER_ORDER.filter((m) => normMods.includes(m)), key].filter(Boolean).join("+");
}
