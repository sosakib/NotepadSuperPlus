import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { openPath } from "./fileActions.ts";

/**
 * Windows shell integration: opens files the app was launched with (Explorer
 * "Open with", file association double-click, drag onto the exe) and files
 * forwarded by a second launch while this instance is running (the Rust
 * single-instance plugin emits `cli:open`). No-ops in the browser dev harness.
 */
export function useCliOpen(): void {
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void (async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const initial = await invoke<string[]>("cli_paths");
        for (const path of initial) {
          await openPath(path);
        }
        unlisten = await listen<string[]>("cli:open", (event) => {
          for (const path of event.payload) void openPath(path);
        });
      } catch {
        /* browser dev — no Tauri runtime */
      }
    })();
    return () => unlisten?.();
  }, []);
}
