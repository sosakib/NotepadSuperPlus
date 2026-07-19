import { create } from "zustand";
import type { OutlineHeading } from "../markdown/render.ts";

/** Latest rendered output per document, fed by the render controller/worker. */
export interface DocRender {
  version: number;
  html: string;
  outline: OutlineHeading[];
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
