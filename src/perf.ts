/**
 * Startup performance instrumentation.
 *
 * Records `performance.mark`s for each boot phase so the startup budget
 * (< 500 ms cold start — docs/09_Performance_Strategy.md §2) can be inspected in
 * devtools, and reports the interactive moment to the Rust side so
 * `scripts/bench/startup.ps1` can measure it.
 *
 * Startup cannot be timed from outside the process: the native window handle exists
 * long before WebView2 paints, so an external observer sees ~40 ms for a window that
 * is not yet usable. Only the UI knows when it is actually interactive.
 */

export type StartupPhase = "script-eval" | "react-mounted" | "first-paint" | "interactive";

const PREFIX = "nsp:startup:";

export function markStartupPhase(phase: StartupPhase): void {
  if (typeof performance === "undefined" || !performance.mark) return;
  performance.mark(`${PREFIX}${phase}`);
}

/** Milliseconds from navigation start to the given phase, if it was marked. */
export function phaseSinceNavigation(phase: StartupPhase): number | undefined {
  if (typeof performance === "undefined" || !performance.getEntriesByName) return undefined;
  const [entry] = performance.getEntriesByName(`${PREFIX}${phase}`, "mark");
  return entry?.startTime;
}

let reported = false;

/**
 * Tells the Rust side the UI is interactive, once per session. The command is a
 * no-op unless `NSP_BENCH_OUT` is set, so this costs one fire-and-forget IPC call
 * and never blocks paint.
 */
export function reportInteractive(): void {
  if (reported) return;
  reported = true;
  // The in-page phases are sent along so the harness can attribute the total:
  // everything before `navigation` is process start + WebView2 boot, which no amount
  // of frontend work can reduce. Guessing at that split once already produced an
  // "optimisation" that made startup slower.
  const inPage = {
    scriptEval: phaseSinceNavigation("script-eval") ?? 0,
    reactMounted: phaseSinceNavigation("react-mounted") ?? 0,
    interactive: phaseSinceNavigation("interactive") ?? 0,
  };
  // Imported lazily so the Tauri API is not on the critical path in a browser dev
  // session, where `invoke` would reject anyway.
  void import("@tauri-apps/api/core")
    .then(({ invoke }) => invoke("bench_ready", { inPage }))
    .catch(() => {
      /* not running under Tauri, or the command is unavailable — benchmarking only */
    });
}
