import { create } from "zustand";
import type { Entry } from "../ipc/workspace.ts";
import { basename } from "../utils/path.ts";

/**
 * Workspace tree state. Children are cached per directory and fetched lazily on
 * expand, so opening a folder with thousands of files stays instant (docs/07 §5).
 */
interface WorkspaceState {
  root: string | null;
  rootName: string | null;
  /** directory path -> its entries */
  children: Record<string, Entry[]>;
  expanded: Record<string, boolean>;
  showHidden: boolean;

  setRoot: (root: string, entries: Entry[]) => void;
  setChildren: (path: string, entries: Entry[]) => void;
  toggleExpanded: (path: string) => void;
  setExpanded: (path: string, open: boolean) => void;
  closeWorkspace: () => void;
  toggleHidden: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  root: null,
  rootName: null,
  children: {},
  expanded: {},
  showHidden: false,

  setRoot: (root, entries) =>
    set({
      root,
      rootName: basename(root),
      children: { [root]: entries },
      expanded: { [root]: true },
    }),
  setChildren: (path, entries) => set((s) => ({ children: { ...s.children, [path]: entries } })),
  toggleExpanded: (path) =>
    set((s) => ({ expanded: { ...s.expanded, [path]: !s.expanded[path] } })),
  setExpanded: (path, open) => set((s) => ({ expanded: { ...s.expanded, [path]: open } })),
  closeWorkspace: () => set({ root: null, rootName: null, children: {}, expanded: {} }),
  toggleHidden: () => set((s) => ({ showHidden: !s.showHidden })),
}));
