import { useEffect, useMemo, useRef, useState } from "react";
import { registry } from "../commands/index.ts";
import { useUiStore } from "../state/ui.ts";
import { fuzzyMatch } from "../utils/fuzzy.ts";
import { Kbd } from "../components/Kbd.tsx";

/** Command palette: fuzzy-filter and run any registered command (Ctrl+Shift+P). */
export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen);
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    const all = registry.getAll();
    if (query.trim() === "") return all;
    return all
      .map((cmd) => ({ cmd, match: fuzzyMatch(query, `${cmd.title} ${cmd.category}`) }))
      .filter(
        (r): r is { cmd: (typeof all)[number]; match: NonNullable<typeof r.match> } =>
          r.match !== null,
      )
      .sort((a, b) => b.match.score - a.match.score)
      .map((r) => r.cmd);
  }, [query]);

  // Reset transient state each time the palette opens.
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  // Keep the highlighted command in view when arrowing past the visible window.
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  if (!open) return null;

  const runSelected = (): void => {
    const cmd = results[selected];
    if (cmd) {
      setOpen(false);
      cmd.run();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runSelected();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className="palette-overlay" onMouseDown={() => setOpen(false)}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          className="palette__input"
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-autocomplete="list"
          placeholder="Type a command…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <ul className="palette__list" id="palette-list" role="listbox" ref={listRef}>
          {results.length === 0 ? (
            <li className="palette__empty">No matching commands</li>
          ) : (
            results.map((cmd, i) => (
              <li
                key={cmd.id}
                role="option"
                aria-selected={i === selected}
                className={`palette__item${i === selected ? " palette__item--selected" : ""}`}
                onMouseEnter={() => setSelected(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setOpen(false);
                  cmd.run();
                }}
              >
                <span className="palette__cat">{cmd.category}</span>
                <span className="palette__title">{cmd.title}</span>
                {cmd.defaultKeys?.[0] ? <Kbd chord={cmd.defaultKeys[0]} /> : null}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
