import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "default" | "ghost" | "subtle";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function Button({ variant = "default", className, children, ...rest }: ButtonProps) {
  return (
    <button className={`btn btn--${variant}${className ? ` ${className}` : ""}`} {...rest}>
      {children}
    </button>
  );
}
