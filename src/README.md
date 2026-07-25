# `src/` — Frontend (React + TypeScript)

The webview UI. Populated in **Stage 1+** ([ROADMAP.md](../docs/ROADMAP.md)). Planned structure
mirrors [docs/03_System_Architecture.md](../docs/03_System_Architecture.md) §4:

```
src/
├── components/   # reusable UI primitives (Button, Tree, Tooltip, Menu, Dialog…)
├── editor/       # CodeMirror 6 setup, extensions, keymaps
├── viewer/       # preview renderer, block patcher, virtualizer
├── sidebar/      # file explorer, outline (Structure View), panels
├── search/       # find bar, workspace search UI
├── settings/     # settings UI + schema
├── renderer/     # unified pipeline config, worker clients
├── state/        # Zustand stores
├── workers/      # md.worker.ts, shiki.worker.ts
├── ipc/          # typed invoke wrappers + event subscriptions
└── styles/       # design tokens, themes
```

> No application code yet — this file keeps the directory tracked during Stage 0.
