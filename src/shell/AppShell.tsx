import { useUiStore } from "../state/ui.ts";
import { TitleBar } from "./TitleBar.tsx";
import { ActivityRail } from "./ActivityRail.tsx";
import { Sidebar } from "./Sidebar.tsx";
import { EditorArea } from "./EditorArea.tsx";
import { StatusBar } from "./StatusBar.tsx";

/** Top-level application frame: title bar, activity rail + sidebar + editor, status bar. */
export function AppShell() {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);

  return (
    <div className="app-frame">
      <TitleBar />
      <div className="app-body">
        <ActivityRail />
        {!sidebarCollapsed && <Sidebar />}
        <EditorArea />
      </div>
      <StatusBar />
    </div>
  );
}
