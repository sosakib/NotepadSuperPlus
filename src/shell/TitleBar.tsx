import { Command as CommandIcon } from "lucide-react";
import { useUiStore } from "../state/ui.ts";
import { WindowControls } from "./WindowControls.tsx";
import { TabBar } from "./TabBar.tsx";
import { ThemeChip } from "./ThemeChip.tsx";
import { ViewModeSwitch } from "./ViewModeSwitch.tsx";
import { IconButton } from "../components/IconButton.tsx";
import brandMark from "../assets/brand-mark.png";

/**
 * Unified application title bar (docs/21 §2).
 *
 * Runs frameless (`decorations: false`), serving as the single top caption bar:
 * - Brand logo & name on the left (opens About)
 * - Inline document tabs with language icons, close buttons, and `+` new document
 * - Middle flexible drag region (`data-tauri-drag-region`) for moving / double-click maximize
 * - Theme chip displaying current theme swatch & name with 10-theme picker popover
 * - View-mode switch (Source | Preview | Split)
 * - ⌘ Command Palette button
 * - Native-styled Window controls (minimize, maximize/restore, close)
 */
export function TitleBar() {
  const toggleAbout = useUiStore((s) => s.toggleAbout);
  const togglePalette = useUiStore((s) => s.togglePalette);

  return (
    <header className="titlebar" data-tauri-drag-region="deep">
      <div className="titlebar__left">
        <button
          type="button"
          className="titlebar__brand"
          onClick={toggleAbout}
          title="About Notepad Super Plus"
        >
          <img className="titlebar__logo" src={brandMark} alt="" aria-hidden />
          <span className="titlebar__name">Notepad Super Plus</span>
        </button>
        <div className="titlebar__tabs-container">
          <TabBar />
        </div>
      </div>

      <div className="titlebar__spacer" data-tauri-drag-region />

      <div className="titlebar__right">
        <ThemeChip />
        <ViewModeSwitch />
        <IconButton
          label="Command Palette (Ctrl+Shift+P)"
          onClick={togglePalette}
          className="titlebar__palette-btn"
        >
          <CommandIcon size={16} />
        </IconButton>
      </div>

      <WindowControls />
    </header>
  );
}
