import { useEffect, useRef } from "react";
import { useUiStore } from "../state/ui.ts";
import { Resizer } from "../components/Resizer.tsx";
import { SourcePane } from "../editor/SourcePane.tsx";
import { getActiveView } from "../editor/editorRegistry.ts";
import { PreviewPane } from "../markdown/PreviewPane.tsx";
import { syncPreviewToEditor } from "../markdown/scrollSync.ts";

/** Split view: source editor and live preview side by side with synced scrolling. */
export function SplitContainer() {
  const splitRatio = useUiStore((s) => s.splitRatio);
  const setSplitRatio = useUiStore((s) => s.setSplitRatio);
  const containerRef = useRef<HTMLDivElement>(null);

  // Attach a scroll listener to the editor once its view exists (leader = editor).
  useEffect(() => {
    let view = getActiveView();
    let raf = 0;
    const attach = (): void => {
      view = getActiveView();
      if (view) view.scrollDOM.addEventListener("scroll", syncPreviewToEditor, { passive: true });
      else raf = requestAnimationFrame(attach);
    };
    attach();
    return () => {
      if (view) view.scrollDOM.removeEventListener("scroll", syncPreviewToEditor);
      cancelAnimationFrame(raf);
    };
  }, []);

  const handleResize = (clientX: number): void => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSplitRatio((clientX - rect.left) / rect.width);
  };

  return (
    <div ref={containerRef} className="split">
      <div className="split__pane" style={{ flexBasis: `${splitRatio * 100}%` }}>
        <SourcePane />
      </div>
      <Resizer
        label="Resize split"
        onResize={handleResize}
        onDoubleClick={() => setSplitRatio(0.5)}
      />
      <div className="split__pane" style={{ flexBasis: `${(1 - splitRatio) * 100}%` }}>
        <PreviewPane syncScroll />
      </div>
    </div>
  );
}
