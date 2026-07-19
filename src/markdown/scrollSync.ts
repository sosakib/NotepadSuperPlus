import { EditorView } from "@codemirror/view";
import { getActiveView } from "../editor/editorRegistry.ts";

/**
 * Source <-> preview scroll synchronization (docs/03 §3.3, docs/06 §3).
 * Mapping uses the `data-source-line` attributes stamped on top-level preview
 * blocks by the render pipeline. Leader/follower with a short echo-suppression
 * lock prevents feedback loops.
 */

let previewEl: HTMLElement | null = null;
let lockUntil = 0;

export function registerPreview(el: HTMLElement | null): void {
  previewEl = el;
}

const locked = (): boolean => Date.now() < lockUntil;
const lock = (): void => {
  lockUntil = Date.now() + 120;
};

interface Anchor {
  line: number;
  top: number;
}

function previewAnchors(): Anchor[] {
  if (!previewEl) return [];
  const nodes = previewEl.querySelectorAll<HTMLElement>("[data-source-line]");
  const anchors: Anchor[] = [];
  for (const node of nodes) {
    const line = Number(node.dataset.sourceLine);
    if (!Number.isNaN(line)) anchors.push({ line, top: node.offsetTop });
  }
  return anchors;
}

/** Preview scroll offset that aligns the given source line to the top. */
function previewTopForLine(line: number): number | null {
  const anchors = previewAnchors();
  const first = anchors[0];
  if (!first) return null;
  let chosen = first;
  for (const a of anchors) {
    if (a.line <= line) chosen = a;
    else break;
  }
  return chosen.top;
}

/** Source line most closely aligned with the current preview scroll position. */
function lineForPreviewTop(scrollTop: number): number | null {
  const anchors = previewAnchors();
  const first = anchors[0];
  if (!first) return null;
  let chosen = first;
  for (const a of anchors) {
    if (a.top <= scrollTop + 4) chosen = a;
    else break;
  }
  return chosen.line;
}

function editorTopLine(view: EditorView): number {
  const block = view.lineBlockAtHeight(view.scrollDOM.scrollTop);
  return view.state.doc.lineAt(block.from).number;
}

function scrollEditorToLine(view: EditorView, line: number): void {
  const clamped = Math.max(1, Math.min(line, view.state.doc.lines));
  const pos = view.state.doc.line(clamped).from;
  view.scrollDOM.scrollTop = view.lineBlockAt(pos).top;
}

/** Editor scrolled: move the preview to match (leader = editor). */
export function syncPreviewToEditor(): void {
  if (locked() || !previewEl) return;
  const view = getActiveView();
  if (!view) return;
  const top = previewTopForLine(editorTopLine(view));
  if (top === null) return;
  lock();
  previewEl.scrollTop = top;
}

/** Preview scrolled: move the editor to match (leader = preview). */
export function syncEditorToPreview(): void {
  if (locked() || !previewEl) return;
  const view = getActiveView();
  if (!view) return;
  const line = lineForPreviewTop(previewEl.scrollTop);
  if (line === null) return;
  lock();
  scrollEditorToLine(view, line);
}

/** Jump both panes to a source line (used by the outline). */
export function revealSourceLine(line: number): void {
  const view = getActiveView();
  if (view) scrollEditorToLine(view, line);
  if (previewEl) {
    const top = previewTopForLine(line);
    if (top !== null) previewEl.scrollTop = top;
  }
}
