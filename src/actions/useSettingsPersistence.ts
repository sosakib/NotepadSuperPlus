import { useEffect, useRef } from "react";
import { loadConfig, saveConfig, type AppConfig } from "../ipc/config.ts";
import { useUiStore } from "../state/ui.ts";
import { useWorkspaceStore } from "../state/workspace.ts";
import type { ThemeSetting } from "../theme/themes.ts";

/**
 * Loads persisted settings on startup and writes them back (debounced) whenever
 * they change (docs/01 FR-11.1/11.2). The TOML file is the source of truth; a
 * missing or invalid file simply yields defaults, so this never blocks startup.
 */
const SAVE_DEBOUNCE_MS = 400;

function currentConfig(): AppConfig {
  const ui = useUiStore.getState();
  return {
    theme: ui.themeSetting,
    wordWrap: ui.wordWrap,
    fontFamily: ui.fontFamily,
    fontSize: ui.fontSize,
    zoom: ui.zoom,
    sidebarWidth: ui.sidebarWidth,
    splitRatio: ui.splitRatio,
    showHiddenFiles: useWorkspaceStore.getState().showHidden,
  };
}

export function useSettingsPersistence(): void {
  const loadedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load once at startup and apply.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const cfg = await loadConfig();
        if (cancelled) return;
        const ui = useUiStore.getState();
        ui.setTheme(cfg.theme as ThemeSetting);
        ui.setWordWrap(cfg.wordWrap);
        ui.setFontFamily(cfg.fontFamily);
        ui.setFontSize(cfg.fontSize);
        ui.setSidebarWidth(cfg.sidebarWidth);
        ui.setSplitRatio(cfg.splitRatio);
        for (let i = 0; i < Math.abs(cfg.zoom); i++) {
          if (cfg.zoom > 0) ui.zoomIn();
          else ui.zoomOut();
        }
        if (cfg.showHiddenFiles !== useWorkspaceStore.getState().showHidden) {
          useWorkspaceStore.getState().toggleHidden();
        }
      } catch {
        /* browser dev, or no Tauri runtime — defaults stand */
      } finally {
        if (!cancelled) loadedRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist on change, debounced, and only after the initial load has applied.
  useEffect(() => {
    const persist = (): void => {
      if (!loadedRef.current) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void saveConfig(currentConfig()).catch(() => {
          /* not running under Tauri */
        });
      }, SAVE_DEBOUNCE_MS);
    };

    const unsubUi = useUiStore.subscribe(persist);
    const unsubWs = useWorkspaceStore.subscribe(persist);
    return () => {
      unsubUi();
      unsubWs();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}
