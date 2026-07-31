import { Suspense, lazy, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { useUiStore } from "../state/ui.ts";
import { useDocumentsStore } from "../state/documents.ts";
import { WelcomeScreen } from "../components/WelcomeScreen.tsx";
import { Button } from "../components/Button.tsx";
import { TabBar } from "./TabBar.tsx";
import { getDocText } from "../editor/editorRegistry.ts";
import { renderController } from "../markdown/renderController.ts";
import { useRenderStore } from "../state/render.ts";
import { reloadPath } from "../actions/fileActions.ts";

/*
 * The editor panes are the two heaviest graphs in the app — CodeMirror (~560 kB) and
 * the Markdown renderer. A cold start with no document shows only the welcome screen,
 * so loading either of them eagerly is work done for a view nobody is looking at.
 *
 * `editorRegistry` above is safe to import eagerly: its CodeMirror imports are
 * `import type` only, so nothing from the editor reaches the initial chunk.
 */
const SourcePane = lazy(() =>
  import("../editor/SourcePane.tsx").then((m) => ({ default: m.SourcePane })),
);
const PreviewPane = lazy(() =>
  import("../markdown/PreviewPane.tsx").then((m) => ({ default: m.PreviewPane })),
);
const SplitContainer = lazy(() =>
  import("./SplitContainer.tsx").then((m) => ({ default: m.SplitContainer })),
);

function ConflictBanner({ docId }: { docId: string }) {
  const doc = useDocumentsStore((s) => s.docs[docId]);
  const setConflict = useDocumentsStore((s) => s.setConflict);
  const markDirty = useDocumentsStore((s) => s.markDirty);
  if (!doc?.conflict) return null;
  return (
    <div className="conflict-banner" role="alert">
      <AlertTriangle size={16} />
      <span>This file changed on disk.</span>
      <div className="conflict-banner__actions">
        <Button variant="subtle" onClick={() => doc.path && void reloadPath(docId, doc.path)}>
          Reload
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setConflict(docId, false);
            markDirty(docId, true);
          }}
        >
          Keep my changes
        </Button>
      </div>
    </div>
  );
}

/** Editor area: tab strip plus source / preview / split for the active document. */
export function EditorArea() {
  const viewMode = useUiStore((s) => s.viewMode);
  const activeId = useDocumentsStore((s) => s.activeId);

  // Ensure the active document has a render so preview and outline populate even
  // without an edit (e.g. after switching tabs or into preview/split). A document
  // that already has output is left alone — re-parsing it would be pure waste.
  useEffect(() => {
    if (!activeId) return;
    if (useRenderStore.getState().results[activeId]) return;
    renderController.requestRender(activeId, () => getDocText(activeId));
  }, [activeId, viewMode]);

  return (
    <section className="editor-area" aria-label="Editor">
      <TabBar />
      {activeId ? <ConflictBanner docId={activeId} /> : null}
      <div className={`editor-surface editor-surface--${viewMode}`}>
        {activeId === null ? (
          <WelcomeScreen />
        ) : (
          // Chunks are served from the local filesystem, so this resolves in a frame
          // or two. A spinner would flash rather than inform; an empty surface simply
          // stays the editor background colour.
          <Suspense fallback={<div className="editor-pane-loading" aria-hidden />}>
            {viewMode === "preview" ? (
              <PreviewPane />
            ) : viewMode === "split" ? (
              <SplitContainer />
            ) : (
              <SourcePane />
            )}
          </Suspense>
        )}
      </div>
    </section>
  );
}
