import { Command as CommandIcon } from "lucide-react";
import { useUiStore } from "../state/ui.ts";
import { IconButton } from "../components/IconButton.tsx";
import { ViewModeSwitch } from "./ViewModeSwitch.tsx";

/** Application title bar: brand, view-mode switch, command-palette entry. */
export function TitleBar() {
  const togglePalette = useUiStore((s) => s.togglePalette);

  return (
    <header className="titlebar">
      <div className="titlebar__brand">
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
      </div>
    </header>
  );
}
