import { useEffect, useRef, type MouseEvent } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useDocumentsStore } from "../state/documents.ts";
import { useRenderStore } from "../state/render.ts";
import { registerPreview, syncEditorToPreview } from "./scrollSync.ts";
import { FrontmatterPanel } from "./FrontmatterPanel.tsx";

/**
 * The preview must never navigate the app window: that would unload the editor and
 * every unsaved buffer, and render an arbitrary page inside the app's chrome.
 * In-document anchors scroll; web links open in the system browser; everything else
 * is ignored.
 */
function onPreviewClick(e: MouseEvent<HTMLElement>): void {
  const link = (e.target as Element).closest("a");
  if (!link) return;
  e.preventDefault();
  const href = link.getAttribute("href") ?? "";
  if (href.startsWith("#")) {
    // Not scrollIntoView: that also scrolls every overflow-hidden ancestor, shifting
    // the whole app shell. Only the preview's own scroll container may move.
    const pane = e.currentTarget.closest(".preview-pane");
    const target = document.getElementById(decodeURIComponent(href.slice(1)));
    if (pane && target) {
      pane.scrollTop += target.getBoundingClientRect().top - pane.getBoundingClientRect().top;
    }
  } else if (/^(https?|mailto):/i.test(href)) {
    void openUrl(href).catch(() => {
      /* no Tauri runtime (browser dev) — ignore */
    });
  }
}

/**
 * Renders the active document's sanitized HTML. The HTML is produced and
 * sanitized in the worker (docs/08 §4), so injecting it here is safe. Registers
 * its scroll container for source<->preview sync.
 */
export function PreviewPane({ syncScroll = false }: { syncScroll?: boolean }) {
  const activeId = useDocumentsStore((s) => s.activeId);
  const html = useRenderStore((s) => (activeId ? (s.results[activeId]?.html ?? "") : ""));
  const frontmatter = useRenderStore((s) =>
    activeId ? (s.results[activeId]?.frontmatter ?? null) : null,
  );
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
        <>
          {frontmatter ? <FrontmatterPanel frontmatter={frontmatter} /> : null}
          <article
            className="markdown-body"
            onClick={onPreviewClick}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </>
      ) : (
        <p className="preview-pane__empty">Nothing to preview yet.</p>
      )}
    </div>
  );
}
