import { open as openDialog } from "@tauri-apps/plugin-dialog";
import * as ws from "../ipc/workspace.ts";
import { useWorkspaceStore } from "../state/workspace.ts";
import { useUiStore } from "../state/ui.ts";
import { parentDir } from "../utils/path.ts";

/**
 * Workspace/explorer operations. Every mutation refreshes the affected directory
 * so the tree stays truthful even if the watcher event is missed.
 */

function reportError(e: unknown): void {
  const err = e as { message?: string };
  useUiStore.getState().setStatus(err?.message ?? "Operation failed.");
  console.error("workspace action failed:", e);
}

export async function openFolder(): Promise<void> {
  try {
    const selected = await openDialog({ directory: true, multiple: false });
    if (typeof selected !== "string") return;
    const entries = await ws.openWorkspace(selected);
    useWorkspaceStore.getState().setRoot(selected, entries);
    useUiStore.getState().setStatus(`Opened folder ${selected}`);
  } catch (e) {
    reportError(e);
  }
}

/** Loads a directory's children if not already cached. */
export async function loadDir(path: string): Promise<void> {
  const { children, setChildren } = useWorkspaceStore.getState();
  if (children[path]) return;
  try {
    setChildren(path, await ws.listDir(path));
  } catch (e) {
    reportError(e);
  }
}

export async function refreshDir(path: string): Promise<void> {
  try {
    useWorkspaceStore.getState().setChildren(path, await ws.listDir(path));
  } catch {
    /* directory may have been removed — ignore */
  }
}

export async function toggleDir(path: string): Promise<void> {
  const store = useWorkspaceStore.getState();
  const willOpen = !store.expanded[path];
  store.setExpanded(path, willOpen);
  if (willOpen) await loadDir(path);
}

export async function createEntry(dir: string, name: string, isDir: boolean): Promise<void> {
  try {
    await ws.createEntry(dir, name, isDir);
    await refreshDir(dir);
    useWorkspaceStore.getState().setExpanded(dir, true);
  } catch (e) {
    reportError(e);
  }
}

export async function renameEntry(path: string, newName: string): Promise<void> {
  try {
    await ws.renameEntry(path, newName);
    await refreshDir(parentDir(path));
  } catch (e) {
    reportError(e);
  }
}

export async function deleteEntry(path: string): Promise<void> {
  try {
    await ws.trashEntry(path);
    await refreshDir(parentDir(path));
    useUiStore.getState().setStatus("Moved to trash.");
  } catch (e) {
    reportError(e);
  }
}

export async function duplicateEntry(path: string): Promise<void> {
  try {
    await ws.duplicateEntry(path);
    await refreshDir(parentDir(path));
  } catch (e) {
    reportError(e);
  }
}
