import { describe, it, expect, vi, afterEach } from "vitest";
import { applyTheme } from "./applyTheme.ts";
import { resolveTheme, THEMES } from "./themes.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("applyTheme", () => {
  it("writes semantic tokens as CSS variables and stamps data-theme", () => {
    applyTheme("light");
    const root = document.documentElement;
    expect(root.dataset.theme).toBe("light");
    expect(root.style.getPropertyValue("--bg-app")).toBe(THEMES.light.tokens["bg-app"]);
    expect(root.style.colorScheme).toBe("light");
  });

  it("applies high-contrast tokens", () => {
    applyTheme("high-contrast");
    expect(document.documentElement.style.getPropertyValue("--fg-primary")).toBe("#ffffff");
  });
});

describe("resolveTheme", () => {
  it("returns the concrete id unchanged", () => {
    expect(resolveTheme("dark")).toBe("dark");
    expect(resolveTheme("high-contrast")).toBe("high-contrast");
  });

  it("resolves 'system' from the OS preference", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("light"),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    expect(resolveTheme("system")).toBe("light");

    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: false,
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    expect(resolveTheme("system")).toBe("dark");
  });
});
