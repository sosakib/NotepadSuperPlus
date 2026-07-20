import { createRequire } from "node:module";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const require = createRequire(import.meta.url);

// Tauri expects a fixed port and no clearing of the terminal so its own logs survive.
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // The Markdown pipeline runs in a Web Worker (no `document`). This dependency
      // otherwise resolves to its browser `.dom.js` build, which calls
      // `document.createElement`. Force the DOM-free entry so the worker doesn't crash.
      "decode-named-character-reference": require.resolve("decode-named-character-reference"),
    },
  },
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
    // Everything in dist/ is embedded into the installer; .map files would
    // triple the frontend payload. Keep maps in dev (served on demand) only.
    sourcemap: false,
  },
});
