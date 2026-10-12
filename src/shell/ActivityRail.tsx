import {
  Files,
  ListTree,
  Search,
  PanelLeft,
  Palette,
  Settings,
  Command as CommandIcon,
  Download as ExportIcon,
} from "lucide-react";
import { useUiStore, type PanelId } from "../state/ui.ts";
import { IconButton } from "../components/IconButton.tsx";

const PANELS: { id: PanelId; label: string; icon: typeof Files }[] = [
  { id: "explorer", label: "Explorer", icon: Files },
  { id: "outline", label: "Outline", icon: ListTree },
  { id: "search", label: "Search", icon: Search },
];

/**
 * Left activity rail: panel switchers on top, global toggles at the bottom.
 *
 * The bottom group holds the application-wide entries — palette, export, sidebar, theme,
 * settings. They moved here from the title bar when the window went frameless: they are not
 * per-document, and the rail was already the established home for global toggles (it had
 * sidebar, theme and settings before this change; settings was duplicated in both places).
 * About stays reachable from the title-bar brand, where it already was.
 */
export function ActivityRail() {
  const activePanel = useUiStore((s) => s.activePanel);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const showPanel = useUiStore((s) => s.showPanel);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const cycleTheme = useUiStore((s) => s.cycleTheme);
  const toggleSettings = useUiStore((s) => s.toggleSettings);
  const togglePalette = useUiStore((s) => s.togglePalette);
  const toggleExport = useUiStore((s) => s.toggleExport);

  return (
    <nav className="rail" aria-label="Primary">
      <div className="rail__group">
        {PANELS.map(({ id, label, icon: Icon }) => {
          const active = !sidebarCollapsed && activePanel === id;
          return (
            <IconButton
              key={id}
              label={label}
              active={active}
              onClick={() => (active ? toggleSidebar() : showPanel(id))}
            >
              <Icon size={20} />
            </IconButton>
          );
        })}
      </div>
      <div className="rail__group rail__group--bottom">
        <IconButton label="Command Palette (Ctrl+Shift+P)" onClick={togglePalette}>
          <CommandIcon size={20} />
        </IconButton>
        <IconButton label="Export Document" onClick={toggleExport}>
          <ExportIcon size={20} />
        </IconButton>
        <IconButton label="Toggle Sidebar (Ctrl+B)" onClick={toggleSidebar}>
          <PanelLeft size={20} />
        </IconButton>
        <IconButton label="Cycle Theme" onClick={cycleTheme}>
          <Palette size={20} />
        </IconButton>
        <IconButton label="Preferences" onClick={toggleSettings}>
          <Settings size={20} />
        </IconButton>
      </div>
    </nav>
  );
}
