import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import * as fsIpc from "../ipc/fs.ts";
import { useDocumentsStore, type DocMeta } from "../state/documents.ts";
import { useUiStore } from "../state/ui.ts";
import {
  pendingContent,
  pendingReveal,
  getDocText,
  replaceDocText,
} from "../editor/editorRegistry.ts";
import { renderController } from "../markdown/renderController.ts";
import { revealSourceLine } from "../markdown/scrollSync.ts";

/**
 * Orchestrates file open/save/reload across the dialog plugin, the Rust fs
 * commands, the document store, and the editor (docs/06 §1, §4). All operations
 * degrade gracefully when the Tauri runtime is absent (browser dev).
 */

const FILTERS = [
  { name: "Markdown", extensions: ["md", "markdown", "txt"] },
  { name: "All Files", extensions: ["*"] },
];

function reportError(e: unknown): void {
  const err = e as { message?: string };
  useUiStore.getState().setStatus(err?.message ?? "Operation failed.");
  console.error("fs action failed:", e);
}

export async function openFile(): Promise<void> {
  try {
    const selected = await openDialog({ multiple: false, filters: FILTERS });
    if (typeof selected !== "string") return;
    await openPath(selected);
  } catch (e) {
    reportError(e);
  }
}

export async function openPath(path: string, revealLine?: number): Promise<void> {
  try {
    const fc = await fsIpc.readFile(path);
    const wasActive = useDocumentsStore.getState().activeId;
    const { id, existing } = useDocumentsStore.getState().openDocument({
      path: fc.path,
      title: "",
      encoding: fc.encoding,
      eol: fc.eol,
      mtimeMs: fc.mtimeMs,
      readonly: fc.readonly,
    });
    if (!existing) {
      pendingContent.set(id, fc.content);
      renderController.requestRender(id, fc.content);
    }
    if (revealLine !== undefined) {
      // If the document was already the active one, its editor effect won't re-run,
      // so reveal immediately; otherwise let the state swap consume the request.
      if (existing && wasActive === id) {
        revealSourceLine(revealLine);
      } else {
        pendingReveal.set(id, revealLine);
      }
    }
    useUiStore.getState().setStatus(`Opened ${fc.path}`);
  } catch (e) {
    reportError(e);
  }
}

async function writeDoc(docId: string, path: string, doc: DocMeta): Promise<void> {
  const content = getDocText(docId);
  const res = await fsIpc.writeFile({ path, content, encoding: doc.encoding, eol: doc.eol });
  useDocumentsStore.getState().markSaved(docId, { path: res.path, mtimeMs: res.mtimeMs });
  useUiStore.getState().setStatus(`Saved ${res.path}`);
}

export async function saveFile(id?: string): Promise<void> {
  const docId = id ?? useDocumentsStore.getState().activeId;
  if (!docId) return;
  const doc = useDocumentsStore.getState().docs[docId];
  if (!doc) return;
  if (!doc.path) return saveFileAs(docId);
  try {
    await writeDoc(docId, doc.path, doc);
  } catch (e) {
    reportError(e);
  }
}

export async function saveFileAs(id?: string): Promise<void> {
  const docId = id ?? useDocumentsStore.getState().activeId;
  if (!docId) return;
  const doc = useDocumentsStore.getState().docs[docId];
  if (!doc) return;
  try {
    const target = await saveDialog({ defaultPath: doc.path ?? doc.filename, filters: FILTERS });
    if (typeof target !== "string") return;
    await writeDoc(docId, target, doc);
  } catch (e) {
    reportError(e);
  }
}

/** Re-reads a file from disk into an open document (external-change reload). */
export async function reloadPath(docId: string, path: string): Promise<void> {
  try {
    const fc = await fsIpc.readFile(path);
    replaceDocText(docId, fc.content);
    useDocumentsStore.getState().markSaved(docId, { path, mtimeMs: fc.mtimeMs });
    renderController.requestRender(docId, fc.content);
  } catch (e) {
    reportError(e);
  }
}
