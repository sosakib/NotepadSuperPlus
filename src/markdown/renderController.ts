import { useRenderStore } from "../state/render.ts";
import type { RenderRequest, RenderResponse } from "./md.worker.ts";

/**
 * Owns the Markdown render worker and the debounced request path (docs/06 §2).
 * The editor calls `requestRender` on every change; requests are debounced and
 * version-stamped so only the latest result per document wins. Rendering runs
 * entirely off the main thread.
 *
 * Callers pass a *thunk*, not a string: serializing the document is O(document)
 * and would otherwise run on every keystroke only to be discarded by the next
 * one. The text is materialized once, at flush time.
 */
class RenderController {
  private worker: Worker | null = null;
  private readonly versions = new Map<string, number>();
  private pending: { docId: string; version: number; getText: () => string } | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceMs = 90;

  private ensureWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL("./md.worker.ts", import.meta.url), { type: "module" });
      this.worker.onmessage = (e: MessageEvent<RenderResponse>) => {
        const { docId, version, html, outline, stats } = e.data;
        useRenderStore.getState().setResult(docId, { version, html, outline, stats });
      };
    }
    return this.worker;
  }

  /** Schedules a render. `getText` is only called if the request survives the debounce. */
  requestRender(docId: string, getText: () => string): void {
    const version = (this.versions.get(docId) ?? 0) + 1;
    this.versions.set(docId, version);
    this.pending = { docId, version, getText };
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), this.debounceMs);
  }

  private flush(): void {
    this.timer = null;
    const pending = this.pending;
    if (!pending) return;
    this.pending = null;
    const request: RenderRequest = {
      docId: pending.docId,
      version: pending.version,
      text: pending.getText(),
    };
    this.ensureWorker().postMessage(request);
  }

  /** Drops a document's render state (called when its tab closes). */
  forget(docId: string): void {
    this.versions.delete(docId);
    if (this.pending?.docId === docId) this.pending = null;
    useRenderStore.getState().clear(docId);
  }
}

export const renderController = new RenderController();
