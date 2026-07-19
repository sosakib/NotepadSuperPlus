import { describe, it, expect, beforeEach } from "vitest";
import { useWorkspaceStore } from "./workspace.ts";
import type { Entry } from "../ipc/workspace.ts";

const entry = (name: string, isDir = false): Entry => ({
  name,
  path: `C:\\ws\\${name}`,
  isDir,
  hasChildren: isDir,
  hidden: name.startsWith("."),
});

beforeEach(() => {
  useWorkspaceStore.setState({
    root: null,
    rootName: null,
    children: {},
    expanded: {},
    showHidden: false,
  });
});

describe("workspace store", () => {
  it("sets the root, derives its name, and expands it", () => {
    const entries = [entry("docs", true), entry("readme.md")];
    useWorkspaceStore.getState().setRoot("C:\\ws", entries);
    const s = useWorkspaceStore.getState();
    expect(s.root).toBe("C:\\ws");
    expect(s.rootName).toBe("ws");
    expect(s.children["C:\\ws"]).toEqual(entries);
    expect(s.expanded["C:\\ws"]).toBe(true);
  });

  it("caches children per directory", () => {
    useWorkspaceStore.getState().setChildren("C:\\ws\\docs", [entry("a.md")]);
    expect(useWorkspaceStore.getState().children["C:\\ws\\docs"]).toHaveLength(1);
  });

  it("toggles and sets expansion", () => {
    const store = useWorkspaceStore.getState();
    store.toggleExpanded("C:\\ws\\docs");
    expect(useWorkspaceStore.getState().expanded["C:\\ws\\docs"]).toBe(true);
    store.toggleExpanded("C:\\ws\\docs");
    expect(useWorkspaceStore.getState().expanded["C:\\ws\\docs"]).toBe(false);
    store.setExpanded("C:\\ws\\docs", true);
    expect(useWorkspaceStore.getState().expanded["C:\\ws\\docs"]).toBe(true);
  });

  it("closing the workspace clears the tree", () => {
    useWorkspaceStore.getState().setRoot("C:\\ws", [entry("a.md")]);
    useWorkspaceStore.getState().closeWorkspace();
    const s = useWorkspaceStore.getState();
    expect(s.root).toBeNull();
    expect(s.children).toEqual({});
  });

  it("toggles hidden-file visibility", () => {
    useWorkspaceStore.getState().toggleHidden();
    expect(useWorkspaceStore.getState().showHidden).toBe(true);
  });
});
