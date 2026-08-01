import { useUiStore, type ViewMode } from "../state/ui.ts";
import { useDocumentsStore } from "../state/documents.ts";
import { isMarkdownFilename } from "../editor/languageLabels.ts";

const MODES: { id: ViewMode; label: string; key: string }[] = [
  { id: "source", label: "Source", key: "Ctrl+1" },
  { id: "preview", label: "Preview", key: "Ctrl+2" },
  { id: "split", label: "Split", key: "Ctrl+3" },
];

/**
 * Segmented control for the three editing modes.
 *
 * Preview and Split are disabled for non-Markdown documents. `EditorArea` already forces
 * Source for those, so leaving the buttons enabled would offer a control that visibly does
 * nothing — worse than saying why. The title attribute carries the reason, since a disabled
 * button has no other way to explain itself.
 */
export function ViewModeSwitch() {
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);
  const activeId = useDocumentsStore((s) => s.activeId);
  const isMarkdown = useDocumentsStore((s) =>
    activeId ? isMarkdownFilename(s.docs[activeId]?.filename ?? "") : true,
  );

  const effective: ViewMode = isMarkdown ? viewMode : "source";

  return (
    <div className="segmented" role="tablist" aria-label="View mode">
      {MODES.map(({ id, label, key }) => {
        const disabled = !isMarkdown && id !== "source";
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={effective === id}
            disabled={disabled}
            title={disabled ? `${label} is available for Markdown documents` : `${label} (${key})`}
            className={`segmented__item${effective === id ? " segmented__item--active" : ""}`}
            onClick={() => setViewMode(id)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
