import { useEffect, useRef } from "react";
import { loadSession, saveSession, type SessionSnapshot } from "../ipc/session.ts";
import { openWorkspace } from "../ipc/workspace.ts";
import { openPath } from "./fileActions.ts";
import { getDocCursor } from "../editor/editorRegistry.ts";
import { useDocumentsStore } from "../state/documents.ts";
import { useUiStore, type ViewMode } from "../state/ui.ts";
import { useWorkspaceStore } from "../state/workspace.ts";

/**
 * Restores the previous session on boot and keeps it saved as it changes (FR-6.4,
 * docs/06 §8).
 *
 * Only file-backed documents are persisted. Restoring an unsaved buffer would mean
 * writing its text to disk behind the user's back, which is crash-draft recovery
 * (FR-1.7) — a separate feature with different durability guarantees, and one a user
 * would reasonably expect to be able to decline.
 *
 * Restore is deliberately *not* awaited on the critical path: the shell paints first
 * and tabs appear as their files load, so a session of twenty documents never delays
 * the window becoming interactive.
 */
const SAVE_DEBOUNCE_MS = 600;

/** Exported for tests: the index remapping below is easy to get subtly wrong. */
export function currentSnapshot(): SessionSnapshot {
  const docs = useDocumentsStore.getState();
  const tabs = docs.order.flatMap((id) => {
    const path = docs.docs[id]?.path;
    return path ? [{ path, ...getDocCursor(id) }] : [];
  });

  // `active` indexes into the filtered list, so an untitled buffer being active must
  // not point at whatever file happens to sit at that index.
  const activePath = docs.activeId ? docs.docs[docs.activeId]?.path : undefined;
  const active = activePath ? tabs.findIndex((t) => t.path === activePath) : -1;

  return {
    tabs,
    active: active >= 0 ? active : null,
    viewMode: useUiStore.getState().viewMode,
    workspace: useWorkspaceStore.getState().root,
  };
}

export function useSessionPersistence(): void {
  const restoredRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const session = await loadSession();
        if (cancelled) return;

        if (session.workspace) {
          try {
            const entries = await openWorkspace(session.workspace);
            if (!cancelled) useWorkspaceStore.getState().setRoot(session.workspace, entries);
          } catch {
            /* folder vanished or is unreadable — the documents still restore */
          }
        }

        // Sequential, not Promise.all: openPath appends to the tab order, and
        // concurrent reads would restore the tabs in whatever order the disk
        // returned them.
        for (const tab of session.tabs) {
          if (cancelled) return;
          try {
            await openPath(tab.path, tab.line);
          } catch {
            /* skip a file that became unreadable between load and open */
          }
        }

        if (cancelled) return;

        const activePath = session.active !== null ? session.tabs[session.active]?.path : undefined;
        if (activePath) {
          const id = useDocumentsStore.getState().findByPath(activePath);
          if (id) useDocumentsStore.getState().setActive(id);
        }
        if (session.tabs.length > 0) {
          useUiStore.getState().setViewMode(session.viewMode as ViewMode);
        }
      } catch {
        /* browser dev, or no Tauri runtime — start empty */
      } finally {
        if (!cancelled) {
          lastSavedRef.current = JSON.stringify(currentSnapshot());
          restoredRef.current = true;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const persist = (): void => {
      // Saving before the restore finishes would write the empty state over the
      // session it is in the middle of reading.
      if (!restoredRef.current) return;
      const snapshot = JSON.stringify(currentSnapshot());
      if (snapshot === lastSavedRef.current) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const next = currentSnapshot();
        lastSavedRef.current = JSON.stringify(next);
        void saveSession(next).catch(() => {
          /* not running under Tauri */
        });
      }, SAVE_DEBOUNCE_MS);
    };

    const unsubDocs = useDocumentsStore.subscribe(persist);
    const unsubUi = useUiStore.subscribe(persist);
    const unsubWs = useWorkspaceStore.subscribe(persist);
    return () => {
      unsubDocs();
      unsubUi();
      unsubWs();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}
