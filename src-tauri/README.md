# `src-tauri/` — Rust core

The native core process: filesystem, watcher, workspace search, encoding, session/config
persistence, dialogs, window/menu, updater. The webview has **no** direct filesystem access —
everything goes through the scoped command catalog in
[docs/16_API_Design.md](../docs/16_API_Design.md).

Populated in **Stage 1+** ([ROADMAP.md](../docs/ROADMAP.md)). Planned structure
([docs/03_System_Architecture.md](../docs/03_System_Architecture.md) §4):

```
src-tauri/
├── src/
│   ├── commands/   # thin IPC command handlers
│   ├── fs/ watcher/ search/ session/ config/ export/
│   └── error.rs    # NspError taxonomy
├── capabilities/   # Tauri permission manifests (least privilege)
└── tauri.conf.json
```

Rust rules: `#![forbid(unsafe_code)]` in the core, no `unwrap()`/`expect()` outside tests,
every command = validate → scope-check → work (docs/13 §2, docs/08 §3).

> No application code yet — this file keeps the directory tracked during Stage 0.
