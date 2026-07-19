import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Tooltip } from "./Tooltip.tsx";

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  /** Accessible label; also shown as a tooltip. */
  label: string;
  active?: boolean;
  children: ReactNode;
}

export function IconButton({
  label,
  active = false,
  className,
  children,
  ...rest
}: IconButtonProps) {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        className={`icon-btn${active ? " icon-btn--active" : ""}${className ? ` ${className}` : ""}`}
        {...rest}
      >
        {children}
      </button>
    </Tooltip>
  );
}
