/**
 * Startup performance instrumentation (stub).
 *
 * Records `performance.mark`s for each boot phase so the startup budget
 * (< 500 ms cold start — docs/09_Performance_Strategy.md §2) can be measured
 * by the bench harness added in Stage 10. The Rust side emits matching
 * `tracing` spans; a session id will later stitch the two timelines together.
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
