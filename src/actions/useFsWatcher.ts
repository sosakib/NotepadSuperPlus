import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useDocumentsStore } from "../state/documents.ts";
import { useWorkspaceStore } from "../state/workspace.ts";
import { unwatch } from "../ipc/fs.ts";
import { reloadPath } from "./fileActions.ts";
import { refreshDir } from "./workspaceActions.ts";
import { isInside, parentDir } from "../utils/path.ts";

interface ChangePayload {
  path: string;
  kind: string;
}

/**
 * Listens for `fs:changed` (docs/06 §5). If the file changed on disk and the
 * buffer is clean, it reloads seamlessly; if the buffer has unsaved edits, it
 * flags a conflict for the UI to resolve. Events for files no longer open are
 * self-cleaned by unwatching.
 */
export function useFsWatcher(): void {
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void (async () => {
      try {
        unlisten = await listen<ChangePayload>("fs:changed", (event) => {
          const { path, kind } = event.payload;

          // Keep the workspace tree in sync with changes inside the open folder.
          const wsRoot = useWorkspaceStore.getState().root;
          if (wsRoot && isInside(path, wsRoot)) {
            const dir = parentDir(path);
            if (useWorkspaceStore.getState().children[dir]) void refreshDir(dir);
          }

          const store = useDocumentsStore.getState();
          const docId = store.findByPath(path);
          if (!docId) {
            // Don't unwatch workspace paths — the tree watch is recursive.
            if (!wsRoot || !isInside(path, wsRoot)) void unwatch(path);
            return;
          }
          const doc = store.docs[docId];
          if (!doc) return;
          if (kind === "remove" || doc.dirty) {
            store.setConflict(docId, true);
          } else {
            void reloadPath(docId, path);
          }
        });
      } catch {
        /* browser dev — no Tauri event bus */
      }
    })();
    return () => unlisten?.();
  }, []);
}
