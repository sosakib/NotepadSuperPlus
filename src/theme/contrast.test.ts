/**
 * WCAG contrast floors for every bundled theme.
 *
 * Themes are data, so their accessibility is testable data too: this asserts the
 * ratios a reader actually depends on rather than trusting the palette's origin.
 * A theme that regresses here is a theme that shipped unreadable text.
 *
 * Thresholds follow WCAG 2.2: 4.5:1 for body text (1.4.3), 3:1 for large text and
 * for non-text UI boundaries and state colors (1.4.11).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SELECTABLE_THEMES, THEMES, type Theme, type ThemeId, type ThemeTokens } from "./themes.ts";
import { SYNTAX_PALETTES } from "../editor/theme.ts";

type TokenKey = keyof ThemeTokens;

function channels(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  if (full.length !== 6) throw new Error(`not a 6-digit hex color: ${hex}`);
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) throw new Error(`not a hex color: ${hex}`);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** WCAG 2.x relative luminance. */
function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Body-text pairs: 4.5:1. */
const TEXT_PAIRS: [TokenKey, TokenKey][] = [
  ["fg-primary", "bg-app"],
  ["fg-primary", "bg-surface"],
  ["fg-primary", "bg-raised"],
  ["fg-primary", "bg-hover"],
  ["fg-primary", "bg-active"],
  ["fg-secondary", "bg-app"],
  ["fg-secondary", "bg-surface"],
  ["fg-secondary", "bg-raised"],
  ["fg-muted", "bg-app"],
  ["fg-muted", "bg-surface"],
  ["accent-fg", "accent"],
  ["fg-primary", "selection"],
];

/**
 * Non-text UI: 3:1 (WCAG 1.4.11) — the focus ring and status colors, which carry
 * meaning on their own.
 *
 * `border-subtle`/`border-strong` are deliberately absent. They draw panel seams and
 * scrollbar thumbs, which 1.4.11 exempts as decorative and as inactive-component
 * boundaries; holding a 1 px divider to 3:1 would force a hard line into every theme
 * and destroy the restrained look the palettes exist for. The ring itself is
 * `--accent`, which *is* asserted below.
 */
const UI_PAIRS: [TokenKey, TokenKey][] = [
  ["accent", "bg-app"],
  ["accent", "bg-surface"],
  ["danger", "bg-app"],
  ["warning", "bg-app"],
  ["success", "bg-app"],
];

const TEXT_MIN = 4.5;
const UI_MIN = 3;

/**
 * Hierarchy must survive: if secondary and muted land on top of each other the
 * three-tier text ramp collapses into two and emphasis stops reading.
 */
const MIN_RAMP_SEPARATION = 1.15;

function ratio(theme: Theme, fg: TokenKey, bg: TokenKey): number {
  return contrast(theme.tokens[fg], theme.tokens[bg]);
}

describe.each(SELECTABLE_THEMES.map((t) => [t.name, t] as const))("%s", (_name, theme) => {
  it.each(TEXT_PAIRS)(`%s on %s >= ${TEXT_MIN}:1`, (fg, bg) => {
    expect(ratio(theme, fg, bg)).toBeGreaterThanOrEqual(TEXT_MIN);
  });

  it.each(UI_PAIRS)(`%s on %s >= ${UI_MIN}:1`, (fg, bg) => {
    expect(ratio(theme, fg, bg)).toBeGreaterThanOrEqual(UI_MIN);
  });

  it("keeps the primary/secondary/muted ramp visually separated", () => {
    const primary = ratio(theme, "fg-primary", "bg-app");
    const secondary = ratio(theme, "fg-secondary", "bg-app");
    const muted = ratio(theme, "fg-muted", "bg-app");
    expect(primary / secondary).toBeGreaterThanOrEqual(MIN_RAMP_SEPARATION);
    expect(secondary / muted).toBeGreaterThanOrEqual(MIN_RAMP_SEPARATION);
  });

  it("declares a scheme matching its actual background lightness", () => {
    const dark = luminance(theme.tokens["bg-app"]) < 0.18;
    expect(theme.scheme).toBe(dark ? "dark" : "light");
  });
});

/**
 * global.css carries a fallback value for every token, for the frames before the theme
 * engine runs. `applyTheme` writes tokens as *inline* styles on the root, which outrank
 * any stylesheet rule — so if these fallbacks are damaged, nothing at runtime and no
 * screenshot will show it. Only the first paint (and jsdom) would break. Asserted here
 * because that is exactly how it was broken once: a misplaced brace moved the whole
 * block inside `:root[data-scheme="light"]`.
 */
describe("global.css token fallbacks", () => {
  // Vitest runs from the repo root; import.meta.url is not a file: URL under Vite.
  const css = readFileSync("src/styles/global.css", "utf8");
  const rootBlock = /:root\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
  const tokenKeys = Object.keys(THEMES["apple-dark"].tokens) as TokenKey[];

  it("declares a plain :root block", () => {
    expect(rootBlock).not.toBe("");
  });

  it.each(tokenKeys)("falls back on --%s", (key) => {
    expect(rootBlock).toMatch(new RegExp(`--${key}\\s*:`));
  });
});

/**
 * `src/editor/theme.ts` claims its palettes clear 4.5:1 against each theme's editor
 * background. That claim was never checked, and borrowed palettes are exactly where it
 * breaks — an accent ring tuned for a dark base is not safe on a light one.
 */
describe("markdown syntax palettes", () => {
  const ids = Object.keys(SYNTAX_PALETTES) as ThemeId[];

  it.each(ids)("%s has a palette for every theme id", (id) => {
    expect(SYNTAX_PALETTES[id]).toBeDefined();
  });

  it.each(ids)("%s syntax colors clear 4.5:1 on the editor background", (id) => {
    const editorBg = THEMES[id].tokens["bg-app"];
    const failures = Object.entries(SYNTAX_PALETTES[id])
      .map(([token, color]) => ({ token, color, ratio: contrast(color, editorBg) }))
      .filter((r) => r.ratio < TEXT_MIN)
      .map((r) => `${r.token} ${r.color} = ${r.ratio.toFixed(2)}:1`);
    expect(failures).toEqual([]);
  });
});
