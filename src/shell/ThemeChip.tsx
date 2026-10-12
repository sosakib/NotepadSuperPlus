import { useEffect, useRef, useState } from "react";
import { THEMES, SELECTABLE_THEMES, type ThemeId } from "../theme/themes.ts";
import { useUiStore } from "../state/ui.ts";

/**
 * Top-bar theme chip and swatch picker popover (docs/21 §2, §9).
 *
 * Displays the active theme with a live color swatch square. Clicking opens a
 * popover showing all 10 accessible themes with their distinct color swatches,
 * keyboard navigation (arrows + Enter/Escape), and active theme ring indicator.
 */
export function ThemeChip() {
  const resolvedTheme = useUiStore((s) => s.resolvedTheme);
  const setTheme = useUiStore((s) => s.setTheme);
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const chipRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const currentTheme = THEMES[resolvedTheme] ?? THEMES["apple-dark"];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (chipRef.current && !chipRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  // Focus active theme when opening
  useEffect(() => {
    if (open) {
      const idx = SELECTABLE_THEMES.findIndex((t) => t.id === currentTheme.id);
      setFocusedIndex(idx >= 0 ? idx : 0);
    }
  }, [open, currentTheme.id]);

  // Keep focused item in view
  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.children[focusedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [focusedIndex, open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((i) => (i + 1) % SELECTABLE_THEMES.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((i) => (i - 1 + SELECTABLE_THEMES.length) % SELECTABLE_THEMES.length);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const selected = SELECTABLE_THEMES[focusedIndex];
      if (selected) {
        setTheme(selected.id);
        setOpen(false);
      }
    }
  };

  return (
    <div className="theme-chip-wrap" ref={chipRef}>
      <button
        type="button"
        className={`theme-chip${open ? " theme-chip--open" : ""}`}
        aria-label={`Theme: ${currentTheme.name}. Click to change theme.`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
      >
        <span
          className="theme-chip__swatch"
          style={{ backgroundColor: currentTheme.tokens["bg-app"] }}
          aria-hidden
        />
        <span className="theme-chip__label">{currentTheme.name}</span>
      </button>

      {open && (
        <div
          className="theme-picker-popover"
          role="dialog"
          aria-label="Select a theme"
          onKeyDown={handleKeyDown}
        >
          <div className="theme-picker__header">Select Theme</div>
          <ul className="theme-picker__list" role="listbox" ref={listRef}>
            {SELECTABLE_THEMES.map((t, idx) => {
              const active = t.id === currentTheme.id;
              const focused = idx === focusedIndex;
              return (
                <li
                  key={t.id}
                  role="option"
                  aria-selected={active}
                  className={`theme-picker__item${active ? " theme-picker__item--active" : ""}${
                    focused ? " theme-picker__item--focused" : ""
                  }`}
                  onClick={() => {
                    setTheme(t.id as ThemeId);
                    setOpen(false);
                  }}
                  onMouseEnter={() => setFocusedIndex(idx)}
                >
                  <span
                    className="theme-picker__swatch"
                    style={{
                      backgroundColor: t.tokens["bg-app"],
                      borderColor: t.tokens["border-strong"],
                    }}
                    aria-hidden
                  >
                    <span
                      className="theme-picker__swatch-dot"
                      style={{ backgroundColor: t.tokens.accent }}
                      aria-hidden
                    />
                  </span>
                  <div className="theme-picker__details">
                    <span className="theme-picker__name">{t.name}</span>
                    <span className="theme-picker__desc">{t.description}</span>
                  </div>
                  {active && (
                    <span className="theme-picker__check" aria-hidden>
                      ✓
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
