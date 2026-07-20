import { FileText, Plus, FolderOpen, Command, Sparkles, BookOpen, Clock } from "lucide-react";
import { useDocumentsStore } from "../state/documents.ts";
import { useUiStore } from "../state/ui.ts";
import { openFile } from "../actions/fileActions.ts";

export function WelcomeScreen() {
  const newDocument = useDocumentsStore((s) => s.newDocument);
  const togglePalette = useUiStore((s) => s.togglePalette);
  const openDocument = useDocumentsStore((s) => s.openDocument);

  // Get sample recent file suggestions or past files if available
  const sampleQuickDocs = [
    { title: "Project Vision & Roadmap", path: "docs/00_Project_Vision.md" },
    { title: "UI/UX Guidelines", path: "docs/04_UI_UX_Guidelines.md" },
    { title: "System Architecture", path: "docs/03_System_Architecture.md" },
  ];

  return (
    <div className="welcome-screen">
      <div className="welcome-hero">
        <div className="welcome-hero__badge">
          <Sparkles size={14} />
          <span>Notepad Super Plus Desktop</span>
        </div>
        <h1 className="welcome-hero__title">Focus. Read. Write. Organize.</h1>
        <p className="welcome-hero__subtitle">
          An elegant, lightweight desktop editor for Markdown files. Designed for engineers,
          researchers, and technical writers.
        </p>

        <div className="welcome-actions">
          <button className="welcome-btn welcome-btn--primary" onClick={() => newDocument()}>
            <Plus size={16} />
            <span>New Document</span>
          </button>
          <button className="welcome-btn welcome-btn--secondary" onClick={() => void openFile()}>
            <FolderOpen size={16} />
            <span>Open File</span>
          </button>
          <button className="welcome-btn welcome-btn--ghost" onClick={() => togglePalette()}>
            <Command size={16} />
            <span>Command Palette</span>
          </button>
        </div>
      </div>

      <div className="welcome-grid">
        <div className="welcome-card">
          <div className="welcome-card__header">
            <BookOpen size={18} className="welcome-card__icon" />
            <h3 className="welcome-card__title">Quick Documentation</h3>
          </div>
          <ul className="welcome-card__list">
            {sampleQuickDocs.map((item) => (
              <li key={item.path}>
                <button
                  className="welcome-card__item"
                  onClick={() => {
                    openDocument({
                      path: item.path,
                      title: item.title,
                      encoding: "utf-8",
                      eol: "lf",
                      mtimeMs: Date.now(),
                      readonly: false,
                    });
                  }}
                >
                  <FileText size={14} />
                  <span>{item.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="welcome-card">
          <div className="welcome-card__header">
            <Clock size={18} className="welcome-card__icon" />
            <h3 className="welcome-card__title">Keyboard Shortcuts</h3>
          </div>
          <div className="welcome-shortcuts">
            <div className="welcome-shortcut">
              <span>Command Palette</span>
              <kbd className="kbd">Ctrl+Shift+P</kbd>
            </div>
            <div className="welcome-shortcut">
              <span>Toggle Sidebar</span>
              <kbd className="kbd">Ctrl+B</kbd>
            </div>
            <div className="welcome-shortcut">
              <span>Split Mode</span>
              <kbd className="kbd">Ctrl+3</kbd>
            </div>
            <div className="welcome-shortcut">
              <span>Quick Settings</span>
              <kbd className="kbd">Ctrl+,</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
