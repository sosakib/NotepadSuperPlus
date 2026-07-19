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
