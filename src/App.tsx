import { useEffect } from "react";
import { AppShell } from "./shell/AppShell.tsx";
import { CommandPalette } from "./palette/CommandPalette.tsx";
import { SettingsDialog } from "./components/SettingsDialog.tsx";
import { ExportDialog } from "./components/ExportDialog.tsx";
import { AboutDialog } from "./components/AboutDialog.tsx";
import { useKeyboard } from "./keyboard/useKeyboard.ts";
import { useFsWatcher } from "./actions/useFsWatcher.ts";
import { useUiStore } from "./state/ui.ts";
import { applyTheme } from "./theme/applyTheme.ts";
import { applyEditorSyntaxVars } from "./editor/theme.ts";
import { markStartupPhase } from "./perf.ts";

/** Main application entry: chrome, theming, palette, preferences, and keyboard. */
export default function App() {
  useKeyboard();
  useFsWatcher();

  const resolvedTheme = useUiStore((s) => s.resolvedTheme);
  const themeSetting = useUiStore((s) => s.themeSetting);
  const zoom = useUiStore((s) => s.zoom);

  // Apply the resolved theme whenever it changes.
  useEffect(() => {
    applyTheme(resolvedTheme);
    applyEditorSyntaxVars(resolvedTheme);
    markStartupPhase("interactive");
  }, [resolvedTheme]);

  // Track OS scheme changes while following the system setting.
  useEffect(() => {
    if (themeSetting !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: light)");
    const onChange = (): void => useUiStore.getState().setTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [themeSetting]);

  // Whole-app zoom. `zoom` is a Chromium (WebView2) property — our Windows target.
  useEffect(() => {
    (document.body.style as CSSStyleDeclaration & { zoom?: string }).zoom = String(1 + zoom * 0.1);
  }, [zoom]);

  return (
    <>
      <AppShell />
      <CommandPalette />
      <SettingsDialog />
      <ExportDialog />
      <AboutDialog />
    </>
  );
}

