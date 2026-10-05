import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";

vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: vi.fn(() => Promise.resolve()) }));

import { openUrl } from "@tauri-apps/plugin-opener";
import { PreviewPane } from "./PreviewPane.tsx";
import { useDocumentsStore } from "../state/documents.ts";
import { useRenderStore } from "../state/render.ts";

function show(html: string) {
  useDocumentsStore.setState({ activeId: "d1" });
  useRenderStore.setState({
    results: {
      d1: { version: 1, html, outline: [], stats: { words: 0, chars: 0 }, frontmatter: null },
    },
  } as never);
  return render(<PreviewPane />);
}

describe("PreviewPane links", () => {
  it("never lets a link navigate the window", () => {
    const { container } = show(
      `<p><a href="https://evil.example">x</a> <a href="other.md">y</a></p>`,
    );
    for (const a of container.querySelectorAll("a")) {
      expect(fireEvent.click(a)).toBe(false); // preventDefault() was called
    }
  });

  it("opens web links in the system browser", () => {
    const { container } = show(`<a href="https://example.com">x</a>`);
    fireEvent.click(container.querySelector("a")!);
    expect(openUrl).toHaveBeenCalledWith("https://example.com");
  });

  it("does not hand relative links to the opener", () => {
    vi.mocked(openUrl).mockClear();
    const { container } = show(`<a href="other.md">x</a>`);
    fireEvent.click(container.querySelector("a")!);
    expect(openUrl).not.toHaveBeenCalled();
  });
});
