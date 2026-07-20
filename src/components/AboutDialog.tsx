import { X, Sparkles, Code2, ShieldCheck, Heart } from "lucide-react";
import { useUiStore } from "../state/ui.ts";
import { IconButton } from "./IconButton.tsx";
import { Button } from "./Button.tsx";
import { useDialogDismiss } from "./useDialogDismiss.ts";

export function AboutDialog() {
  const aboutOpen = useUiStore((s) => s.aboutOpen);
  const setAboutOpen = useUiStore((s) => s.setAboutOpen);
  const panelRef = useDialogDismiss(aboutOpen, () => setAboutOpen(false));

  if (!aboutOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => setAboutOpen(false)}>
      <div
        ref={panelRef}
        className="about-modal"
        role="dialog"
        aria-modal="true"
        aria-label="About Notepad Super Plus"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="about-modal__header">
          <IconButton label="Close About" onClick={() => setAboutOpen(false)}>
            <X size={18} />
          </IconButton>
        </div>

        <div className="about-modal__body">
          <div className="about-brand">
            <div className="about-brand__logo">M</div>
            <h1 className="about-brand__title">Notepad Super Plus</h1>
            <span className="about-brand__badge">v0.1.0 • Desktop Edition</span>
          </div>

          <p className="about-modal__lead">
            A premium, lightweight, open-source desktop Markdown editor designed for speed, focus,
            and technical documentation excellence.
          </p>

          <div className="about-specs">
            <div className="about-spec-item">
              <Sparkles size={18} className="about-spec-item__icon" />
              <div>
                <strong>Apple & Linear Inspired UX</strong>
                <p>Minimalist chrome, navy gradient accents, and spatial clarity.</p>
              </div>
            </div>
            <div className="about-spec-item">
              <Code2 size={18} className="about-spec-item__icon" />
              <div>
                <strong>High Performance Core</strong>
                <p>Powered by CodeMirror 6, React 18, Vite & Tauri desktop shell.</p>
              </div>
            </div>
            <div className="about-spec-item">
              <ShieldCheck size={18} className="about-spec-item__icon" />
              <div>
                <strong>Privacy & Security First</strong>
                <p>Zero telemetry, 100% local file system access, open-source MIT license.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="about-modal__footer">
          <span className="about-modal__footer-text">
            Made with{" "}
            <Heart size={14} style={{ color: "#ef4444", fill: "#ef4444", display: "inline" }} /> for
            the developer community.
          </span>
          <Button onClick={() => setAboutOpen(false)}>Close</Button>
        </div>
      </div>
    </div>
  );
}
