import type { EditorState } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { useDocumentsStore } from "../state/documents.ts";

/**
 * Shared editor registry: the per-document saved states and the currently-mounted
 * view. Kept out of SourcePane.tsx so non-component exports don't break React Fast
 * Refresh, and so scroll-sync can read the view without importing a component.
 */

/** Per-document CodeMirror states, preserved across tab switches (CM owns the text). */
export const savedStates = new Map<string, EditorState>();
/** Documents whose async (code/data) language has already been loaded. */
export const asyncLangLoaded = new Set<string>();
/** Initial text for documents that were opened from disk, consumed on first mount. */
export const pendingContent = new Map<string, string>();

/** Replaces a document's editor state with fresh content (e.g. reload from disk). */
export function replaceDocText(docId: string, text: string): void {
  if (activeView && useDocumentsStore.getState().activeId === docId) {
    activeView.dispatch({
      changes: { from: 0, to: activeView.state.doc.length, insert: text },
    });
  } else {
    pendingContent.set(docId, text);
    savedStates.delete(docId);
  }
}

let activeView: EditorView | null = null;

export function setActiveView(view: EditorView | null): void {
  activeView = view;
}

/** The live editor view, if one is mounted (source/split modes). */
export function getActiveView(): EditorView | null {
  return activeView;
}

/** Current text of a document — from the live view if active, else its saved state. */
export function getDocText(docId: string): string {
  if (activeView && useDocumentsStore.getState().activeId === docId) {
    return activeView.state.doc.toString();
  }
  return savedStates.get(docId)?.doc.toString() ?? "";
}
