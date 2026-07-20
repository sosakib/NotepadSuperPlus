import { useRenderStore } from "../state/render.ts";
import type { RenderRequest, RenderResponse } from "./md.worker.ts";

/**
 * Owns the Markdown render worker and the debounced request path (docs/06 §2).
 * The editor calls `requestRender` on every change; requests are debounced and
 * version-stamped so only the latest result per document wins. Rendering runs
 * entirely off the main thread.
 */
class RenderController {
  private worker: Worker | null = null;
  private readonly versions = new Map<string, number>();
  private pending: RenderRequest | null = null;
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

  requestRender(docId: string, text: string): void {
    const version = (this.versions.get(docId) ?? 0) + 1;
    this.versions.set(docId, version);
    this.pending = { docId, version, text };
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), this.debounceMs);
  }

  private flush(): void {
    if (!this.pending) return;
    this.ensureWorker().postMessage(this.pending);
    this.pending = null;
    this.timer = null;
  }

  forget(docId: string): void {
    this.versions.delete(docId);
    useRenderStore.getState().clear(docId);
  }
}

export const renderController = new RenderController();
