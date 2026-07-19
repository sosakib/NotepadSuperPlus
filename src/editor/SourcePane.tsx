import { useEffect, useRef, type MutableRefObject } from "react";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { useDocumentsStore } from "../state/documents.ts";
import { useUiStore } from "../state/ui.ts";
import { createEditorState, languageConf, wrapConf } from "./editorState.ts";
import { languageForFilename, syncLanguageForFilename } from "./languages.ts";

/**
 * Hosts a single CodeMirror view and swaps its state as the active tab changes.
 * Per-document states are preserved in a module map so switching tabs keeps each
 * document's text, history, cursor, and scroll (docs/03 §3.1 — CM owns the text).
 *
 * Markdown resolves synchronously into the initial state; code/data grammars load
 * lazily and are then reconfigured in (once per document).
 */
const savedStates = new Map<string, EditorState>();
const asyncLangLoaded = new Set<string>();

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
    return () => {
      view.destroy();
      viewRef.current = null;
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
      state = createEditorState(activeId, "", syncLang);
      savedStates.set(activeId, state);
      if (!syncLang) void ensureAsyncLanguage(viewRef, activeId, filename);
    }
    view.setState(state);
    view.dispatch({
      effects: wrapConf.reconfigure(useUiStore.getState().wordWrap ? EditorView.lineWrapping : []),
    });
    view.focus();
    prevIdRef.current = activeId;
  }, [activeId]);

  // Reconfigure word wrap live on the active view.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ effects: wrapConf.reconfigure(wordWrap ? EditorView.lineWrapping : []) });
  }, [wordWrap]);

  // Prune caches for closed documents.
  useEffect(() => {
    for (const id of savedStates.keys()) {
      if (!order.includes(id)) {
        savedStates.delete(id);
        asyncLangLoaded.delete(id);
      }
    }
  }, [order]);

  return <div ref={hostRef} className="source-pane" />;
}
