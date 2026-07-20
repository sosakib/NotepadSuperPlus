import { useEffect, useRef } from "react";
import { X, Plus, FileText } from "lucide-react";
import { useDocumentsStore } from "../state/documents.ts";
import { closeFile } from "../actions/fileActions.ts";

/**
 * Editor tab strip: one tab per open document, plus a new-document button.
 *
 * The dirty indicator and the close button share one slot (VS Code / Zed
 * behavior): a modified document shows a dot that becomes a close button on
 * hover or focus, so the tab's width never shifts as state changes.
 */
export function TabBar() {
  const order = useDocumentsStore((s) => s.order);
  const docs = useDocumentsStore((s) => s.docs);
  const activeId = useDocumentsStore((s) => s.activeId);
  const setActive = useDocumentsStore((s) => s.setActive);
  const newDocument = useDocumentsStore((s) => s.newDocument);
  const stripRef = useRef<HTMLDivElement>(null);

  // Keep the active tab visible when it changes from outside the strip
  // (command palette, search hit, Explorer click).
  useEffect(() => {
    stripRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeId]);

  return (
    <div className="tabbar">
      <div className="tabbar__strip" ref={stripRef} role="tablist" aria-label="Open files">
        {order.length === 0 ? (
          <span className="tabbar__empty">No open files</span>
        ) : (
          order.map((id) => {
            const doc = docs[id];
            if (!doc) return null;
            const active = id === activeId;
            return (
              <div
                key={id}
                role="tab"
                aria-selected={active}
                data-active={active}
                tabIndex={active ? 0 : -1}
                title={doc.path ?? doc.title}
                className={`tab${active ? " tab--active" : ""}${doc.dirty ? " tab--dirty" : ""}`}
                onClick={() => setActive(id)}
                onAuxClick={(e) => {
                  if (e.button === 1) {
                    e.preventDefault();
                    void closeFile(id);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActive(id);
                  }
                }}
              >
                <FileText className="tab__icon" size={14} strokeWidth={1.75} aria-hidden />
                <span className="tab__title">{doc.title}</span>
                <span className="tab__slot">
                  <span className="tab__dot" aria-hidden />
                  <button
                    type="button"
                    className="tab__close"
                    aria-label={`Close ${doc.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      void closeFile(id);
                    }}
                  >
                    <X size={14} strokeWidth={2.25} />
                  </button>
                </span>
              </div>
            );
          })
        )}
      </div>
      <button
        type="button"
        className="tabbar__new"
        aria-label="New file (Ctrl+N)"
        title="New file (Ctrl+N)"
        onClick={() => newDocument()}
      >
        <Plus size={16} strokeWidth={2.25} />
      </button>
    </div>
  );
}
