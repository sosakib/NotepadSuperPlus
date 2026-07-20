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

afterEach(() => {
  cleanup();
});
