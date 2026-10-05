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
/** Line to reveal once a document's editor state is active (e.g. from a search hit). */
export const pendingReveal = new Map<string, number>();

/** Every document id holding cached state, across all registry maps. */
export function cachedDocumentIds(): string[] {
  return [
    ...new Set([
      ...savedStates.keys(),
      ...asyncLangLoaded,
      ...pendingContent.keys(),
      ...pendingReveal.keys(),
    ]),
  ];
}

/**
 * Drops every cached artifact for a document. Called when its tab closes —
 * `pendingContent` in particular can hold a whole file's text, so leaving these
 * behind leaks the document for the lifetime of the session.
 */
export function forgetDocument(docId: string): void {
  savedStates.delete(docId);
  asyncLangLoaded.delete(docId);
  pendingContent.delete(docId);
  pendingReveal.delete(docId);
}

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
  // A document opened but never shown in the editor (e.g. restored while in Preview
  // mode) only has its pending text; without this the preview renders it empty.
  return savedStates.get(docId)?.doc.toString() ?? pendingContent.get(docId) ?? "";
}

/**
 * 1-based caret position of a document, for session restore (FR-6.4).
 *
 * Reads the live view when the document is active, otherwise its saved state. A
 * document with neither — one restored but never focused — has no caret to report,
 * so line 1 is the honest answer rather than a remembered position that never existed.
 */
export function getDocCursor(docId: string): { line: number; column: number } {
  const state =
    activeView && useDocumentsStore.getState().activeId === docId
      ? activeView.state
      : savedStates.get(docId);
  if (!state) return { line: 1, column: 1 };
  const head = state.selection.main.head;
  const line = state.doc.lineAt(head);
  return { line: line.number, column: head - line.from + 1 };
}
