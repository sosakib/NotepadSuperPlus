import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Minimize / maximize-restore / close for the frameless window (`decorations: false`).
 *
 * Deliberately thin. Everything hard about a custom title bar — resize hit-testing on all
 * eight edges, per-monitor DPI, and clamping a maximized borderless window to the monitor's
 * work area so it never covers the taskbar — is already handled inside `tao`
 * (platform_impl/windows/event_loop.rs, WM_NCHITTEST and WM_NCCALCSIZE). Reimplementing any
 * of it in CSS or JS would replace correct OS behaviour with a worse copy, so this component
 * does nothing but call the three window commands and mirror the maximized state.
 *
 * Dragging and double-click-to-maximize are not here either: they come from
 * `data-tauri-drag-region` on the title bar, which Tauri's injected handler turns into
 * `start_dragging` / `internal_toggle_maximize`. Because `start_dragging` issues a real
 * WM_NCLBUTTONDOWN/HTCAPTION, Windows treats it as a genuine caption drag — Aero Snap,
 * drag-to-top-maximize and drag-to-edge all work with no code here.
 *
 * Not supported: the Windows 11 snap-layout flyout that appears when hovering a maximize
 * button. It requires returning HTMAXBUTTON from a subclassed window procedure, which needs
 * raw Win32 and is ruled out by `#![forbid(unsafe_code)]`. `Win`+`Z` still opens Snap Layouts.
 */

/** Win11-proportioned glyphs, drawn at 10px so they sit optically level with 16px lucide icons. */
const GLYPH = { width: 10, height: 10, viewBox: "0 0 10 10", "aria-hidden": true } as const;

function MinimizeGlyph() {
  return (
    <svg {...GLYPH}>
      <path d="M0 5h10" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function MaximizeGlyph() {
  return (
    <svg {...GLYPH}>
      <rect
        x="0.5"
        y="0.5"
        width="9"
        height="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}

function RestoreGlyph() {
  return (
    <svg {...GLYPH}>
      <path d="M2.5 2.5V0.5h7v7h-2" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect
        x="0.5"
        y="2.5"
        width="7"
        height="7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg {...GLYPH}>
      <path d="M0 0l10 10M10 0L0 10" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/**
 * Tracks whether the window is maximized.
 *
 * Read from the window rather than toggled locally: the state also changes from routes this
 * component never sees — double-clicking the drag region, `Win`+arrow, drag-to-top, and the
 * Alt+Space system menu. A local boolean would desynchronise on the first one of those and
 * leave the button showing the wrong glyph.
 *
 * Returns null until the first read resolves, and stays null when no Tauri runtime is present
 * (browser dev), which is what hides the controls there.
 */
function useMaximized(): boolean | null {
  const [maximized, setMaximized] = useState<boolean | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        const win = getCurrentWindow();
        const sync = async () => {
          const value = await win.isMaximized();
          if (!cancelled) setMaximized(value);
        };
        await sync();
        // onResized covers every path into and out of the maximized state, including the
        // ones triggered by the OS rather than by this UI.
        const stop = await win.onResized(() => void sync());
        if (cancelled) stop();
        else unlisten = stop;
      } catch {
        /* no Tauri runtime (browser dev) — default to false so controls remain visible and testable */
        if (!cancelled) setMaximized(false);
      }
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  return maximized;
}

/** Window minimize / maximize-restore / close buttons for the frameless title bar. */
export function WindowControls() {
  const maximized = useMaximized();
  if (maximized === null) return null;

  const handleMinimize = () => {
    try {
      void getCurrentWindow().minimize();
    } catch {
      /* browser dev fallback */
    }
  };

  const handleToggleMaximize = () => {
    try {
      void getCurrentWindow().toggleMaximize();
    } catch {
      /* browser dev fallback */
    }
  };

  const handleClose = () => {
    try {
      void getCurrentWindow().close();
    } catch {
      /* browser dev fallback */
    }
  };

  return (
    <div className="window-controls">
      <button
        type="button"
        className="window-control"
        aria-label="Minimize"
        title="Minimize"
        onClick={handleMinimize}
      >
        <MinimizeGlyph />
      </button>
      <button
        type="button"
        className="window-control"
        aria-label={maximized ? "Restore Down" : "Maximize"}
        title={maximized ? "Restore Down" : "Maximize"}
        onClick={handleToggleMaximize}
      >
        {maximized ? <RestoreGlyph /> : <MaximizeGlyph />}
      </button>
      <button
        type="button"
        className="window-control window-control--close"
        aria-label="Close"
        title="Close"
        onClick={handleClose}
      >
        <CloseGlyph />
      </button>
    </div>
  );
}
