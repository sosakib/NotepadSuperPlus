import type { ReactElement } from "react";

interface TooltipProps {
  label: string;
  children: ReactElement;
}

/**
 * Lightweight CSS-driven tooltip: wraps a single interactive child and shows a
 * label on hover/focus (delay via CSS). Kept minimal for Stage 2; a positioned,
 * collision-aware tooltip can replace this behind the same API later.
 */
export function Tooltip({ label, children }: TooltipProps) {
  // The bubble is decorative: every consumer already carries the same text as an
  // accessible name (IconButton sets `aria-label`), so exposing it again would
  // make screen readers announce the label twice.
  return (
    <span className="tooltip-wrap">
      {children}
      <span className="tooltip-bubble" aria-hidden>
        {label}
      </span>
    </span>
  );
}
