import { useState } from "react";
import { X, Palette, Type, Keyboard, Info } from "lucide-react";
import { useUiStore } from "../state/ui.ts";
import { IconButton } from "../components/IconButton.tsx";
import { useDialogDismiss } from "../components/useDialogDismiss.ts";
import { AppearanceTab } from "./AppearanceTab.tsx";
import { EditorTab } from "./EditorTab.tsx";
import { ShortcutsTab } from "./ShortcutsTab.tsx";
import { AboutTab } from "./AboutTab.tsx";

const TABS = [
  { id: "appearance", label: "Appearance", icon: Palette, Panel: AppearanceTab },
  { id: "editor", label: "Editor", icon: Type, Panel: EditorTab },
  { id: "shortcuts", label: "Shortcuts", icon: Keyboard, Panel: ShortcutsTab },
  { id: "about", label: "About", icon: Info, Panel: AboutTab },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Preferences dialog. Each tab is its own component; this file owns only the
 * chrome, tab state, and dismissal behavior. */
export function SettingsDialog() {
  const settingsOpen = useUiStore((s) => s.settingsOpen);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const [activeTab, setActiveTab] = useState<TabId>("appearance");
  const panelRef = useDialogDismiss(settingsOpen, () => setSettingsOpen(false));

  if (!settingsOpen) return null;

  const Panel = TABS.find((t) => t.id === activeTab)?.Panel ?? AppearanceTab;

  return (
    <div className="modal-overlay" onClick={() => setSettingsOpen(false)}>
      <div
        ref={panelRef}
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Preferences"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="settings-modal__header">
          <div className="settings-modal__title-group">
            <h2 className="settings-modal__title">Preferences</h2>
            <span className="settings-modal__subtitle">Settings are saved automatically</span>
          </div>
          <IconButton label="Close preferences" onClick={() => setSettingsOpen(false)}>
            <X size={18} />
          </IconButton>
        </header>

        <div className="settings-modal__body">
          <nav className="settings-modal__tabs" role="tablist" aria-label="Settings sections">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activeTab === id}
                className={`settings-modal__tab${activeTab === id ? " is-active" : ""}`}
                onClick={() => setActiveTab(id)}
              >
                <Icon size={16} aria-hidden />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="settings-modal__content" role="tabpanel">
            <Panel />
          </div>
        </div>
      </div>
    </div>
  );
}
