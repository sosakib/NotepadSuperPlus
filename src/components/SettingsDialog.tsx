import { useState } from "react";
import { X, Palette, Type, Keyboard, Info, Check } from "lucide-react";
import { useUiStore } from "../state/ui.ts";
import type { ThemeId } from "../theme/themes.ts";
import { IconButton } from "./IconButton.tsx";
import { useDialogDismiss } from "./useDialogDismiss.ts";

export function SettingsDialog() {
  const settingsOpen = useUiStore((s) => s.settingsOpen);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const themeSetting = useUiStore((s) => s.themeSetting);
  const resolvedTheme = useUiStore((s) => s.resolvedTheme);
  const setTheme = useUiStore((s) => s.setTheme);
  const wordWrap = useUiStore((s) => s.wordWrap);
  const toggleWordWrap = useUiStore((s) => s.toggleWordWrap);
  const fontFamily = useUiStore((s) => s.fontFamily);
  const setFontFamily = useUiStore((s) => s.setFontFamily);
  const fontSize = useUiStore((s) => s.fontSize);
  const setFontSize = useUiStore((s) => s.setFontSize);

  const [activeTab, setActiveTab] = useState<"appearance" | "editor" | "keyboard" | "about">(
    "appearance",
  );
  const panelRef = useDialogDismiss(settingsOpen, () => setSettingsOpen(false));

  if (!settingsOpen) return null;

  const themeList: { id: ThemeId; name: string; desc: string; bg: string; accent: string }[] = [
    {
      id: "apple-dark",
      name: "Apple Dark",
      desc: "Refined navy & slate dark mode",
      bg: "#0f172a",
      accent: "#3b82f6",
    },
    {
      id: "apple-light",
      name: "Apple Light",
      desc: "Clean crisp light aesthetic",
      bg: "#ffffff",
      accent: "#2563eb",
    },
    {
      id: "midnight-blue",
      name: "Midnight Blue",
      desc: "Deep blue developer theme",
      bg: "#0a0f1d",
      accent: "#38bdf8",
    },
    {
      id: "github",
      name: "GitHub Inspired",
      desc: "Professional docs palette",
      bg: "#0d1117",
      accent: "#2f81f7",
    },
    {
      id: "nord",
      name: "Nord Inspired",
      desc: "Cool arctic dark mode",
      bg: "#2e3440",
      accent: "#88c0d0",
    },
    {
      id: "catppuccin",
      name: "Catppuccin",
      desc: "Soft pastel aesthetic",
      bg: "#1e1e2e",
      accent: "#89b4fa",
    },
    {
      id: "high-contrast",
      name: "High Contrast",
      desc: "Accessibility-first black",
      bg: "#000000",
      accent: "#4cc2ff",
    },
  ];

  return (
    <div className="modal-overlay" onClick={() => setSettingsOpen(false)}>
      <div
        ref={panelRef}
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-modal__header">
          <div className="settings-modal__title-group">
            <h2 className="settings-modal__title">Preferences</h2>
            <span className="settings-modal__subtitle">Customize Notepad Super Plus</span>
          </div>
          <IconButton label="Close Settings" onClick={() => setSettingsOpen(false)}>
            <X size={18} />
          </IconButton>
        </div>

        <div className="settings-modal__body">
          <nav className="settings-modal__tabs">
            <button
              className={`settings-modal__tab ${activeTab === "appearance" ? "is-active" : ""}`}
              onClick={() => setActiveTab("appearance")}
            >
              <Palette size={16} />
              <span>Appearance</span>
            </button>
            <button
              className={`settings-modal__tab ${activeTab === "editor" ? "is-active" : ""}`}
              onClick={() => setActiveTab("editor")}
            >
              <Type size={16} />
              <span>Editor</span>
            </button>
            <button
              className={`settings-modal__tab ${activeTab === "keyboard" ? "is-active" : ""}`}
              onClick={() => setActiveTab("keyboard")}
            >
              <Keyboard size={16} />
              <span>Shortcuts</span>
            </button>
            <button
              className={`settings-modal__tab ${activeTab === "about" ? "is-active" : ""}`}
              onClick={() => setActiveTab("about")}
            >
              <Info size={16} />
              <span>About</span>
            </button>
          </nav>

          <div className="settings-modal__content">
            {activeTab === "appearance" && (
              <div className="settings-section">
                <h3 className="settings-section__title">Theme Engine</h3>
                <p className="settings-section__desc">
                  Select a theme for the application chrome and editor.
                </p>
                <div className="theme-grid">
                  {themeList.map((t) => {
                    const isSelected =
                      themeSetting === t.id ||
                      (themeSetting === "system" && resolvedTheme === t.id);
                    return (
                      <button
                        key={t.id}
                        className={`theme-card ${isSelected ? "is-selected" : ""}`}
                        onClick={() => setTheme(t.id)}
                      >
                        <div className="theme-card__preview" style={{ background: t.bg }}>
                          <span className="theme-card__swatch" style={{ background: t.accent }} />
                          {isSelected && <Check size={14} className="theme-card__check" />}
                        </div>
                        <div className="theme-card__info">
                          <span className="theme-card__name">{t.name}</span>
                          <span className="theme-card__desc">{t.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "editor" && (
              <div className="settings-section">
                <h3 className="settings-section__title">Editor Preferences</h3>
                <div className="setting-row">
                  <div className="setting-row__info">
                    <span className="setting-row__label">Soft Word Wrap</span>
                    <span className="setting-row__hint">
                      Wrap long lines to fit editor viewport width.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle-switch"
                    checked={wordWrap}
                    onChange={() => toggleWordWrap()}
                  />
                </div>
                <div className="setting-row">
                  <div className="setting-row__info">
                    <span className="setting-row__label">Font Family</span>
                    <span className="setting-row__hint">
                      Primary typography stack for code editing.
                    </span>
                  </div>
                  <select
                    className="select-control"
                    aria-label="Editor font family"
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                  >
                    <option value="Cascadia Code">Cascadia Code</option>
                    <option value="Consolas">Consolas</option>
                    <option value="JetBrains Mono">JetBrains Mono</option>
                    <option value="Fira Code">Fira Code</option>
                  </select>
                </div>
                <div className="setting-row">
                  <div className="setting-row__info">
                    <span className="setting-row__label">Font Size</span>
                    <span className="setting-row__hint">Default editor font size in pixels.</span>
                  </div>
                  <select
                    className="select-control"
                    aria-label="Editor font size"
                    value={String(fontSize)}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                  >
                    <option value="12">12 px</option>
                    <option value="14">14 px (Default)</option>
                    <option value="16">16 px</option>
                    <option value="18">18 px</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === "keyboard" && (
              <div className="settings-section">
                <h3 className="settings-section__title">Keyboard Shortcuts</h3>
                <div className="shortcut-list">
                  <div className="shortcut-item">
                    <span>Command Palette</span>
                    <kbd className="kbd">Ctrl+Shift+P</kbd>
                  </div>
                  <div className="shortcut-item">
                    <span>Toggle Sidebar</span>
                    <kbd className="kbd">Ctrl+B</kbd>
                  </div>
                  <div className="shortcut-item">
                    <span>Source Mode</span>
                    <kbd className="kbd">Ctrl+1</kbd>
                  </div>
                  <div className="shortcut-item">
                    <span>Preview Mode</span>
                    <kbd className="kbd">Ctrl+2</kbd>
                  </div>
                  <div className="shortcut-item">
                    <span>Split View</span>
                    <kbd className="kbd">Ctrl+3</kbd>
                  </div>
                  <div className="shortcut-item">
                    <span>New File</span>
                    <kbd className="kbd">Ctrl+N</kbd>
                  </div>
                  <div className="shortcut-item">
                    <span>Save File</span>
                    <kbd className="kbd">Ctrl+S</kbd>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "about" && (
              <div className="settings-section">
                <div className="about-hero">
                  <div className="about-hero__logo">M</div>
                  <h3>Notepad Super Plus</h3>
                  <span className="about-hero__version">v0.1.0 • Windows Desktop Edition</span>
                  <p className="about-hero__desc">
                    A lightweight, high-performance, open-source Markdown editor engineered for
                    developers and writers.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
