import { useUiStore } from "../state/ui.ts";
import { useDocumentsStore } from "../state/documents.ts";
import { openFile, saveFile, saveFileAs } from "../actions/fileActions.ts";
import type { Command } from "./types.ts";

/**
 * The built-in command set for Stage 2. Commands read/write the UI store via
 * `getState()` so they are static, palette-listable, and keymap-bindable.
 * File/edit/search commands arrive with their subsystems in later stages.
 */
export function defaultCommands(): Command[] {
  const ui = () => useUiStore.getState();
  const docs = () => useDocumentsStore.getState();

  return [
    {
      id: "file.new",
      title: "New File",
      category: "File",
      defaultKeys: ["ctrl+n"],
      icon: "FilePlus",
      run: () => docs().newDocument(),
    },
    {
      id: "file.open",
      title: "Open File…",
      category: "File",
      defaultKeys: ["ctrl+o"],
      icon: "FolderOpen",
      run: () => void openFile(),
    },
    {
      id: "file.save",
      title: "Save",
      category: "File",
      defaultKeys: ["ctrl+s"],
      icon: "Save",
      run: () => void saveFile(),
    },
    {
      id: "file.saveAs",
      title: "Save As…",
      category: "File",
      defaultKeys: ["ctrl+shift+s"],
      run: () => void saveFileAs(),
    },
    {
      id: "file.close",
      title: "Close File",
      category: "File",
      defaultKeys: ["ctrl+w"],
      run: () => {
        const { activeId, closeDocument } = docs();
        if (activeId) closeDocument(activeId);
      },
    },
    {
      id: "editor.toggleWordWrap",
      title: "Toggle Word Wrap",
      category: "Editor",
      defaultKeys: ["alt+z"],
      run: () => ui().toggleWordWrap(),
    },
    {
      id: "palette.toggle",
      title: "Command Palette",
      category: "General",
      defaultKeys: ["ctrl+shift+p"],
      icon: "Command",
      run: () => ui().togglePalette(),
    },
    {
      id: "view.source",
      title: "View: Source",
      category: "View",
      defaultKeys: ["ctrl+1"],
      run: () => ui().setViewMode("source"),
    },
    {
      id: "view.preview",
      title: "View: Preview",
      category: "View",
      defaultKeys: ["ctrl+2"],
      run: () => ui().setViewMode("preview"),
    },
    {
      id: "view.split",
      title: "View: Split",
      category: "View",
      defaultKeys: ["ctrl+3"],
      run: () => ui().setViewMode("split"),
    },
    {
      id: "view.toggleSidebar",
      title: "Toggle Sidebar",
      category: "View",
      defaultKeys: ["ctrl+b"],
      icon: "PanelLeft",
      run: () => ui().toggleSidebar(),
    },
    {
      id: "view.cycleTheme",
      title: "Cycle Theme",
      category: "View",
      icon: "Palette",
      run: () => ui().cycleTheme(),
    },
    {
      id: "panel.explorer",
      title: "Show Explorer",
      category: "Go",
      run: () => ui().showPanel("explorer"),
    },
    {
      id: "panel.outline",
      title: "Show Outline",
      category: "Go",
      run: () => ui().showPanel("outline"),
    },
    {
      id: "panel.search",
      title: "Show Search",
      category: "Go",
      run: () => ui().showPanel("search"),
    },
    {
      id: "view.zoomIn",
      title: "Zoom In",
      category: "View",
      defaultKeys: ["ctrl+="],
      run: () => ui().zoomIn(),
    },
    {
      id: "view.zoomOut",
      title: "Zoom Out",
      category: "View",
      defaultKeys: ["ctrl+-"],
      run: () => ui().zoomOut(),
    },
    {
      id: "view.zoomReset",
      title: "Reset Zoom",
      category: "View",
      defaultKeys: ["ctrl+0"],
      run: () => ui().zoomReset(),
    },
  ];
}
