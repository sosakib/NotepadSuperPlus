import { describe, it, expect, beforeEach } from "vitest";
import { useDocumentsStore } from "./documents.ts";

beforeEach(() => {
  useDocumentsStore.setState({ docs: {}, order: [], activeId: null });
});

describe("documents store", () => {
  it("creates and activates a new document", () => {
    const id = useDocumentsStore.getState().newDocument();
    const s = useDocumentsStore.getState();
    expect(s.order).toEqual([id]);
    expect(s.activeId).toBe(id);
    expect(s.docs[id]?.languageId).toBe("Markdown");
    expect(s.docs[id]?.dirty).toBe(false);
  });

  it("tracks multiple documents and switches active", () => {
    const a = useDocumentsStore.getState().newDocument();
    const b = useDocumentsStore.getState().newDocument();
    expect(useDocumentsStore.getState().activeId).toBe(b);
    useDocumentsStore.getState().setActive(a);
    expect(useDocumentsStore.getState().activeId).toBe(a);
  });

  it("marks a document dirty", () => {
    const id = useDocumentsStore.getState().newDocument();
    useDocumentsStore.getState().markDirty(id, true);
    expect(useDocumentsStore.getState().docs[id]?.dirty).toBe(true);
  });

  it("closing the active document activates its right neighbor", () => {
    const a = useDocumentsStore.getState().newDocument();
    const b = useDocumentsStore.getState().newDocument();
    const c = useDocumentsStore.getState().newDocument();
    useDocumentsStore.getState().setActive(b);
    useDocumentsStore.getState().closeDocument(b);
    const s = useDocumentsStore.getState();
    expect(s.order).toEqual([a, c]);
    expect(s.activeId).toBe(c);
  });

  it("closing the last document clears the active id", () => {
    const id = useDocumentsStore.getState().newDocument();
    useDocumentsStore.getState().closeDocument(id);
    const s = useDocumentsStore.getState();
    expect(s.order).toEqual([]);
    expect(s.activeId).toBeNull();
  });
});

describe("documents store — files", () => {
  beforeEach(() => useDocumentsStore.setState({ docs: {}, order: [], activeId: null }));

  const info = {
    path: "C:\\docs\\notes.md",
    title: "",
    encoding: "utf-8",
    eol: "lf",
    mtimeMs: 100,
    readonly: false,
  };

  it("opens a file with derived language and path", () => {
    const { id, existing } = useDocumentsStore.getState().openDocument(info);
    expect(existing).toBe(false);
    const doc = useDocumentsStore.getState().docs[id];
    expect(doc?.path).toBe(info.path);
    expect(doc?.title).toBe("notes.md");
    expect(doc?.languageId).toBe("Markdown");
    expect(useDocumentsStore.getState().activeId).toBe(id);
  });

  it("re-activates an already-open file instead of duplicating", () => {
    const first = useDocumentsStore.getState().openDocument(info);
    useDocumentsStore.getState().newDocument(); // switch active away
    const second = useDocumentsStore.getState().openDocument(info);
    expect(second.existing).toBe(true);
    expect(second.id).toBe(first.id);
    expect(useDocumentsStore.getState().order.length).toBe(2);
  });

  it("findByPath locates an open document", () => {
    const { id } = useDocumentsStore.getState().openDocument(info);
    expect(useDocumentsStore.getState().findByPath(info.path)).toBe(id);
    expect(useDocumentsStore.getState().findByPath("nope")).toBeUndefined();
  });

  it("markSaved updates path/title/mtime and clears dirty + conflict", () => {
    const id = useDocumentsStore.getState().newDocument();
    useDocumentsStore.getState().markDirty(id, true);
    useDocumentsStore.getState().setConflict(id, true);
    useDocumentsStore.getState().markSaved(id, { path: "D:\\x\\readme.md", mtimeMs: 200 });
    const doc = useDocumentsStore.getState().docs[id];
    expect(doc?.path).toBe("D:\\x\\readme.md");
    expect(doc?.title).toBe("readme.md");
    expect(doc?.mtimeMs).toBe(200);
    expect(doc?.dirty).toBe(false);
    expect(doc?.conflict).toBe(false);
  });
});
