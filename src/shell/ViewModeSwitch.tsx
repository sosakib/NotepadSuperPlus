import { useUiStore, type ViewMode } from "../state/ui.ts";

const MODES: { id: ViewMode; label: string; key: string }[] = [
  { id: "source", label: "Source", key: "Ctrl+1" },
  { id: "preview", label: "Preview", key: "Ctrl+2" },
  { id: "split", label: "Split", key: "Ctrl+3" },
];

/** Segmented control for the three editing modes. */
export function ViewModeSwitch() {
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);

  return (
    <div className="segmented" role="tablist" aria-label="View mode">
      {MODES.map(({ id, label, key }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={viewMode === id}
          title={`${label} (${key})`}
          className={`segmented__item${viewMode === id ? " segmented__item--active" : ""}`}
          onClick={() => setViewMode(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
