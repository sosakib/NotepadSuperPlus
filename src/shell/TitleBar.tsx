import {
  Command as CommandIcon,
  Settings as SettingsIcon,
  Download as ExportIcon,
  Info as InfoIcon,
} from "lucide-react";
import { useUiStore } from "../state/ui.ts";
import { IconButton } from "../components/IconButton.tsx";
import { ViewModeSwitch } from "./ViewModeSwitch.tsx";

/** Application title bar: brand, view-mode switch, command-palette, settings, export entries. */
export function TitleBar() {
  const togglePalette = useUiStore((s) => s.togglePalette);
  const toggleSettings = useUiStore((s) => s.toggleSettings);
  const toggleExport = useUiStore((s) => s.toggleExport);
  const toggleAbout = useUiStore((s) => s.toggleAbout);

  return (
    <header className="titlebar">
      <div
        className="titlebar__brand"
        onClick={toggleAbout}
        style={{ cursor: "pointer" }}
        title="About Notepad Super Plus"
      >
        <span className="titlebar__logo" aria-hidden>
          M
        </span>
        <span className="titlebar__name">Notepad Super Plus</span>
      </div>
      <div className="titlebar__center">
        <ViewModeSwitch />
      </div>
      <div className="titlebar__actions">
        <IconButton label="Command Palette (Ctrl+Shift+P)" onClick={togglePalette}>
          <CommandIcon size={16} />
        </IconButton>
        <IconButton label="Export Document" onClick={toggleExport}>
          <ExportIcon size={16} />
        </IconButton>
        <IconButton label="Settings" onClick={toggleSettings}>
          <SettingsIcon size={16} />
        </IconButton>
        <IconButton label="About" onClick={toggleAbout}>
          <InfoIcon size={16} />
        </IconButton>
      </div>
    </header>
  );
}
