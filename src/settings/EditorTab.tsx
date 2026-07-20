import { useUiStore } from "../state/ui.ts";

const FONT_FAMILIES = ["Cascadia Code", "Consolas", "JetBrains Mono", "Fira Code"];
const FONT_SIZES = [12, 13, 14, 16, 18, 20];

/** Editor preferences: wrapping and typography. */
export function EditorTab() {
  const wordWrap = useUiStore((s) => s.wordWrap);
  const toggleWordWrap = useUiStore((s) => s.toggleWordWrap);
  const fontFamily = useUiStore((s) => s.fontFamily);
  const setFontFamily = useUiStore((s) => s.setFontFamily);
  const fontSize = useUiStore((s) => s.fontSize);
  const setFontSize = useUiStore((s) => s.setFontSize);

  return (
    <div className="settings-section">
      <h3 className="settings-section__title">Editor</h3>
      <p className="settings-section__desc">Typography and layout for the source pane.</p>

      <div className="setting-row">
        <label className="setting-row__info" htmlFor="setting-word-wrap">
          <span className="setting-row__label">Soft word wrap</span>
          <span className="setting-row__hint">Wrap long lines to the editor width.</span>
        </label>
        <input
          id="setting-word-wrap"
          type="checkbox"
          className="toggle-switch"
          checked={wordWrap}
          onChange={() => toggleWordWrap()}
        />
      </div>

      <div className="setting-row">
        <label className="setting-row__info" htmlFor="setting-font-family">
          <span className="setting-row__label">Font family</span>
          <span className="setting-row__hint">Falls back to Cascadia Code if unavailable.</span>
        </label>
        <select
          id="setting-font-family"
          className="select-control"
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
        >
          {FONT_FAMILIES.map((family) => (
            <option key={family} value={family}>
              {family}
            </option>
          ))}
        </select>
      </div>

      <div className="setting-row">
        <label className="setting-row__info" htmlFor="setting-font-size">
          <span className="setting-row__label">Font size</span>
          <span className="setting-row__hint">Editor text size in pixels.</span>
        </label>
        <select
          id="setting-font-size"
          className="select-control"
          value={String(fontSize)}
          onChange={(e) => setFontSize(Number(e.target.value))}
        >
          {FONT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size} px{size === 14 ? " (default)" : ""}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
