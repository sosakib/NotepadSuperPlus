import { useEffect, useState } from "react";
import { useUiStore } from "../state/ui.ts";
import { THEMES } from "../theme/themes.ts";

/** Bottom status bar: message on the left; view mode, zoom, theme, version on the right. */
export function StatusBar() {
  const statusMessage = useUiStore((s) => s.statusMessage);
  const viewMode = useUiStore((s) => s.viewMode);
  const zoom = useUiStore((s) => s.zoom);
  const resolvedTheme = useUiStore((s) => s.resolvedTheme);
  const [version, setVersion] = useState("dev");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const v = await invoke<string>("app_version");
        if (!cancelled) setVersion(`v${v}`);
      } catch {
        /* browser dev — leave as "dev" */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const zoomPct = `${100 + zoom * 10}%`;

  return (
    <footer className="statusbar" role="status" aria-live="polite">
      <div className="statusbar__left">
        <span className="statusbar__item">{statusMessage}</span>
      </div>
      <div className="statusbar__right">
        <span className="statusbar__item statusbar__item--muted">Ln —, Col —</span>
        <span className="statusbar__item">{viewMode}</span>
        <span className="statusbar__item statusbar__num">{zoomPct}</span>
        <span className="statusbar__item">{THEMES[resolvedTheme].name}</span>
        <span className="statusbar__item statusbar__item--muted">{version}</span>
      </div>
    </footer>
  );
}
