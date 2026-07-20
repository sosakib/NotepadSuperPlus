import { useAppVersion } from "../actions/useAppVersion.ts";

/** Identity and build information. */
export function AboutTab() {
  const version = useAppVersion();

  return (
    <div className="settings-section">
      <div className="about-brand">
        <div className="about-brand__logo" aria-hidden>
          N+
        </div>
        <h3 className="about-brand__title">Notepad Super Plus</h3>
        <span className="about-brand__badge">Version {version} · Windows desktop</span>
      </div>
      <p className="about-modal__lead">
        A lightweight, open-source Markdown editor built for speed and focus. No telemetry —
        everything stays on your machine.
      </p>
      <dl className="about-facts">
        <div className="about-fact">
          <dt>License</dt>
          <dd>MIT</dd>
        </div>
        <div className="about-fact">
          <dt>Engine</dt>
          <dd>Tauri 2 · Rust core</dd>
        </div>
        <div className="about-fact">
          <dt>Editor</dt>
          <dd>CodeMirror 6</dd>
        </div>
      </dl>
    </div>
  );
}
