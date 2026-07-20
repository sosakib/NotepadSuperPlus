import { useUiStore } from "../state/ui.ts";
import { Resizer } from "../components/Resizer.tsx";
import { ExplorerPanel } from "../sidebar/ExplorerPanel.tsx";
import { OutlinePanel } from "../sidebar/OutlinePanel.tsx";
import { SearchPanel } from "../sidebar/SearchPanel.tsx";

const PANEL_TITLES = {
  explorer: "Explorer",
  outline: "Outline",
  search: "Search",
} as const;

/** Resizable sidebar hosting the active panel. */
export function Sidebar() {
  const activePanel = useUiStore((s) => s.activePanel);
  const width = useUiStore((s) => s.sidebarWidth);
  const setSidebarWidth = useUiStore((s) => s.setSidebarWidth);

  // Panel width is the pointer position minus the activity rail (--rail-width: 48px).
  const handleResize = (clientX: number): void => setSidebarWidth(clientX - 48);

  return (
    <aside className="sidebar" style={{ width }} aria-label={PANEL_TITLES[activePanel]}>
      <div className="sidebar__inner">
        <div className="sidebar__header">{PANEL_TITLES[activePanel]}</div>
        <div className="sidebar__content">
          {activePanel === "explorer" && <ExplorerPanel />}
          {activePanel === "outline" && <OutlinePanel />}
          {activePanel === "search" && <SearchPanel />}
        </div>
      </div>
      <Resizer
        label="Resize sidebar"
        onResize={handleResize}
        onDoubleClick={() => setSidebarWidth(280)}
      />
    </aside>
  );
}
