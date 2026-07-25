/// <reference lib="webworker" />
import { renderMarkdown, type OutlineHeading, type DocStats } from "./render.ts";
import type { Frontmatter } from "./frontmatter.ts";

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
  frontmatter: Frontmatter | null;
}

self.onmessage = async (e: MessageEvent<RenderRequest>) => {
  const { docId, version, text } = e.data;
  const { html, outline, stats, frontmatter } = await renderMarkdown(text);
  const response: RenderResponse = { docId, version, html, outline, stats, frontmatter };
  self.postMessage(response);
};
