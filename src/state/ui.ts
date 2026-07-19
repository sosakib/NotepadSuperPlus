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
  statusMessage: string;

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
  setStatus: (message: string) => void;
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
  statusMessage: "Ready",

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
  setStatus: (message) => set({ statusMessage: message }),
}));

export const SIDEBAR_BOUNDS = { min: SIDEBAR_MIN, max: SIDEBAR_MAX };
