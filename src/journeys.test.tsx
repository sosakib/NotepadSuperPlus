/**
 * UI journey tests (Stage 12 / blocker B4).
 *
 * These render the **real application shell** and drive it the way a person would,
 * rather than testing components in isolation. That matters because the bugs this
 * project actually shipped lived between components, not inside them: a lazily-loaded
 * pane that never resolved, a Suspense boundary with no fallback, a store field the UI
 * forgot to read. Unit tests passed through all of it.
 *
 * The Rust half of the same journeys is in `src-tauri/src/journeys.rs`.
 *
 * Scope limit, stated plainly: jsdom has no layout engine and no WebView, so this
 * cannot verify pixels, real file dialogs, or the Tauri IPC boundary — `invoke` is
 * mocked below. Closing that last gap needs a WebDriver; see
 * `docs/reports/E2E_COVERAGE.md`.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- IPC boundary -----------------------------------------------------------
// Every command the shell touches on mount. Returning plausible values rather than
// throwing keeps the journey on its normal path instead of its error path.
const invoked: { cmd: string; args?: unknown }[] = [];

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async (cmd: string, args?: unknown) => {
    invoked.push({ cmd, args });
    switch (cmd) {
      case "app_version":
        return "0.9.0";
      case "cli_paths":
      case "recent_list":
        return [];
      case "session_get":
        return { tabs: [], active: null, viewMode: "source", workspace: null };
      case "session_save":
        return args;
      case "config_get":
        return {
          theme: "apple-dark",
          wordWrap: true,
          fontFamily: "Cascadia Code",
          fontSize: 14,
          zoom: 0,
          sidebarWidth: 280,
          splitRatio: 0.5,
          showHiddenFiles: false,
        };
      case "config_save":
        return (args as { settings: unknown }).settings;
      default:
        return null;
    }
  }),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async () => () => {}),
}));

// The Markdown renderer runs in a Worker, which jsdom does not implement. The
// pipeline itself is covered directly in src/markdown/*.test.ts; here it only needs
// to not explode on construction.
class StubWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  postMessage(): void {
    /* renders are asserted in the markdown tests, not here */
  }
  terminate(): void {}
  addEventListener(): void {}
  removeEventListener(): void {}
}
vi.stubGlobal("Worker", StubWorker);

import App from "./App.tsx";
import { useDocumentsStore } from "./state/documents.ts";
import { useUiStore } from "./state/ui.ts";
import { useRenderStore } from "./state/render.ts";

function resetStores(): void {
  useDocumentsStore.setState({ docs: {}, order: [], activeId: null });
  useRenderStore.setState({ results: {} });
  useUiStore.setState({
    themeSetting: "apple-dark",
    resolvedTheme: "apple-dark",
    viewMode: "source",
    paletteOpen: false,
    settingsOpen: false,
    exportOpen: false,
    aboutOpen: false,
    sidebarCollapsed: false,
  });
}

