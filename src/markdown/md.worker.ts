/// <reference lib="webworker" />
import { renderMarkdown, type OutlineHeading, type DocStats } from "./render.ts";

declare const self: DedicatedWorkerGlobalScope;

export interface RenderRequest {
  docId: string;
  version: number;
  text: string;
}

export interface RenderResponse {
  docId: string;
  version: number;
  html: string;
  outline: OutlineHeading[];
  stats: DocStats;
}

self.onmessage = async (e: MessageEvent<RenderRequest>) => {
  const { docId, version, text } = e.data;
  const { html, outline, stats } = await renderMarkdown(text);
  const response: RenderResponse = { docId, version, html, outline, stats };
  self.postMessage(response);
};
