/// <reference lib="webworker" />
import { renderMarkdown, type OutlineHeading } from "./render.ts";

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
}

self.onmessage = async (e: MessageEvent<RenderRequest>) => {
  const { docId, version, text } = e.data;
  const { html, outline } = await renderMarkdown(text);
  const response: RenderResponse = { docId, version, html, outline };
  self.postMessage(response);
};
