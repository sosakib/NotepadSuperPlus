import { invoke } from "@tauri-apps/api/core";

/** Typed wrapper over the Rust workspace-search command (docs/16 §3). */

export interface SearchOptions {
  regex: boolean;
  caseSensitive: boolean;
  wholeWord: boolean;
  respectGitignore: boolean;
}

export interface SearchMatch {
  path: string;
  line: number;
  column: number;
  preview: string;
}

export interface SearchResults {
  matches: SearchMatch[];
  filesSearched: number;
  truncated: boolean;
}

export function searchWorkspace(
  root: string,
  query: string,
  options: SearchOptions,
): Promise<SearchResults> {
  return invoke<SearchResults>("search_workspace", { query: { root, query, ...options } });
}
