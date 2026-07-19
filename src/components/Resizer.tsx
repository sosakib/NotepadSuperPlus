import { useCallback, type PointerEvent as ReactPointerEvent } from "react";

interface ResizerProps {
  /** Called with the pointer's clientX as the user drags. */
  onResize: (clientX: number) => void;
  onDoubleClick?: () => void;
  label: string;
}

/** A vertical drag handle for resizing an adjacent panel. Pointer-capture based. */
export function Resizer({ onResize, onDoubleClick, label }: ResizerProps) {
  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);

      const move = (ev: PointerEvent): void => onResize(ev.clientX);
      const up = (): void => {
        target.releasePointerCapture(e.pointerId);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [onResize],
  );

  return (
    <div
      className="resizer"
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      onPointerDown={handlePointerDown}
      onDoubleClick={onDoubleClick}
    />
  );
}
