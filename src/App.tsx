import { Suspense, lazy, useEffect } from "react";
import { AppShell } from "./shell/AppShell.tsx";
import { useUiStore } from "./state/ui.ts";
import { useKeyboard } from "./keyboard/useKeyboard.ts";
import { useFsWatcher } from "./actions/useFsWatcher.ts";
import { useCliOpen } from "./actions/useCliOpen.ts";
import { useSettingsPersistence } from "./actions/useSettingsPersistence.ts";
import { useSessionPersistence } from "./actions/useSessionPersistence.ts";
import { useCloseGuard } from "./actions/useCloseGuard.ts";
import { applyTheme } from "./theme/applyTheme.ts";
import { applyEditorSyntaxVars } from "./editor/syntaxPalettes.ts";
import { markStartupPhase, reportInteractive } from "./perf.ts";

/*
 * Overlays: none of these are visible at boot, and each was previously parsed on the
 * critical path just to render `null`. They are mounted only once their open flag
 * flips, so the code loads on the interaction that needs it.
 */
const CommandPalette = lazy(() =>
  import("./palette/CommandPalette.tsx").then((m) => ({ default: m.CommandPalette })),
);
const SettingsDialog = lazy(() =>
  import("./settings/SettingsDialog.tsx").then((m) => ({ default: m.SettingsDialog })),
);
const ExportDialog = lazy(() =>
  import("./components/ExportDialog.tsx").then((m) => ({ default: m.ExportDialog })),
);
const AboutDialog = lazy(() =>
  import("./components/AboutDialog.tsx").then((m) => ({ default: m.AboutDialog })),
);

/** Main application entry: chrome, theming, palette, preferences, and keyboard. */
export default function App() {
  useKeyboard();
  useFsWatcher();
  useCliOpen();
  useSettingsPersistence();
  useSessionPersistence();
  useCloseGuard();

  const resolvedTheme = useUiStore((s) => s.resolvedTheme);
  const themeSetting = useUiStore((s) => s.themeSetting);
  const paletteOpen = useUiStore((s) => s.paletteOpen);
  const settingsOpen = useUiStore((s) => s.settingsOpen);
  const exportOpen = useUiStore((s) => s.exportOpen);
  const aboutOpen = useUiStore((s) => s.aboutOpen);
  const zoom = useUiStore((s) => s.zoom);
  const fontFamily = useUiStore((s) => s.fontFamily);
  const fontSize = useUiStore((s) => s.fontSize);

  // Apply the resolved theme whenever it changes.
  useEffect(() => {
    applyTheme(resolvedTheme);
    applyEditorSyntaxVars(resolvedTheme);
    markStartupPhase("interactive");
    reportInteractive();
  }, [resolvedTheme]);

  // Track OS scheme changes while following the system setting.
  useEffect(() => {
    if (themeSetting !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: light)");
    const onChange = (): void => useUiStore.getState().setTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [themeSetting]);

  // Editor typography, applied as CSS variables the editor theme consumes.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty(
      "--font-mono",
      `"${fontFamily}", "Cascadia Code", Consolas, ui-monospace, monospace`,
    );
    root.style.setProperty("--editor-font-size", `${fontSize}px`);
  }, [fontFamily, fontSize]);

  // Whole-app zoom. `zoom` is a Chromium (WebView2) property — our Windows target.
  useEffect(() => {
    (document.body.style as CSSStyleDeclaration & { zoom?: string }).zoom = String(1 + zoom * 0.1);
  }, [zoom]);

  return (
    <>
      <AppShell />
      {/* No fallback: an overlay that has not loaded yet should show nothing, not a
          placeholder box over the document. */}
      <Suspense fallback={null}>
        {paletteOpen ? <CommandPalette /> : null}
        {settingsOpen ? <SettingsDialog /> : null}
        {exportOpen ? <ExportDialog /> : null}
        {aboutOpen ? <AboutDialog /> : null}
      </Suspense>
    </>
  );
}
