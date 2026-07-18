# 17 — Plugin System Proposal (Design Only — No v1 Implementation)

**Status:** Proposal. Nothing in v1 executes third-party code. This document exists so v1 architecture doesn't paint plugins into a corner, and so the community debate happens on a concrete design.
**Related:** [08_Security_Model.md](08_Security_Model.md) · [11_Roadmap.md](11_Roadmap.md) v2.0 · [16_API_Design.md](16_API_Design.md)

---

## 1. Goals & non-goals

**Goals:** let the community extend Markdown rendering, editor commands, themes, and export formats without forking; keep the core's performance budgets and security guarantees intact; version the API so plugins survive app updates.

**Non-goals:** a VS Code-scale extension host; plugins with arbitrary fs/network access; plugins on the typing hot path; monetized marketplace.

## 2. Extension points (proposed, narrowest-first)

| Tier | Extension point | Risk | Notes |
|---|---|---|---|
| 0 (already v1) | **Themes** — token JSON | none (data-only) | shipped, [04] §4 |
| 1 | **Markdown transforms** — remark/rehype plugins run inside the render worker | low-medium | pure AST→AST functions; biggest community value (custom callouts, embeds, directives) |
| 2 | **Commands & UI contributions** — palette commands, status-bar items, sidebar panels (declarative) | medium | no arbitrary DOM access; contributions are schema-described, host renders them |
| 3 | **Exporters** — document AST → bytes | medium | run as jobs, not resident |

Anything needing raw fs/network/process access: not an extension point. Ever.

## 3. Execution & sandbox model

- **Runtime:** plugins are JS/WASM modules executed in **dedicated Web Workers** (one per plugin) with no DOM, no `fetch` (CSP `connect-src` already blocks; worker additionally created with restricted permissions), communicating only via a structured-clone message protocol.
- **Capability tokens:** manifest declares needs (`transform:markdown`, `contribute:command`, `read:activeDocumentText`); host grants per-user-approval; undeclared = unreachable. Mirrors Tauri's own capability philosophy one level up.
- **Resource governance:** per-plugin CPU watchdog (transform > 50 ms p95 → plugin flagged "slow", auto-disabled from hot path with user notice); memory cap per worker; crash isolation (worker death never touches the app).
- **Hot path protection:** tier-1 transforms run *after* core render for the incremental path or in the idle full-render pass — a slow plugin degrades its own output freshness, never typing latency ([09] budgets remain sovereign).

## 4. Manifest & versioning (sketch)

```toml
# plugin.toml
id = "com.example.admonitions"
name = "Admonitions+"
version = "1.2.0"
api = "^1.0"                     # plugin API semver, independent of app version
entry = "dist/plugin.js"         # or .wasm
capabilities = ["transform:markdown"]
sandbox = { maxTransformMs = 20 }
```

API package `@nsp/plugin-api` publishes typed interfaces; app ships N and N−1 major API versions during deprecation windows.

## 5. Distribution (roadmap sketch)

Phase A: manual install (drop folder into `plugins/`, app verifies manifest + shows capability consent). Phase B: community index = a static Git repo of manifests + signed archives (no server to run, PR = submission review). Signing: archive hash signed by index maintainers; app verifies before load. "Marketplace" UI is a browser of that index. No auto-install from URLs, ever.

## 6. What v1 must do to keep this possible (binding on current work)

1. Render pipeline stays AST-first with a documented plugin insertion point in `markdown-core` (unified already gives this — decision reinforced, [02] §5).
2. Command registry ([05] §4) keyed by namespaced ids — plugin commands become `plugin.<id>.<cmd>` with zero registry changes.
3. Sidebar panel host supports declarative panel registration (v1 uses it for its own three panels).
4. Worker manager abstracts worker creation (v1: md + shiki) so plugin workers reuse lifecycle/watchdog machinery.
5. Theme loading already validates + hot-loads external JSON — the consent UX built there becomes the pattern.

## 7. Open questions (to resolve before any implementation)

WASM-only vs JS+WASM (WASM sandboxes harder but authors prefer JS)? Renderer contributions for tier 2 — declarative schema vs sanitized HTML fragments? Plugin settings surface — namespaced TOML section vs per-plugin file? API stability promise timing — gate on 3 months of internal-plugin dogfooding? Each gets an RFC in Discussions before the v2.0 go/no-go ([11]).
