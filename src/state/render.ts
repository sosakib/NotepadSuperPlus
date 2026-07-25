import { create } from "zustand";
import type { OutlineHeading, DocStats } from "../markdown/render.ts";
import type { Frontmatter } from "../markdown/frontmatter.ts";

/** Latest rendered output per document, fed by the render controller/worker. */
export interface DocRender {
  version: number;
  html: string;
  outline: OutlineHeading[];
  /** Word/char counts computed in the worker (never on the typing path). */
  stats: DocStats;
  /** Parsed YAML frontmatter, or null when the document has none (FR-3.3). */
  frontmatter: Frontmatter | null;
}

interface RenderState {
  results: Record<string, DocRender>;
  setResult: (docId: string, result: DocRender) => void;
  clear: (docId: string) => void;
}

export const useRenderStore = create<RenderState>((set) => ({
  results: {},
  setResult: (docId, result) =>
    set((s) => {
      // Ignore stale renders (user typed again before this one returned).
      const current = s.results[docId];
      if (current && current.version > result.version) return s;
      return { results: { ...s.results, [docId]: result } };
    }),
  clear: (docId) =>
    set((s) => ({
      results: Object.fromEntries(Object.entries(s.results).filter(([key]) => key !== docId)),
    })),
}));
