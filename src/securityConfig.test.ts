import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Vitest runs from the repo root; `import.meta.url` is not a file URL under jsdom.
const read = (p: string) => JSON.parse(readFileSync(resolve(process.cwd(), p), "utf8"));

describe("security configuration", () => {
  const conf = read("src-tauri/tauri.conf.json");
  const csp: string = conf.app.security.csp;
  const directive = (name: string) =>
    csp
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(`${name} `));

  it("CSP allows only first-party scripts", () => {
    expect(directive("script-src")).toBe("script-src 'self'");
    expect(csp).not.toContain("unsafe-eval");
    expect(directive("default-src")).toBe("default-src 'self'");
  });

  it("no global Tauri object for injected scripts", () => {
    expect(conf.app.withGlobalTauri).toBe(false);
  });

  it("capabilities stay least-privilege", () => {
    const cap = read("src-tauri/capabilities/default.json");
    const allowed = new Set([
      "core:default",
      "dialog:default",
      "opener:default",
      "core:window:allow-destroy",
    ]);
    for (const p of cap.permissions)
      expect(allowed.has(p), `unexpected permission ${p}`).toBe(true);
    expect(cap.remote).toBeUndefined();
  });
});
