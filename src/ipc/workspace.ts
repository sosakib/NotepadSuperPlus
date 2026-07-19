import { invoke } from "@tauri-apps/api/core";

/** Typed wrappers over the Rust workspace/explorer commands (docs/16 §3). */

export interface Entry {
  name: string;
  path: string;
  isDir: boolean;
  hasChildren: boolean;
  hidden: boolean;
}

export function openWorkspace(path: string): Promise<Entry[]> {
  return invoke<Entry[]>("ws_open", { path });
}

export function listDir(path: string): Promise<Entry[]> {
  return invoke<Entry[]>("fs_list_dir", { path });
}

export function createEntry(dir: string, name: string, isDir: boolean): Promise<Entry> {
  return invoke<Entry>("fs_create", { dir, name, isDir });
}

export function renameEntry(path: string, newName: string): Promise<Entry> {
  return invoke<Entry>("fs_rename", { path, newName });
}

export async function trashEntry(path: string): Promise<void> {
  await invoke("fs_trash", { path });
}

export function duplicateEntry(path: string): Promise<Entry> {
  return invoke<Entry>("fs_duplicate", { path });
}
