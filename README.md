# Notepad Super Plus — Planning Repository

> A lightweight, MIT-licensed desktop Markdown editor: Notepad++-fast, GitHub-faithful rendering, and nothing you don't need.
> **Status: architecture & planning phase. No code yet — by design.**

This repository currently contains the complete pre-implementation documentation set. Implementation begins only after the architecture is approved (see [docs/20_Master_Project_Plan.md](docs/20_Master_Project_Plan.md) §5).

## The decision in one paragraph

After a weighted six-way evaluation (Electron, Tauri, Flutter, Qt, Avalonia, native Rust — [docs/02_Technology_Evaluation.md](docs/02_Technology_Evaluation.md)), the stack is **Tauri 2 + Rust core, React + TypeScript + Vite UI, CodeMirror 6, unified (remark/rehype) in a Web Worker, Shiki, Zustand, TOML config**. It is the only option that delivers both web-grade Markdown rendering *and* the hard budgets: **< 500 ms cold start, < 150 MB idle RAM, < 15 MB installer, 100 MB files without freezing, zero telemetry.**

## Read the docs

Start at **[docs/20_Master_Project_Plan.md](docs/20_Master_Project_Plan.md)** — it indexes all 21 documents (vision → requirements → architecture → security → performance → testing → 12-phase build plan → release process).

## Planned repository shape (post-approval)

See [docs/03_System_Architecture.md](docs/03_System_Architecture.md) §4 — pnpm monorepo: `apps/desktop` (Tauri app: React `src/` + Rust `src-tauri/`), `packages/markdown-core`, `packages/themes`, plus `docs/`, `design/`, `specifications/`, `tests/`, `scripts/`, `.github/workflows/`.

## License

MIT (applies to all code once implementation begins; documentation likewise).
