import { useEffect, useState } from "react";
import { markStartupPhase } from "./perf.ts";

/**
 * Stage 1 shell: an intentionally empty window that proves the toolchain is wired
 * (Tauri + Rust core + React + TypeScript + Vite). Real chrome — title bar, sidebar,
 * command palette, status bar — arrives in Stage 2 (see ROADMAP.md).
 */
export default function App(): JSX.Element {
  const [version, setVersion] = useState<string>("…");

  useEffect(() => {
    markStartupPhase("interactive");

    // Verify the IPC bridge is alive by asking the Rust core for the app version.
    // Guarded so `pnpm dev` in a plain browser (no Tauri runtime) still renders.
    let cancelled = false;
    void (async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const v = await invoke<string>("app_version");
        if (!cancelled) setVersion(v);
      } catch {
        if (!cancelled) setVersion("browser (no Tauri runtime)");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="app-shell">
      <h1>Notepad Super Plus</h1>
      <p className="tagline">Lightweight Markdown editor — Windows-first.</p>
      <p className="meta">
        Stage 1 · build system online · core reports version <code>{version}</code>
      </p>
    </main>
  );
}
