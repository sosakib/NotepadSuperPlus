import { useEffect } from "react";
import { FileText, AlertTriangle } from "lucide-react";
import { useUiStore } from "../state/ui.ts";
import { useDocumentsStore } from "../state/documents.ts";
import { EmptyState } from "../components/EmptyState.tsx";
import { Button } from "../components/Button.tsx";
import { TabBar } from "./TabBar.tsx";
import { SplitContainer } from "./SplitContainer.tsx";
import { SourcePane } from "../editor/SourcePane.tsx";
import { getDocText } from "../editor/editorRegistry.ts";
import { PreviewPane } from "../markdown/PreviewPane.tsx";
import { renderController } from "../markdown/renderController.ts";
import { reloadPath, openFile } from "../actions/fileActions.ts";

function ConflictBanner({ docId }: { docId: string }) {
  const doc = useDocumentsStore((s) => s.docs[docId]);
  const setConflict = useDocumentsStore((s) => s.setConflict);
  const markDirty = useDocumentsStore((s) => s.markDirty);
  if (!doc?.conflict) return null;
  return (
    <div className="conflict-banner" role="alert">
      <AlertTriangle size={15} />
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
  const newDocument = useDocumentsStore((s) => s.newDocument);

  // Ensure the active document has a fresh render so preview and outline populate,
  // even without an edit (e.g. after switching tabs or into preview/split).
  useEffect(() => {
    if (activeId) renderController.requestRender(activeId, getDocText(activeId));
  }, [activeId, viewMode]);

  return (
    <section className="editor-area" aria-label="Editor">
      <TabBar />
      {activeId ? <ConflictBanner docId={activeId} /> : null}
      <div className={`editor-surface editor-surface--${viewMode}`}>
        {activeId === null ? (
          <EmptyState
            icon={<FileText size={40} strokeWidth={1.5} />}
            title="No file open"
            hint="Open a Markdown file or create a new document to start editing."
          >
            <div className="empty-state__buttons">
              <Button onClick={() => void openFile()}>Open file</Button>
              <Button variant="subtle" onClick={() => newDocument()}>
                New file
              </Button>
            </div>
          </EmptyState>
        ) : viewMode === "preview" ? (
          <PreviewPane />
        ) : viewMode === "split" ? (
          <SplitContainer />
        ) : (
          <SourcePane />
        )}
      </div>
    </section>
  );
}
