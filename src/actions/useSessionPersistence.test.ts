import { beforeEach, describe, expect, it } from "vitest";
import { currentSnapshot } from "./useSessionPersistence.ts";
import { useDocumentsStore } from "../state/documents.ts";
import { useUiStore } from "../state/ui.ts";
import { useWorkspaceStore } from "../state/workspace.ts";

/**
 * Only file-backed documents are persisted, which means the saved `active` index
 * addresses a *filtered* list. Every case here is a way that filtering can silently
 * point the restored session at the wrong document.
 */
describe("session snapshot", () => {
  beforeEach(() => {
    useDocumentsStore.setState({ docs: {}, order: [], activeId: null });
    useUiStore.setState({ viewMode: "source" });
    useWorkspaceStore.setState({ root: null });
  });

  const open = (path: string): string => {
    const { id } = useDocumentsStore.getState().openDocument({
      path,
      title: "",
      encoding: "utf-8",
      eol: "lf",
      mtimeMs: 0,
      readonly: false,
    });
    return id;
  };

  it("records file-backed tabs in order", () => {
    open("C:/a.md");
    open("C:/b.md");
    const snap = currentSnapshot();
    expect(snap.tabs.map((t) => t.path)).toEqual(["C:/a.md", "C:/b.md"]);
  });

  it("omits unsaved buffers", () => {
    useDocumentsStore.getState().newDocument();
    open("C:/a.md");
    useDocumentsStore.getState().newDocument();
    const snap = currentSnapshot();
    expect(snap.tabs).toHaveLength(1);
    expect(snap.tabs[0]?.path).toBe("C:/a.md");
  });

  it("remaps active past omitted buffers rather than reusing the tab index", () => {
    useDocumentsStore.getState().newDocument(); // order 0, not persisted
    open("C:/a.md"); // order 1 -> tabs 0
    const b = open("C:/b.md"); // order 2 -> tabs 1
    useDocumentsStore.getState().setActive(b);

    const snap = currentSnapshot();
    // Naively reusing the order index would save 2, which is out of range, or point
    // at the wrong file once the untitled buffer is dropped.
    expect(snap.active).toBe(1);
    expect(snap.tabs[snap.active as number]?.path).toBe("C:/b.md");
  });

  it("reports no active tab when an unsaved buffer is focused", () => {
    open("C:/a.md");
    useDocumentsStore.getState().newDocument();
    const snap = currentSnapshot();
    // The untitled buffer is not restorable, so nothing should claim to be active.
    expect(snap.active).toBeNull();
  });

  it("defaults the caret to 1:1 for a document with no editor state", () => {
    open("C:/a.md");
    expect(currentSnapshot().tabs[0]).toMatchObject({ line: 1, column: 1 });
  });

  it("captures view mode and workspace root", () => {
    open("C:/a.md");
    useUiStore.getState().setViewMode("split");
    useWorkspaceStore.setState({ root: "C:/work" });
    const snap = currentSnapshot();
    expect(snap.viewMode).toBe("split");
    expect(snap.workspace).toBe("C:/work");
  });

  it("is empty when nothing is open", () => {
    expect(currentSnapshot()).toMatchObject({ tabs: [], active: null });
  });
});
