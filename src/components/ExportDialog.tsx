import { useState } from "react";
import { X, Download, FileText, Code, Globe, Check } from "lucide-react";
import { useUiStore } from "../state/ui.ts";
import { useDocumentsStore } from "../state/documents.ts";
import { exportDocument, type ExportFormat } from "../actions/exportActions.ts";
import { useDialogDismiss } from "./useDialogDismiss.ts";
import { IconButton } from "./IconButton.tsx";
import { Button } from "./Button.tsx";

const FORMATS: { id: ExportFormat; icon: typeof Globe; title: string; desc: string }[] = [
  {
    id: "html",
    icon: Globe,
    title: "HTML Webpage (.html)",
    desc: "Rendered, standalone styled page for publishing",
  },
  { id: "md", icon: Code, title: "Markdown File (.md)", desc: "Clean standard Markdown source" },
  {
    id: "txt",
    icon: FileText,
    title: "Plain Text (.txt)",
    desc: "Raw text output suitable for notes",
  },
];

export function ExportDialog() {
  const exportOpen = useUiStore((s) => s.exportOpen);
  const setExportOpen = useUiStore((s) => s.setExportOpen);
  const activeId = useDocumentsStore((s) => s.activeId);
  const doc = useDocumentsStore((s) => (activeId ? s.docs[activeId] : null));

  const [format, setFormat] = useState<ExportFormat>("html");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const close = (): void => setExportOpen(false);
  const panelRef = useDialogDismiss(exportOpen, close);

  if (!exportOpen) return null;

  const handleExport = async (): Promise<void> => {
    setBusy(true);
    const ok = await exportDocument(format);
    setBusy(false);
    if (!ok) return;
    setDone(true);
    setTimeout(() => {
      setDone(false);
      close();
    }, 900);
  };

  return (
    <div className="modal-overlay" onClick={close}>
      <div
        ref={panelRef}
        className="export-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Export document"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="export-modal__header">
          <div className="export-modal__title-group">
            <h2 className="export-modal__title">Export Document</h2>
            <span className="export-modal__subtitle">{doc?.title ?? "Untitled Document"}</span>
          </div>
          <IconButton label="Close export" onClick={close}>
            <X size={18} />
          </IconButton>
        </div>

        <div className="export-modal__body">
          <label className="export-modal__label">Choose output format</label>
          <div className="export-options" role="radiogroup" aria-label="Output format">
            {FORMATS.map(({ id, icon: Icon, title, desc }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={format === id}
                className={`export-card ${format === id ? "is-selected" : ""}`}
                onClick={() => setFormat(id)}
              >
                <Icon size={24} className="export-card__icon" />
                <div className="export-card__text">
                  <span className="export-card__title">{title}</span>
                  <span className="export-card__desc">{desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="export-modal__footer">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button onClick={() => void handleExport()} disabled={!activeId || busy || done}>
            {done ? (
              <>
                <Check size={16} /> Exported
              </>
            ) : (
              <>
                <Download size={16} /> {busy ? "Exporting…" : "Export Now"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
