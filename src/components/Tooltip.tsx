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
  return (
    <span className="tooltip-wrap" data-tooltip={label}>
      {children}
      <span role="tooltip" className="tooltip-bubble">
        {label}
      </span>
    </span>
  );
}
