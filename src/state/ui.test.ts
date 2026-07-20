import { describe, it, expect, beforeEach } from "vitest";
import { useUiStore } from "./ui.ts";

const reset = (): void =>
  useUiStore.setState({
    themeSetting: "system",
    sidebarCollapsed: false,
    sidebarWidth: 280,
    activePanel: "explorer",
    viewMode: "source",
    zoom: 0,
    paletteOpen: false,
  });

describe("ui store", () => {
  beforeEach(reset);

  it("toggles the sidebar", () => {
    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
  });

  it("clamps sidebar width to bounds", () => {
    useUiStore.getState().setSidebarWidth(100);
    expect(useUiStore.getState().sidebarWidth).toBe(240);
    useUiStore.getState().setSidebarWidth(9999);
    expect(useUiStore.getState().sidebarWidth).toBe(400);
  });

  it("showPanel selects a panel and expands the sidebar", () => {
    useUiStore.setState({ sidebarCollapsed: true });
    useUiStore.getState().showPanel("search");
    expect(useUiStore.getState().activePanel).toBe("search");
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
  });

  it("clamps zoom", () => {
    for (let i = 0; i < 20; i++) useUiStore.getState().zoomIn();
    expect(useUiStore.getState().zoom).toBe(8);
    useUiStore.getState().zoomReset();
    expect(useUiStore.getState().zoom).toBe(0);
    for (let i = 0; i < 20; i++) useUiStore.getState().zoomOut();
    expect(useUiStore.getState().zoom).toBe(-4);
  });

  it("clamps the editor font size to a usable range", () => {
    useUiStore.getState().setFontSize(2);
    expect(useUiStore.getState().fontSize).toBe(8);
    useUiStore.getState().setFontSize(999);
    expect(useUiStore.getState().fontSize).toBe(32);
    useUiStore.getState().setFontSize(16);
    expect(useUiStore.getState().fontSize).toBe(16);
  });

  it("sets the editor font family and word wrap explicitly", () => {
    useUiStore.getState().setFontFamily("JetBrains Mono");
    expect(useUiStore.getState().fontFamily).toBe("JetBrains Mono");
    useUiStore.getState().setWordWrap(false);
    expect(useUiStore.getState().wordWrap).toBe(false);
  });

  it("clamps the split ratio", () => {
    useUiStore.getState().setSplitRatio(0.01);
    expect(useUiStore.getState().splitRatio).toBe(0.2);
    useUiStore.getState().setSplitRatio(0.99);
    expect(useUiStore.getState().splitRatio).toBe(0.8);
  });

  it("cycles theme through system -> dark -> light -> high-contrast -> system", () => {
    const seq = ["dark", "light", "high-contrast", "system"];
    for (const expected of seq) {
      useUiStore.getState().cycleTheme();
      expect(useUiStore.getState().themeSetting).toBe(expected);
    }
  });
});
