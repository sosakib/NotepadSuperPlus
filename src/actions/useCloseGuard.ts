import { useEffect } from "react";
import { useDocumentsStore } from "../state/documents.ts";

/**
 * Asks before the window closes with unsaved documents. Tab close already asks
 * (closeFile); without this, X / Alt+F4 silently threw the edits away, since the
 * session deliberately does not persist unsaved text.
 */
export function useCloseGuard(): void {
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;
    void (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const { ask } = await import("@tauri-apps/plugin-dialog");
        const win = getCurrentWindow();
        const off = await win.onCloseRequested(async (event) => {
          const dirty = Object.values(useDocumentsStore.getState().docs).filter((d) => d.dirty);
          if (dirty.length === 0) return; // close normally
          event.preventDefault();
          const names = dirty.map((d) => `• ${d.title}`).join("\n");
          const discard = await ask(
            `You have unsaved changes in:\n${names}\n\nQuit without saving?`,
            {
              title: "Unsaved changes",
              kind: "warning",
              okLabel: "Quit without saving",
              cancelLabel: "Keep editing",
            },
          );
          if (discard) await win.destroy();
        });
        // StrictMode unmounts before the listener resolves; don't leak a second guard.
        if (disposed) off();
        else unlisten = off;
      } catch {
        /* browser dev — no Tauri runtime */
      }
    })();
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);
}
