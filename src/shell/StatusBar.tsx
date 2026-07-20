import { useEffect, useState } from "react";
import { useUiStore } from "../state/ui.ts";
import { useDocumentsStore } from "../state/documents.ts";
import { THEMES } from "../theme/themes.ts";
import { getDocText } from "../editor/editorRegistry.ts";

/** Bottom status bar: document stats on the left; view mode, zoom, theme, version on the right. */
export function StatusBar() {
  const statusMessage = useUiStore((s) => s.statusMessage);
  const viewMode = useUiStore((s) => s.viewMode);
  const zoom = useUiStore((s) => s.zoom);
  const resolvedTheme = useUiStore((s) => s.resolvedTheme);
  const cursorLine = useUiStore((s) => s.cursorLine);
  const cursorCol = useUiStore((s) => s.cursorCol);
  const activeId = useDocumentsStore((s) => s.activeId);
  const language = useDocumentsStore((s) => (activeId ? s.docs[activeId]?.languageId : null));
  const [version, setVersion] = useState("v0.1.0");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const v = await invoke<string>("app_version");
        if (!cancelled) setVersion(`v${v}`);
      } catch {
        /* browser dev fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const text = activeId ? getDocText(activeId) : "";
  const words = text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const chars = text ? text.length : 0;
  const readTimeMin = Math.max(1, Math.ceil(words / 200));

  const zoomPct = `${100 + zoom * 10}%`;

  return (
    <footer className="statusbar" role="status" aria-live="polite">
      <div className="statusbar__left">
        <span className="statusbar__item">{statusMessage}</span>
        {activeId ? (
          <>
            <span className="statusbar__item statusbar__num">
              {words} words • {chars} chars
            </span>
            <span className="statusbar__item statusbar__item--muted">
              ~{readTimeMin} min read
            </span>
          </>
        ) : null}
      </div>
      <div className="statusbar__right">
        {language ? <span className="statusbar__item">{language}</span> : null}
        <span className="statusbar__item statusbar__item--muted">UTF-8</span>
        <span className="statusbar__item statusbar__item--muted">LF</span>
        <span className="statusbar__item statusbar__num">
          Ln {cursorLine}, Col {cursorCol}
        </span>
        <span className="statusbar__item statusbar__mode">{viewMode}</span>
        <span className="statusbar__item statusbar__num">{zoomPct}</span>
        <span className="statusbar__item">{THEMES[resolvedTheme]?.name || "Theme"}</span>
        <span className="statusbar__item statusbar__item--muted">{version}</span>
      </div>
    </footer>
  );
}

