import { FileText } from "lucide-react";
import { useUiStore } from "../state/ui.ts";
import { useDocumentsStore } from "../state/documents.ts";
import { EmptyState } from "../components/EmptyState.tsx";
import { Button } from "../components/Button.tsx";
import { TabBar } from "./TabBar.tsx";
import { SourcePane } from "../editor/SourcePane.tsx";

/** Editor area: tab strip plus the active document's editing surface. */
export function EditorArea() {
  const viewMode = useUiStore((s) => s.viewMode);
  const hasActive = useDocumentsStore((s) => s.activeId !== null);
  const newDocument = useDocumentsStore((s) => s.newDocument);

  return (
    <section className="editor-area" aria-label="Editor">
      <TabBar />
      <div className={`editor-surface editor-surface--${viewMode}`}>
        {hasActive ? (
          <SourcePane />
        ) : (
          <EmptyState
            icon={<FileText size={40} strokeWidth={1.5} />}
            title="No file open"
            hint="Create a new document to start editing. Opening files from disk arrives in Stage 5."
          >
            <Button onClick={() => newDocument()}>New file</Button>
          </EmptyState>
        )}
      </div>
    </section>
  );
}
