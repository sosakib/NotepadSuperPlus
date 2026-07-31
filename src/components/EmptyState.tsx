import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  hint?: string;
  /** Optional action (e.g. a Button) rendered below the hint. */
  children?: ReactNode;
}

/** Teaching empty state: one icon, a title, an optional next-action hint, and an optional action. */
export function EmptyState({ icon, title, hint, children }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon ? <div className="empty-state__icon">{icon}</div> : null}
      <p className="empty-state__title">{title}</p>
      {hint ? <p className="empty-state__hint">{hint}</p> : null}
      {children ? <div className="empty-state__action">{children}</div> : null}
    </div>
  );
}