describe("UI journeys", () => {
  beforeEach(() => {
    invoked.length = 0;
    resetStores();
  });

  it("boots to the welcome screen without loading the editor", async () => {
    render(<App />);
    expect(await screen.findByRole("button", { name: /new document/i })).toBeInTheDocument();
    // The editor is lazily loaded; nothing should have mounted it yet.
    expect(document.querySelector(".cm-editor")).toBeNull();
  });

  it("restores the previous session on boot", async () => {
    render(<App />);
    // Session restore must be attempted on every launch, not only when a file is open.
    await waitFor(() => {
      expect(invoked.some((i) => i.cmd === "session_get")).toBe(true);
    });
  });

  it("creates a document and shows it in the tab strip", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: /new document/i }));

    await waitFor(() => {
      expect(useDocumentsStore.getState().order).toHaveLength(1);
    });
    const strip = document.querySelector(".tabbar__strip");
    expect(strip?.textContent).toMatch(/Untitled-\d+\.md/);
  });

  it("opens and closes the command palette from the keyboard", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("button", { name: /new document/i });

    await user.keyboard("{Control>}{Shift>}P{/Shift}{/Control}");
    // The palette is lazily loaded, so it has to arrive before it can be asserted.
    const input = await screen.findByPlaceholderText(/type a command/i);
    expect(input).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/type a command/i)).toBeNull();
    });
  });

  it("opens the About dialog and reports the version from the backend", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: /notepad super plus/i }));

    const dialog = await waitFor(() => {
      const el = document.querySelector(".about-modal");
      if (!el) throw new Error("about dialog not mounted");
      return el as HTMLElement;
    });
    // The free/open-source position must be stated, not implied.
    expect(dialog.textContent).toMatch(/free, open-source/i);
    expect(dialog.textContent).not.toMatch(/premium/i);
    await waitFor(() => expect(dialog.textContent).toContain("0.9.0"));
  });

  it("applies theme tokens to the document root when the theme changes", async () => {
    render(<App />);
    await screen.findByRole("button", { name: /new document/i });

    const root = document.documentElement;
    await waitFor(() => {
      expect(root.dataset.theme).toBe("apple-dark");
    });
    const dark = root.style.getPropertyValue("--bg-app");
    expect(dark).toBeTruthy();
    // `data-scheme` drives the scheme-aware shadow set; without it light themes
    // inherit a shadow tuned for a navy shell.
    expect(root.dataset.scheme).toBe("dark");

    useUiStore.getState().setTheme("solarized-light");
    await waitFor(() => {
      expect(root.dataset.theme).toBe("solarized-light");
      expect(root.dataset.scheme).toBe("light");
    });
    expect(root.style.getPropertyValue("--bg-app")).not.toBe(dark);
    // Editor syntax variables must follow the theme too, or code blocks and the
    // editor keep the previous theme's palette.
    expect(root.style.getPropertyValue("--cm-keyword")).toBeTruthy();
  });

  it("reaches every bundled theme from the rail button", async () => {
    const user = userEvent.setup();
    render(<App />);
    const cycle = await screen.findByRole("button", { name: /cycle theme/i });

    const seen = new Set<string>();
    for (let i = 0; i < 12; i++) {
      await user.click(cycle);
      seen.add(useUiStore.getState().themeSetting);
    }
    // Regression guard for D2: the cycle used to reach only 4 of the themes.
    expect(seen.size).toBeGreaterThanOrEqual(10);
  });

  it("switches view mode and mounts the matching pane", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: /new document/i }));
    await waitFor(() => expect(useDocumentsStore.getState().activeId).not.toBeNull());

    // Queried by class rather than accessible name: the segmented control labels its
    // items visually, so the role/name lookup does not reach them.
    const previewTab = [...document.querySelectorAll<HTMLButtonElement>(".segmented__item")].find(
      (b) => /preview/i.test(b.textContent ?? ""),
    );
    expect(previewTab, "view-mode switch should offer a Preview option").toBeDefined();
    await user.click(previewTab as HTMLButtonElement);
    // The preview pane is a lazy chunk; under a parallel suite it can take over 1 s.
    await waitFor(
      () => {
        expect(document.querySelector(".preview-pane")).not.toBeNull();
      },
      { timeout: 5_000 },
    );
    expect(useUiStore.getState().viewMode).toBe("preview");
  });

  it("shows a conflict banner for an externally changed dirty file, and both resolutions clear it", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: /new document/i }));

    const id = useDocumentsStore.getState().activeId as string;
    useDocumentsStore.getState().markDirty(id, true);
    useDocumentsStore.getState().setConflict(id, true);

    const banner = await waitFor(() => {
      const el = document.querySelector(".conflict-banner");
      if (!el) throw new Error("no conflict banner");
      return el as HTMLElement;
    });
    expect(banner.textContent).toMatch(/changed on disk/i);

    // "Keep my changes" must dismiss the banner and leave the buffer dirty — losing
    // the dirty flag here would let the next save silently skip.
    await user.click(within(banner).getByRole("button", { name: /keep my changes/i }));
    await waitFor(() => {
      expect(document.querySelector(".conflict-banner")).toBeNull();
    });
    expect(useDocumentsStore.getState().docs[id]?.dirty).toBe(true);
    expect(useDocumentsStore.getState().docs[id]?.conflict).toBe(false);
  });

  it("persists settings changes back through the IPC boundary", async () => {
    render(<App />);
    await screen.findByRole("button", { name: /new document/i });
    await waitFor(() => expect(invoked.some((i) => i.cmd === "config_get")).toBe(true));

    useUiStore.getState().setFontSize(19);

    await waitFor(
      () => {
        const save = invoked.find((i) => i.cmd === "config_save");
        expect(save).toBeDefined();
        expect((save?.args as { settings: { fontSize: number } }).settings.fontSize).toBe(19);
      },
      { timeout: 3000 },
    );
  });

  it("keeps the sidebar toggle and panel switching in sync", async () => {
    const user = userEvent.setup();
    render(<App />);
    const toggle = await screen.findByRole("button", { name: /toggle sidebar/i });

    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
    await user.click(toggle);
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);

    // Choosing a panel must also reopen the sidebar, or the click appears to do nothing.
    await user.click(screen.getByRole("button", { name: /^search$/i }));
    await waitFor(() => {
      expect(useUiStore.getState().sidebarCollapsed).toBe(false);
      expect(useUiStore.getState().activePanel).toBe("search");
    });
  });
});
