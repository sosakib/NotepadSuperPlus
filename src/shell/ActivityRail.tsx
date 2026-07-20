import { Files, ListTree, Search, PanelLeft, Palette, Settings } from "lucide-react";
import { useUiStore, type PanelId } from "../state/ui.ts";
import { IconButton } from "../components/IconButton.tsx";

const PANELS: { id: PanelId; label: string; icon: typeof Files }[] = [
  { id: "explorer", label: "Explorer", icon: Files },
  { id: "outline", label: "Outline", icon: ListTree },
  { id: "search", label: "Search", icon: Search },
];

/** Left activity rail: panel switchers plus sidebar/theme/settings toggles. */
export function ActivityRail() {
  const activePanel = useUiStore((s) => s.activePanel);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const showPanel = useUiStore((s) => s.showPanel);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const cycleTheme = useUiStore((s) => s.cycleTheme);
  const toggleSettings = useUiStore((s) => s.toggleSettings);

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
