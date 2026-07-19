import { create } from "zustand";

/**
 * Open documents and their tab ordering. Document *text* lives in CodeMirror
 * (src/editor), not here — this store holds only metadata so it stays cheap and
 * serializable for session restore (Stage 4+). Filesystem-backed documents arrive
 * in Stage 5; for now `newDocument` creates in-memory untitled buffers.
 */
export interface DocMeta {
  id: string;
  title: string;
  /** Human-readable language label for the status bar (e.g. "Markdown", "JSON"). */
  languageId: string;
  /** Filename used for language detection; for untitled docs, a synthetic `*.md`. */
  filename: string;
  dirty: boolean;
}

export interface DocumentsState {
  docs: Record<string, DocMeta>;
  order: string[];
  activeId: string | null;

  newDocument: () => string;
  closeDocument: (id: string) => void;
  setActive: (id: string) => void;
  markDirty: (id: string, dirty: boolean) => void;
}

let untitledSeq = 0;
let idSeq = 0;

export const useDocumentsStore = create<DocumentsState>((set, get) => ({
  docs: {},
  order: [],
  activeId: null,

  newDocument: () => {
    untitledSeq += 1;
    const id = `doc-${++idSeq}`;
    const title = `Untitled-${untitledSeq}.md`;
    const doc: DocMeta = {
      id,
      title,
      languageId: "Markdown",
      filename: title,
      dirty: false,
    };
    set((s) => ({
      docs: { ...s.docs, [id]: doc },
      order: [...s.order, id],
      activeId: id,
    }));
    return id;
  },

  closeDocument: (id) => {
    const { order, activeId } = get();
    const index = order.indexOf(id);
    if (index === -1) return;
    const nextOrder = order.filter((x) => x !== id);
    let nextActive = activeId;
    if (activeId === id) {
      // Activate the neighbor to the right, else the left, else nothing.
      nextActive = nextOrder[index] ?? nextOrder[index - 1] ?? null;
    }
    set((s) => ({
      docs: Object.fromEntries(Object.entries(s.docs).filter(([key]) => key !== id)),
      order: nextOrder,
      activeId: nextActive,
    }));
  },

  setActive: (id) => set({ activeId: id }),
  markDirty: (id, dirty) =>
    set((s) => (s.docs[id] ? { docs: { ...s.docs, [id]: { ...s.docs[id], dirty } } } : s)),
}));
