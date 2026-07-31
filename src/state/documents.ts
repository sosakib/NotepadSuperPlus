import { create } from "zustand";
import { languageIdForFilename } from "../editor/languageLabels.ts";
import { basename } from "../utils/path.ts";

/**
 * Open documents and their tab ordering. Document *text* lives in CodeMirror
 * (src/editor), not here — this store holds only metadata. Since Stage 5, documents
 * can be backed by a file on disk (docs/07).
 */
export interface DocMeta {
  id: string;
  title: string;
  /** Human-readable language label for the status bar (e.g. "Markdown", "JSON"). */
  languageId: string;
  /** Filename used for language detection. */
  filename: string;
  /** Absolute path once saved/opened; undefined for unsaved untitled buffers. */
  path?: string;
  encoding: string;
  eol: string;
  /** Modification time (ms) at last read/save, for external-change detection. */
  mtimeMs?: number;
  readonly: boolean;
  dirty: boolean;
  /** Set when the file changed on disk while this buffer had unsaved edits. */
  conflict: boolean;
}

export interface OpenFileInfo {
  path: string;
  title: string;
  encoding: string;
  eol: string;
  mtimeMs: number;
  readonly: boolean;
}

export interface DocumentsState {
  docs: Record<string, DocMeta>;
  order: string[];
  activeId: string | null;

  newDocument: () => string;
  /** Registers a document opened from disk (or returns the existing one for that path). */
  openDocument: (info: OpenFileInfo) => { id: string; existing: boolean };
  closeDocument: (id: string) => void;
  setActive: (id: string) => void;
  markDirty: (id: string, dirty: boolean) => void;
  /** Applies the result of a successful save (path/title/mtime, clears dirty & conflict). */
  markSaved: (id: string, info: { path: string; mtimeMs: number }) => void;
  setConflict: (id: string, conflict: boolean) => void;
  findByPath: (path: string) => string | undefined;
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
      encoding: "utf-8",
      eol: "lf",
      readonly: false,
      dirty: false,
      conflict: false,
    };
    set((s) => ({ docs: { ...s.docs, [id]: doc }, order: [...s.order, id], activeId: id }));
    return id;
  },

  openDocument: (info) => {
    const existingId = get().findByPath(info.path);
    if (existingId) {
      set({ activeId: existingId });
      return { id: existingId, existing: true };
    }
    const id = `doc-${++idSeq}`;
    const filename = basename(info.path);
    const doc: DocMeta = {
      id,
      title: info.title || filename,
      languageId: languageIdForFilename(filename),
      filename,
      path: info.path,
      encoding: info.encoding,
      eol: info.eol,
      mtimeMs: info.mtimeMs,
      readonly: info.readonly,
      dirty: false,
      conflict: false,
    };
    set((s) => ({ docs: { ...s.docs, [id]: doc }, order: [...s.order, id], activeId: id }));
    return { id, existing: false };
  },

  closeDocument: (id) => {
    const { order, activeId } = get();
    const index = order.indexOf(id);
    if (index === -1) return;
    const nextOrder = order.filter((x) => x !== id);
    let nextActive = activeId;
    if (activeId === id) {
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
  markSaved: (id, info) =>
    set((s) => {
      const doc = s.docs[id];
      if (!doc) return s;
      const filename = basename(info.path);
      return {
        docs: {
          ...s.docs,
          [id]: {
            ...doc,
            path: info.path,
            filename,
            title: filename,
            languageId: languageIdForFilename(filename),
            mtimeMs: info.mtimeMs,
            dirty: false,
            conflict: false,
          },
        },
      };
    }),
  setConflict: (id, conflict) =>
    set((s) => (s.docs[id] ? { docs: { ...s.docs, [id]: { ...s.docs[id], conflict } } } : s)),
  findByPath: (path) => Object.values(get().docs).find((d) => d.path === path)?.id,
}));
