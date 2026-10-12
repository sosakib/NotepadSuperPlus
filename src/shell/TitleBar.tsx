import { useUiStore } from "../state/ui.ts";
import { WindowControls } from "./WindowControls.tsx";
import brandMark from "../assets/brand-mark.png";

/**
 * Application title bar. The window runs frameless (`decorations: false`), so this *is*
 * the caption bar — there is no OS title bar above it.
 *
 * `data-tauri-drag-region="deep"` makes the whole strip draggable, with one exception that
 * Tauri's own handler applies for us: an element that is clickable (button, link, input, or
 * anything with a non-negative tabindex or an interactive ARIA role) blocks the drag, so the
 * brand button and the window controls stay clickable without any hit-testing here
 * (tauri/src/window/scripts/drag.js). Double-click-to-maximize comes from the same handler.
 *
 * Contents are deliberately just the brand and the window controls. Per-document controls
 * live with the document (the view-mode switch sits beside the tab strip) and global toggles
 * live in the activity rail, which keeps the caption bar reading as a caption bar.
 */
export function TitleBar() {
  const toggleAbout = useUiStore((s) => s.toggleAbout);

  return (
    <header className="titlebar" data-tauri-drag-region="deep">
      <button
        type="button"
        className="titlebar__brand"
        onClick={toggleAbout}
        title="About Notepad Super Plus"
      >
        <img className="titlebar__logo" src={brandMark} alt="" aria-hidden />
        <span className="titlebar__name">Notepad Super Plus</span>
      </button>
      <WindowControls />
    </header>
  );
}
