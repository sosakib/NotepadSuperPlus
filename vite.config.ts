import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tauri expects a fixed port and no clearing of the terminal so its own logs survive.
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Prevent Vite from obscuring Rust errors.
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: {
      // Don't watch the Rust core; it has its own rebuild loop.
      ignored: ["**/src-tauri/**"],
    },
  },
  // Produce output the Tauri config points at (../dist relative to src-tauri).
  build: {
    outDir: "dist",
    target: "esnext",
    sourcemap: true,
  },
});
