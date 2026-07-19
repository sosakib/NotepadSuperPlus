interface KbdProps {
  /** A normalized chord like "ctrl+shift+p". */
  chord: string;
}

const LABELS: Record<string, string> = {
  ctrl: "Ctrl",
  alt: "Alt",
  shift: "Shift",
  escape: "Esc",
  "=": "+",
  "-": "−",
};

/** Renders a key chord as individual <kbd> keys. */
export function Kbd({ chord }: KbdProps) {
  const keys = chord.split("+");
  return (
    <span className="kbd-group">
      {keys.map((k, i) => (
        <kbd key={`${k}-${i}`} className="kbd">
          {LABELS[k] ?? k.toUpperCase()}
        </kbd>
      ))}
    </span>
  );
}
