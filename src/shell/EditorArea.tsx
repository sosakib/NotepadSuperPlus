import { useEffect } from "react";
import { FileText } from "lucide-react";
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
      <div className={`editor-surface editor-surface--${viewMode}`}>
        {activeId === null ? (
          <EmptyState
            icon={<FileText size={40} strokeWidth={1.5} />}
            title="No file open"
            hint="Create a new document to start editing. Opening files from disk arrives in Stage 5."
          >
            <Button onClick={() => newDocument()}>New file</Button>
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
