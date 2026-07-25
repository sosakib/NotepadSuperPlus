import { invoke } from "@tauri-apps/api/core";

/** Typed wrapper over the Rust session commands (FR-6.4, docs/06 §8). */

export interface SessionTab {
  path: string;
  /** 1-based caret line. */
  line: number;
  /** 1-based caret column. */
  column: number;
}

export interface SessionSnapshot {
  tabs: SessionTab[];
  /** Index into `tabs`, or null when nothing was open. */
  active: number | null;
  viewMode: string;
  /** Workspace root, reopened on boot when it still exists. */
  workspace: string | null;
}

/** The previous session, already pruned of files that no longer exist. */
export function loadSession(): Promise<SessionSnapshot> {
  return invoke<SessionSnapshot>("session_get");
}

export function saveSession(snapshot: SessionSnapshot): Promise<SessionSnapshot> {
  return invoke<SessionSnapshot>("session_save", { snapshot });
}
