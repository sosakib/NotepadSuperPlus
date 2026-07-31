import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom implements no layout engine, so `scrollIntoView` is simply absent
// (jsdom#1695). Components that keep a selection visible call it legitimately;
// stub it so those effects run instead of throwing.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView(): void {
    /* no layout in jsdom — nothing to scroll */
  };
}

// jsdom does not implement matchMedia either. The theme engine calls it to resolve
// the "system" setting, so without this any test that mounts the real App throws on
// its first effect and renders nothing — which looks like a hundred broken selectors
// rather than one missing global. Defaults to dark so `system` resolves predictably;
// tests that care about the light branch stub it themselves.
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("dark"),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  cleanup();
});
