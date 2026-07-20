import { FileText, Plus, FolderOpen, Command, Sparkles, Clock, Keyboard } from "lucide-react";
import { useDocumentsStore } from "../state/documents.ts";
import { useUiStore } from "../state/ui.ts";
import { openFile, openPath } from "../actions/fileActions.ts";
import { useRecentFiles } from "../actions/useRecentFiles.ts";
import { registry } from "../commands/index.ts";
import { Kbd } from "./Kbd.tsx";

const basename = (p: string): string => p.split(/[\\/]/).pop() ?? p;

/** Shortcuts surfaced on the welcome screen, resolved from the command registry
 * so the labels can never drift from the real keymap. */
const FEATURED_COMMANDS = ["palette.toggle", "view.toggleSidebar", "view.split", "file.open"];

export function WelcomeScreen() {
  const newDocument = useDocumentsStore((s) => s.newDocument);
  const togglePalette = useUiStore((s) => s.togglePalette);
  const recent = useRecentFiles(5);

  const shortcuts = FEATURED_COMMANDS.flatMap((id) => {
    const cmd = registry.get(id);
    const chord = cmd?.defaultKeys?.[0];
    return cmd && chord ? [{ id, title: cmd.title, chord }] : [];
  });

  return (
    <div className="welcome-screen">
      <div className="welcome-hero">
        <div className="welcome-hero__badge">
          <Sparkles size={14} />
          <span>Notepad Super Plus</span>
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
            <Clock size={18} className="welcome-card__icon" />
            <h3 className="welcome-card__title">Recent Files</h3>
          </div>
          {recent.length === 0 ? (
            <p className="welcome-card__empty">
              Files you open or save will show up here for quick access.
            </p>
          ) : (
            <ul className="welcome-card__list">
              {recent.map((path) => (
                <li key={path}>
                  <button
                    className="welcome-card__item"
                    title={path}
                    onClick={() => void openPath(path)}
                  >
                    <FileText size={14} />
                    <span className="welcome-card__item-name">{basename(path)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="welcome-card">
          <div className="welcome-card__header">
            <Keyboard size={18} className="welcome-card__icon" />
            <h3 className="welcome-card__title">Keyboard Shortcuts</h3>
          </div>
          <div className="welcome-shortcuts">
            {shortcuts.map((s) => (
              <div key={s.id} className="welcome-shortcut">
                <span>{s.title}</span>
                <Kbd chord={s.chord} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
