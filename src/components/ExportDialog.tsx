import { X, Download, FileText, Code, Globe, Check } from "lucide-react";
import { useState } from "react";
import { useUiStore } from "../state/ui.ts";
import { useDocumentsStore } from "../state/documents.ts";
import { getDocText } from "../editor/editorRegistry.ts";
import { IconButton } from "./IconButton.tsx";
import { Button } from "./Button.tsx";

export function ExportDialog() {
  const exportOpen = useUiStore((s) => s.exportOpen);
  const setExportOpen = useUiStore((s) => s.setExportOpen);
  const activeId = useDocumentsStore((s) => s.activeId);
  const doc = useDocumentsStore((s) => (activeId ? s.docs[activeId] : null));

  const [format, setFormat] = useState<"html" | "txt" | "md">("html");
  const [exported, setExported] = useState(false);

  if (!exportOpen) return null;

  const handleExport = () => {
    if (!activeId) return;
    const content = getDocText(activeId);
    let blobContent = content;
    let mimeType = "text/markdown";
    let extension = ".md";

    if (format === "html") {
      blobContent = `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n<title>${doc?.title || "Document"}</title>\n<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;line-height:1.6;}</style>\n</head>\n<body>\n${content}\n</body>\n</html>`;
      mimeType = "text/html";
      extension = ".html";
    } else if (format === "txt") {
      mimeType = "text/plain";
      extension = ".txt";
    }

    const blob = new Blob([blobContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (doc?.title || "document").replace(/\.md$/, "") + extension;
    a.click();
    URL.revokeObjectURL(url);

    setExported(true);
    setTimeout(() => {
      setExported(false);
      setExportOpen(false);
    }, 1200);
  };

  return (
    <div className="modal-overlay" onClick={() => setExportOpen(false)} role="dialog" aria-label="Export Document">
      <div className="export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="export-modal__header">
          <div className="export-modal__title-group">
            <h2 className="export-modal__title">Export Document</h2>
            <span className="export-modal__subtitle">{doc?.title || "Untitled Document"}</span>
          </div>
          <IconButton label="Close Export" onClick={() => setExportOpen(false)}>
            <X size={18} />
          </IconButton>
        </div>

        <div className="export-modal__body">
          <label className="export-modal__label">Choose Output Format</label>

          <div className="export-options">
            <button
              className={`export-card ${format === "html" ? "is-selected" : ""}`}
              onClick={() => setFormat("html")}
            >
              <Globe size={24} className="export-card__icon" />
              <div className="export-card__text">
                <span className="export-card__title">HTML Webpage (.html)</span>
                <span className="export-card__desc">Standalone styled HTML page for publishing</span>
              </div>
            </button>

            <button
              className={`export-card ${format === "md" ? "is-selected" : ""}`}
              onClick={() => setFormat("md")}
            >
              <Code size={24} className="export-card__icon" />
              <div className="export-card__text">
                <span className="export-card__title">Markdown File (.md)</span>
                <span className="export-card__desc">Clean standard Markdown source file</span>
              </div>
            </button>

            <button
              className={`export-card ${format === "txt" ? "is-selected" : ""}`}
              onClick={() => setFormat("txt")}
            >
              <FileText size={24} className="export-card__icon" />
              <div className="export-card__text">
                <span className="export-card__title">Plain Text (.txt)</span>
                <span className="export-card__desc">Raw text output suitable for notes</span>
              </div>
            </button>
          </div>
        </div>

        <div className="export-modal__footer">
          <Button variant="ghost" onClick={() => setExportOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={!activeId || exported}>
            {exported ? (
              <>
                <Check size={16} /> Exported!
              </>
            ) : (
              <>
                <Download size={16} /> Export Now
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
