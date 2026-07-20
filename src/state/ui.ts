import { create } from "zustand";
import { resolveTheme, type ThemeId, type ThemeSetting } from "../theme/themes.ts";

export type PanelId = "explorer" | "outline" | "search";
export type ViewMode = "source" | "preview" | "split";

const SIDEBAR_MIN = 240;
const SIDEBAR_MAX = 400;
const ZOOM_MIN = -4;
const ZOOM_MAX = 8;

export interface UiState {
  themeSetting: ThemeSetting;
  resolvedTheme: ThemeId;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  activePanel: PanelId;
  viewMode: ViewMode;
  /** Zoom step; each step is ~10%. Applied to the root font size by the shell. */
  zoom: number;
  paletteOpen: boolean;
  settingsOpen: boolean;
  exportOpen: boolean;
  aboutOpen: boolean;
  statusMessage: string;
  wordWrap: boolean;
  fontFamily: string;
  fontSize: number;
  cursorLine: number;
  cursorCol: number;
  splitRatio: number;

  setTheme: (setting: ThemeSetting) => void;
  cycleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidth: (width: number) => void;
  showPanel: (panel: PanelId) => void;
  setViewMode: (mode: ViewMode) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;
  setPaletteOpen: (open: boolean) => void;
  togglePalette: () => void;
  setSettingsOpen: (open: boolean) => void;
  toggleSettings: () => void;
  setExportOpen: (open: boolean) => void;
  toggleExport: () => void;
  setAboutOpen: (open: boolean) => void;
  toggleAbout: () => void;
  setStatus: (message: string) => void;
  toggleWordWrap: () => void;
  setWordWrap: (on: boolean) => void;
  setFontFamily: (family: string) => void;
  setFontSize: (size: number) => void;
  setCursor: (line: number, col: number) => void;
  setSplitRatio: (ratio: number) => void;
}

const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));

const THEME_CYCLE: ThemeSetting[] = ["system", "dark", "light", "high-contrast"];

export const useUiStore = create<UiState>((set, get) => ({
  themeSetting: "system",
  resolvedTheme: resolveTheme("system"),
  sidebarCollapsed: false,
  sidebarWidth: 280,
  activePanel: "explorer",
  viewMode: "source",
  zoom: 0,
  paletteOpen: false,
  settingsOpen: false,
  exportOpen: false,
  aboutOpen: false,
  statusMessage: "Ready",
  wordWrap: true,
  fontFamily: "Cascadia Code",
  fontSize: 14,
  cursorLine: 1,
  cursorCol: 1,
  splitRatio: 0.5,

  setTheme: (setting) => set({ themeSetting: setting, resolvedTheme: resolveTheme(setting) }),
  cycleTheme: () => {
    const current = get().themeSetting;
    const nextIndex = (THEME_CYCLE.indexOf(current) + 1) % THEME_CYCLE.length;
    const next = THEME_CYCLE[nextIndex] ?? "system";
    set({ themeSetting: next, resolvedTheme: resolveTheme(next) });
  },
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setSidebarWidth: (width) =>
    set({ sidebarWidth: clamp(Math.round(width), SIDEBAR_MIN, SIDEBAR_MAX) }),
  showPanel: (panel) => set({ activePanel: panel, sidebarCollapsed: false }),
  setViewMode: (mode) => set({ viewMode: mode }),
  zoomIn: () => set((s) => ({ zoom: clamp(s.zoom + 1, ZOOM_MIN, ZOOM_MAX) })),
  zoomOut: () => set((s) => ({ zoom: clamp(s.zoom - 1, ZOOM_MIN, ZOOM_MAX) })),
  zoomReset: () => set({ zoom: 0 }),
  setPaletteOpen: (open) => set({ paletteOpen: open }),
  togglePalette: () => set((s) => ({ paletteOpen: !s.paletteOpen })),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
  setExportOpen: (open) => set({ exportOpen: open }),
  toggleExport: () => set((s) => ({ exportOpen: !s.exportOpen })),
  setAboutOpen: (open) => set({ aboutOpen: open }),
  toggleAbout: () => set((s) => ({ aboutOpen: !s.aboutOpen })),
  setStatus: (message) => set({ statusMessage: message }),
  toggleWordWrap: () => set((s) => ({ wordWrap: !s.wordWrap })),
  setWordWrap: (on) => set({ wordWrap: on }),
  setFontFamily: (family) => set({ fontFamily: family }),
  setFontSize: (size) => set({ fontSize: clamp(Math.round(size), 8, 32) }),
  setCursor: (line, col) => set({ cursorLine: line, cursorCol: col }),
  setSplitRatio: (ratio) => set({ splitRatio: clamp(ratio, 0.2, 0.8) }),
}));

export const SIDEBAR_BOUNDS = { min: SIDEBAR_MIN, max: SIDEBAR_MAX };
