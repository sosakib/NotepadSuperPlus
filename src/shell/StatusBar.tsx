import { useUiStore } from "../state/ui.ts";
import { useDocumentsStore } from "../state/documents.ts";
import { THEMES } from "../theme/themes.ts";
import { useRenderStore } from "../state/render.ts";
import { useAppVersion } from "../actions/useAppVersion.ts";

/** Human-readable label for a detected encoding id (e.g. "utf-8-bom" → "UTF-8 BOM"). */
function formatEncoding(id: string): string {
  const KNOWN: Record<string, string> = {
    "utf-8": "UTF-8",
    "utf-8-bom": "UTF-8 BOM",
    "utf-16le": "UTF-16 LE",
    "utf-16be": "UTF-16 BE",
  };
  return KNOWN[id] ?? id.toUpperCase();
}

/** Bottom status bar: document stats on the left; view mode, zoom, theme, version on the right. */
export function StatusBar() {
  const statusMessage = useUiStore((s) => s.statusMessage);
  const viewMode = useUiStore((s) => s.viewMode);
  const zoom = useUiStore((s) => s.zoom);
  const resolvedTheme = useUiStore((s) => s.resolvedTheme);
  const cursorLine = useUiStore((s) => s.cursorLine);
  const cursorCol = useUiStore((s) => s.cursorCol);
  const activeId = useDocumentsStore((s) => s.activeId);
  const language = useDocumentsStore((s) => (activeId ? s.docs[activeId]?.languageId : null));
  const encoding = useDocumentsStore((s) => (activeId ? s.docs[activeId]?.encoding : null));
  const eol = useDocumentsStore((s) => (activeId ? s.docs[activeId]?.eol : null));
  const version = `v${useAppVersion()}`;

  // Stats come from the render worker, which already runs debounced and off the
  // main thread. Computing them here would re-scan the whole document on every
  // cursor move — a per-keystroke O(document) cost (docs/09 §8).
  const stats = useRenderStore((s) => (activeId ? s.results[activeId]?.stats : undefined));
  const words = stats?.words ?? 0;
  const chars = stats?.chars ?? 0;
  const readTimeMin = Math.max(1, Math.ceil(words / 200));

  const zoomPct = `${100 + zoom * 10}%`;

  return (
    <footer className="statusbar" role="status" aria-live="polite">
      <div className="statusbar__left">
        <span className="statusbar__item">{statusMessage}</span>
        {activeId ? (
          <>
            <span className="statusbar__item statusbar__num statusbar__optional">
              {words.toLocaleString()} words · {chars.toLocaleString()} chars
            </span>
            <span className="statusbar__item statusbar__item--muted statusbar__optional--wide">
              ~{readTimeMin} min read
            </span>
          </>
        ) : null}
      </div>
      <div className="statusbar__right">
        {language ? <span className="statusbar__item">{language}</span> : null}
        {encoding ? (
          <span className="statusbar__item statusbar__item--muted statusbar__optional">
            {formatEncoding(encoding)}
          </span>
        ) : null}
        {eol ? (
          <span className="statusbar__item statusbar__item--muted statusbar__optional">
            {eol.toUpperCase()}
          </span>
        ) : null}
        {activeId ? (
          <span className="statusbar__item statusbar__num">
            Ln {cursorLine}, Col {cursorCol}
          </span>
        ) : null}
        <span className="statusbar__item statusbar__mode">{viewMode}</span>
        {zoom !== 0 ? <span className="statusbar__item statusbar__num">{zoomPct}</span> : null}
        <span className="statusbar__item statusbar__optional--wide">
          {THEMES[resolvedTheme]?.name ?? "Theme"}
        </span>
        <span className="statusbar__item statusbar__item--muted statusbar__optional">
          {version}
        </span>
      </div>
    </footer>
  );
}
