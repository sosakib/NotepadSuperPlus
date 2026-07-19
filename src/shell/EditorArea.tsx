import { FileText } from "lucide-react";
import { useUiStore } from "../state/ui.ts";
import { EmptyState } from "../components/EmptyState.tsx";

/** Editor area: tab bar placeholder and the (empty) editing surface for Stage 2. */
export function EditorArea() {
  const viewMode = useUiStore((s) => s.viewMode);

  return (
    <section className="editor-area" aria-label="Editor">
      <div className="tabbar" role="tablist" aria-label="Open files">
        <span className="tabbar__empty">No open files</span>
      </div>
      <div className={`editor-surface editor-surface--${viewMode}`}>
        <EmptyState
          icon={<FileText size={40} strokeWidth={1.5} />}
          title="No file open"
          hint="Open a Markdown file to start — editor arrives in Stage 3."
        />
      </div>
    </section>
  );
}
