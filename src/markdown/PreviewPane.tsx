import { useEffect, useRef } from "react";
import { useDocumentsStore } from "../state/documents.ts";
import { useRenderStore } from "../state/render.ts";
import { registerPreview, syncEditorToPreview } from "./scrollSync.ts";

/**
 * Renders the active document's sanitized HTML. The HTML is produced and
 * sanitized in the worker (docs/08 §4), so injecting it here is safe. Registers
 * its scroll container for source<->preview sync.
 */
export function PreviewPane({ syncScroll = false }: { syncScroll?: boolean }) {
  const activeId = useDocumentsStore((s) => s.activeId);
  const html = useRenderStore((s) => (activeId ? (s.results[activeId]?.html ?? "") : ""));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerPreview(scrollRef.current);
    return () => registerPreview(null);
  }, []);

  return (
    <div
      ref={scrollRef}
      className="preview-pane"
      onScroll={syncScroll ? syncEditorToPreview : undefined}
    >
      {html ? (
        <article className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <p className="preview-pane__empty">Nothing to preview yet.</p>
      )}
    </div>
  );
}
