import { invoke } from "@tauri-apps/api/core";

/** Typed wrapper over the Rust settings commands (docs/16 §3). */

export interface AppConfig {
  theme: string;
  wordWrap: boolean;
  fontFamily: string;
  fontSize: number;
  zoom: number;
  sidebarWidth: number;
  splitRatio: number;
  showHiddenFiles: boolean;
}

export function loadConfig(): Promise<AppConfig> {
  return invoke<AppConfig>("config_get");
}

export function saveConfig(settings: AppConfig): Promise<AppConfig> {
  return invoke<AppConfig>("config_save", { settings });
}

export function configPath(): Promise<string> {
  return invoke<string>("config_path");
}
