import { ListTree } from "lucide-react";
import { EmptyState } from "../components/EmptyState.tsx";
import { useDocumentsStore } from "../state/documents.ts";
import { useRenderStore } from "../state/render.ts";
import { revealSourceLine } from "../markdown/scrollSync.ts";

/** Structure View: the active document's live heading outline (docs/01 §4). */
export function OutlinePanel() {
  const activeId = useDocumentsStore((s) => s.activeId);
  const outline = useRenderStore((s) => (activeId ? (s.results[activeId]?.outline ?? []) : []));

  if (!activeId || outline.length === 0) {
    return (
      <EmptyState
        icon={<ListTree size={28} strokeWidth={1.5} />}
        title="No headings"
        hint="Document headings will appear here."
      />
    );
  }

  return (
    <ul className="outline" role="tree" aria-label="Document outline">
      {outline.map((h, i) => (
        <li key={`${h.id}-${i}`} role="treeitem" aria-level={h.depth}>
          <button
            type="button"
            className="outline__item"
            style={{ paddingLeft: `${(h.depth - 1) * 14 + 8}px` }}
            onClick={() => revealSourceLine(h.line)}
            title={h.text}
          >
            {h.text}
          </button>
        </li>
      ))}
    </ul>
  );
}
