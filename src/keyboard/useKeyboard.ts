import { useEffect } from "react";
import { registry } from "../commands/index.ts";
import { useUiStore } from "../state/ui.ts";
import { eventToChord } from "./chord.ts";

/**
 * Global keyboard manager: maps key chords to registry commands. Attaches one
 * document-level listener. When the palette is open, only Escape is handled here
 * (the palette owns its own keys).
 */
export function useKeyboard(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      const chord = eventToChord(e);
      if (!chord) return;

      if (useUiStore.getState().paletteOpen) {
        if (chord === "escape") {
          e.preventDefault();
          useUiStore.getState().setPaletteOpen(false);
        }
        return;
      }

      const command = registry.findByChord(chord);
      if (command) {
        e.preventDefault();
        command.run();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
}
