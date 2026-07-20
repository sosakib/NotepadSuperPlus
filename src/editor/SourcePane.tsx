import { useEffect, useRef, type MutableRefObject } from "react";
import { EditorView } from "@codemirror/view";
import { useDocumentsStore } from "../state/documents.ts";
import { useUiStore } from "../state/ui.ts";
import { createEditorState, languageConf, wrapConf } from "./editorState.ts";
import { languageForFilename, syncLanguageForFilename } from "./languages.ts";
import { renderController } from "../markdown/renderController.ts";
import {
  savedStates,
  asyncLangLoaded,
  setActiveView,
  pendingContent,
  pendingReveal,
  cachedDocumentIds,
  forgetDocument,
} from "./editorRegistry.ts";

/**
 * Hosts a single CodeMirror view and swaps its state as the active tab changes.
 * Per-document states live in the editor registry so switching tabs keeps each
 * document's text, history, cursor, and scroll (docs/03 §3.1 — CM owns the text).
 *
 * Markdown resolves synchronously into the initial state (survives StrictMode
 * remounts); code/data grammars load lazily and reconfigure in once per document.
 */
async function ensureAsyncLanguage(
  viewRef: MutableRefObject<EditorView | null>,
  docId: string,
  filename: string,
): Promise<void> {
  if (asyncLangLoaded.has(docId)) return;
  asyncLangLoaded.add(docId);
  const ext = await languageForFilename(filename);
  if (!ext) return;
  const view = viewRef.current;
  if (view && useDocumentsStore.getState().activeId === docId) {
    view.dispatch({ effects: languageConf.reconfigure(ext) });
    savedStates.set(docId, view.state);
  } else {
    const saved = savedStates.get(docId);
    if (saved)
      savedStates.set(docId, saved.update({ effects: languageConf.reconfigure(ext) }).state);
  }
}

export function SourcePane() {
  const activeId = useDocumentsStore((s) => s.activeId);
  const order = useDocumentsStore((s) => s.order);
  const wordWrap = useUiStore((s) => s.wordWrap);

  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const prevIdRef = useRef<string | null>(null);

  // Mount the view once.
  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({ parent: hostRef.current });
    viewRef.current = view;
    setActiveView(view);
    return () => {
      // Persist the current text before tearing down (e.g. switching to preview),
      // so the preview/outline read the latest content, not the stale saved state.
      if (prevIdRef.current) savedStates.set(prevIdRef.current, view.state);
      view.destroy();
      viewRef.current = null;
      setActiveView(null);
      prevIdRef.current = null;
    };
  }, []);

  // Swap state when the active document changes.
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !activeId) return;

    const prevId = prevIdRef.current;
    if (prevId && prevId !== activeId) savedStates.set(prevId, view.state);

    let state = savedStates.get(activeId);
    if (!state) {
      const meta = useDocumentsStore.getState().docs[activeId];
      const filename = meta?.filename ?? "untitled.md";
      const syncLang = syncLanguageForFilename(filename);
      const initial = pendingContent.get(activeId) ?? "";
      pendingContent.delete(activeId);
      state = createEditorState(activeId, initial, syncLang);
      savedStates.set(activeId, state);
      if (!syncLang) void ensureAsyncLanguage(viewRef, activeId, filename);
    }
    view.setState(state);
    view.dispatch({
      effects: wrapConf.reconfigure(useUiStore.getState().wordWrap ? EditorView.lineWrapping : []),
    });
    view.focus();
    prevIdRef.current = activeId;

    // Jump to a requested line (e.g. a workspace-search hit) now that state is live.
    const revealLine = pendingReveal.get(activeId);
    if (revealLine !== undefined) {
      pendingReveal.delete(activeId);
      const clamped = Math.max(1, Math.min(revealLine, view.state.doc.lines));
      const pos = view.state.doc.line(clamped).from;
      view.dispatch({ selection: { anchor: pos }, scrollIntoView: true });
    }
  }, [activeId]);

  // Reconfigure word wrap live on the active view.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ effects: wrapConf.reconfigure(wordWrap ? EditorView.lineWrapping : []) });
  }, [wordWrap]);

  // Prune caches for closed documents.
  useEffect(() => {
    const open = new Set(order);
    for (const id of cachedDocumentIds()) {
      if (!open.has(id)) {
        forgetDocument(id);
        renderController.forget(id);
      }
    }
  }, [order]);

  return <div ref={hostRef} className="source-pane" />;
}
