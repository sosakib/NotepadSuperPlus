import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const destroy = vi.fn();
let handler: ((e: { preventDefault: () => void }) => Promise<void>) | undefined;
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    destroy,
    onCloseRequested: async (cb: typeof handler) => {
      handler = cb;
      return () => {};
    },
  }),
}));
const ask = vi.fn();
vi.mock("@tauri-apps/plugin-dialog", () => ({ ask: (...a: unknown[]) => ask(...a) }));

import { useCloseGuard } from "./useCloseGuard.ts";
import { useDocumentsStore } from "../state/documents.ts";

function setDocs(dirty: boolean) {
  useDocumentsStore.setState({ docs: { a: { id: "a", title: "a.md", dirty } } } as never);
}

describe("useCloseGuard", () => {
  beforeEach(() => {
    destroy.mockClear();
    ask.mockReset();
    handler = undefined;
  });

  it("closes immediately when nothing is dirty", async () => {
    setDocs(false);
    renderHook(() => useCloseGuard());
    await waitFor(() => expect(handler).toBeDefined());
    const preventDefault = vi.fn();
    await handler!({ preventDefault });
    expect(preventDefault).not.toHaveBeenCalled();
    expect(ask).not.toHaveBeenCalled();
  });

  it("keeps the window open when the user cancels", async () => {
    setDocs(true);
    ask.mockResolvedValue(false);
    renderHook(() => useCloseGuard());
    await waitFor(() => expect(handler).toBeDefined());
    const preventDefault = vi.fn();
    await handler!({ preventDefault });
    expect(preventDefault).toHaveBeenCalled();
    expect(destroy).not.toHaveBeenCalled();
  });

  it("quits when the user confirms", async () => {
    setDocs(true);
    ask.mockResolvedValue(true);
    renderHook(() => useCloseGuard());
    await waitFor(() => expect(handler).toBeDefined());
    await handler!({ preventDefault: vi.fn() });
    expect(destroy).toHaveBeenCalled();
  });
});
