import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { renderMarkdown } from "../markdown/render.ts";
import * as fsIpc from "../ipc/fs.ts";
import { getDocText } from "../editor/editorRegistry.ts";
import { useDocumentsStore } from "../state/documents.ts";
import { useUiStore } from "../state/ui.ts";

/**
 * Document export (docs/01 FR-9.4). HTML export renders the Markdown through the
 * same sanitizing pipeline as the preview, so an export is exactly as safe as what
 * you see on screen (docs/08 §4) — and actually contains rendered HTML rather than
 * raw Markdown. Files are written through the Rust core, not a browser download,
 * which the Tauri webview does not support.
 */

export type ExportFormat = "html" | "md" | "txt";

const EXTENSIONS: Record<ExportFormat, string> = { html: "html", md: "md", txt: "txt" };

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

/** Minimal self-contained styling so the exported page reads well anywhere. */
const DOCUMENT_CSS = `
:root { color-scheme: light dark; }
body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; line-height: 1.7;
  max-width: 820px; margin: 2.5rem auto; padding: 0 1.25rem; }
h1, h2 { border-bottom: 1px solid rgba(128,128,128,.3); padding-bottom: .3em; }
code { font-family: ui-monospace, "Cascadia Code", Consolas, monospace; font-size: .9em;
  background: rgba(128,128,128,.15); padding: .15em .4em; border-radius: 4px; }
pre { background: rgba(128,128,128,.12); padding: 1rem; border-radius: 6px; overflow-x: auto; }
pre code { background: none; padding: 0; }
blockquote { margin: 0 0 1em; padding: .2em 1em; border-left: 3px solid rgba(128,128,128,.5);
  color: rgba(128,128,128,1); }
table { border-collapse: collapse; }
th, td { border: 1px solid rgba(128,128,128,.4); padding: .4em .85em; }
img { max-width: 100%; }
`.trim();

/** Builds the exported file contents. Exported for testing. */
export async function buildExport(
  text: string,
  format: ExportFormat,
  title: string,
): Promise<string> {
  if (format !== "html") return text;
  const { html } = await renderMarkdown(text);
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(title)}</title>`,
    `<style>\n${DOCUMENT_CSS}\n</style>`,
    "</head>",
    "<body>",
    html,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

/** Exports the active document. Returns true when a file was written. */
export async function exportDocument(format: ExportFormat): Promise<boolean> {
  const { activeId, docs } = useDocumentsStore.getState();
  if (!activeId) return false;
  const doc = docs[activeId];
  if (!doc) return false;

  try {
    const content = await buildExport(getDocText(activeId), format, doc.title);
    const base = doc.title.replace(/\.[^.]+$/, "") || "document";
    const extension = EXTENSIONS[format];

    const target = await saveDialog({
      defaultPath: `${base}.${extension}`,
      filters: [{ name: extension.toUpperCase(), extensions: [extension] }],
    });
    if (typeof target !== "string") return false;

    await fsIpc.writeFile({ path: target, content, encoding: "utf-8", eol: doc.eol });
    useUiStore.getState().setStatus(`Exported ${target}`);
    return true;
  } catch (e) {
    const err = e as { message?: string };
    useUiStore.getState().setStatus(err?.message ?? "Export failed.");
    console.error("export failed:", e);
    return false;
  }
}
