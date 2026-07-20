import { Check } from "lucide-react";
import { useUiStore } from "../state/ui.ts";
import { SELECTABLE_THEMES } from "../theme/themes.ts";

/** Theme picker. Cards are generated from the theme registry, so adding a theme
 * to `themes.ts` is all it takes to make it selectable here. */
export function AppearanceTab() {
  const themeSetting = useUiStore((s) => s.themeSetting);
  const resolvedTheme = useUiStore((s) => s.resolvedTheme);
  const setTheme = useUiStore((s) => s.setTheme);

  return (
    <div className="settings-section">
      <h3 className="settings-section__title">Theme</h3>
      <p className="settings-section__desc">
        Applies to the application chrome and the editor together.
      </p>
      <div className="theme-grid" role="radiogroup" aria-label="Theme">
        {SELECTABLE_THEMES.map((theme) => {
          const selected =
            themeSetting === theme.id || (themeSetting === "system" && resolvedTheme === theme.id);
          return (
            <button
              key={theme.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`theme-card${selected ? " is-selected" : ""}`}
              onClick={() => setTheme(theme.id)}
            >
              <span
                className="theme-card__preview"
                style={{ background: theme.tokens["bg-app"] }}
                aria-hidden
              >
                <span className="theme-card__swatch" style={{ background: theme.tokens.accent }} />
                <span
                  className="theme-card__swatch theme-card__swatch--sm"
                  style={{ background: theme.tokens["bg-raised"] }}
                />
                {selected && <Check size={14} className="theme-card__check" />}
              </span>
              <span className="theme-card__info">
                <span className="theme-card__name">{theme.name}</span>
                <span className="theme-card__desc">{theme.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
