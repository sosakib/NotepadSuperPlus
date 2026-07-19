import { invoke } from "@tauri-apps/api/core";

/**
 * Typed wrappers over the Rust filesystem commands (docs/16 §3). Stores never call
 * `invoke` directly — they go through this layer so it can be mocked in tests.
 */

export interface FileContent {
  path: string;
  content: string;
  encoding: string;
  eol: string;
  readonly: boolean;
  mtimeMs: number;
}

export interface SaveResult {
  path: string;
  mtimeMs: number;
}

export function readFile(path: string): Promise<FileContent> {
  return invoke<FileContent>("fs_read_file", { path });
}

export function writeFile(args: {
  path: string;
  content: string;
  encoding: string;
  eol: string;
}): Promise<SaveResult> {
  return invoke<SaveResult>("fs_write_file", args);
}

export async function unwatch(path: string): Promise<void> {
  await invoke("fs_unwatch", { path });
}

export function recentList(): Promise<string[]> {
  return invoke<string[]>("recent_list");
}
