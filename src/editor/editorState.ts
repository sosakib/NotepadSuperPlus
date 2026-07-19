import { EditorState, Compartment, type Extension } from "@codemirror/state";
import {
  EditorView,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  keymap,
} from "@codemirror/view";
import { history, defaultKeymap, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, indentOnInput, foldGutter, foldKeymap } from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { editorTheme } from "./theme.ts";
import { useUiStore } from "../state/ui.ts";
import { useDocumentsStore } from "../state/documents.ts";
import { renderController } from "../markdown/renderController.ts";

/** Per-view reconfigurable slots. */
export const languageConf = new Compartment();
export const wrapConf = new Compartment();

// Above this size we drop cosmetic per-line decorations to protect typing latency
// on very large files (docs/03 §3.4, docs/09 §5). Real large files arrive in Stage 5.
const LARGE_FILE_BYTES = 4_000_000;

export interface LargeFilePlan {
  isLarge: boolean;
  activeLineHighlight: boolean;
  matchHighlight: boolean;
}

export function planForSize(byteLength: number): LargeFilePlan {
  const isLarge = byteLength > LARGE_FILE_BYTES;
  return {
    isLarge,
    activeLineHighlight: !isLarge,
    matchHighlight: !isLarge,
  };
}

function cursorExtension(docId: string): Extension {
  return EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      useDocumentsStore.getState().markDirty(docId, true);
      renderController.requestRender(docId, update.state.doc.toString());
    }
    if (update.docChanged || update.selectionSet) {
      const head = update.state.selection.main.head;
      const line = update.state.doc.lineAt(head);
      useUiStore.getState().setCursor(line.number, head - line.from + 1);
    }
  });
}

/** Builds a fresh editor state for a document. `language` may be null (plain text). */
export function createEditorState(
  docId: string,
  text: string,
  language: Extension | null,
): EditorState {
  const plan = planForSize(text.length);
  const wordWrap = useUiStore.getState().wordWrap;

  const extensions: Extension[] = [
    lineNumbers(),
    foldGutter(),
    history(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    rectangularSelection(),
    crosshairCursor(),
    indentOnInput(),
    bracketMatching(),
    keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, ...foldKeymap, indentWithTab]),
    editorTheme(),
    languageConf.of(language ?? []),
    wrapConf.of(wordWrap ? EditorView.lineWrapping : []),
    cursorExtension(docId),
  ];

  if (plan.activeLineHighlight) {
    extensions.push(highlightActiveLine(), highlightActiveLineGutter());
  }
  if (plan.matchHighlight) {
    extensions.push(highlightSelectionMatches());
  }

  return EditorState.create({ doc: text, extensions });
}
