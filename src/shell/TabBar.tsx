import { X, Plus } from "lucide-react";
import { useDocumentsStore } from "../state/documents.ts";
import { closeFile } from "../actions/fileActions.ts";

/** Editor tab strip: one tab per open document, plus a new-document button. */
export function TabBar() {
  const order = useDocumentsStore((s) => s.order);
  const docs = useDocumentsStore((s) => s.docs);
  const activeId = useDocumentsStore((s) => s.activeId);
  const setActive = useDocumentsStore((s) => s.setActive);
  const newDocument = useDocumentsStore((s) => s.newDocument);

  return (
    <div className="tabbar" role="tablist" aria-label="Open files">
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
              tabIndex={0}
              className={`tab${active ? " tab--active" : ""}`}
              onClick={() => setActive(id)}
              onAuxClick={(e) => {
                if (e.button === 1) void closeFile(id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setActive(id);
              }}
            >
              <span className={`tab__dot${doc.dirty ? " tab__dot--dirty" : ""}`} aria-hidden />
              <span className="tab__title">{doc.title}</span>
              <button
                type="button"
                className="tab__close"
                aria-label={`Close ${doc.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  void closeFile(id);
                }}
              >
                <X size={13} />
              </button>
            </div>
          );
        })
      )}
      <button
        type="button"
        className="tabbar__new"
        aria-label="New file (Ctrl+N)"
        onClick={() => newDocument()}
      >
        <Plus size={15} />
      </button>
    </div>
  );
}
