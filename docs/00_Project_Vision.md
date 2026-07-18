# 00 — Project Vision

**Project:** Notepad Super Plus
**License:** MIT
**Status:** Planning — architecture phase
**Related:** [01_Product_Requirements.md](01_Product_Requirements.md) · [02_Technology_Evaluation.md](02_Technology_Evaluation.md) · [20_Master_Project_Plan.md](20_Master_Project_Plan.md)

---

## 1. One-line vision

A desktop Markdown editor that launches as fast as Notepad++, renders as beautifully as GitHub, and stays out of your way like a good text editor should.

## 2. The problem

Markdown is the lingua franca of technical writing — READMEs, docs, notes, specs, AI-generated output. Yet the tooling landscape forces a bad trade-off:

| Tool | What it gets right | What it gets wrong |
|---|---|---|
| Notepad++ | Instant launch, tiny footprint | No rendering, dated UI, Windows-only |
| VS Code | Great editing, good preview | 300+ MB RAM idle, slow cold start, IDE complexity |
| Obsidian | Beautiful rendering, outline | Vault lock-in, plugin sprawl, Electron weight |
| Typora | Elegant WYSIWYG | Closed source, paid, no raw-mode parity |
| Web viewers | Perfect GitHub rendering | Not local, not editable, not offline |

Nobody ships the intersection: **fast + light + beautiful + open + Markdown-only**.

## 3. The product

Notepad Super Plus is a cross-platform (Windows / macOS / Linux) desktop application dedicated exclusively to viewing, editing, and managing Markdown documents, with first-class support for adjacent plain-text formats (`.txt`, `.json`, `.yaml`, `.toml`, code files) as read/edit citizens.

Three modes, one document:

1. **Source mode** — raw Markdown, professional text editing (CodeMirror 6).
2. **Preview mode** — GitHub-flavored rendered output, pixel-considered typography.
3. **Split mode** — source left, preview right, synchronized scroll and cursor.

Plus a **Structure View**: a live heading outline (H1–H6) for navigation, collapse/expand, and search — the feature that makes large documents navigable.

## 4. Design principles

1. **Speed is a feature.** Cold start < 500 ms, idle RAM < 150 MB, 100 MB files without freezing. Every feature is measured against these budgets ([09_Performance_Strategy.md](09_Performance_Strategy.md)).
2. **Markdown only.** No task manager, no database, no sync service, no AI assistant. Feature requests outside Markdown editing/viewing are declined by policy ([19_Future_Features.md](19_Future_Features.md) defines the boundary).
3. **Local and private.** Fully offline. Zero telemetry, zero analytics, zero network calls except user-initiated update checks ([08_Security_Model.md](08_Security_Model.md)).
4. **Open by default.** MIT license, public roadmap, contributor-friendly repository ([15_Contribution_Guide.md](15_Contribution_Guide.md)).
5. **Premium restraint.** UI inspired by Linear, Apple HIG, and Claude's document rendering: minimal chrome, subtle motion, typography-first ([04_UI_UX_Guidelines.md](04_UI_UX_Guidelines.md)).

## 5. Target users

- **Developers** — editing READMEs, changelogs, ADRs; expect Notepad++-grade responsiveness and regex search.
- **Technical writers** — long documents; need outline navigation, split view, export.
- **Note-takers** — folders of Markdown notes; need file tree, tabs, fast open, favorites.
- **AI-tool users** — increasingly receive large Markdown artifacts (Claude, ChatGPT output); need a fast local viewer that renders them faithfully.

## 6. Non-goals

- WYSIWYG-only editing (Typora clone) — raw mode is always primary.
- Knowledge-graph / backlink database (Obsidian clone) — wiki links are a future rendering nicety only.
- Cloud sync, accounts, collaboration — files belong to the filesystem.
- General-purpose IDE features — no debugger, terminal, or LSP beyond Markdown needs.
- Mobile — desktop-only.

## 7. Success criteria (v1.0)

| Metric | Target |
|---|---|
| Cold start (warm disk, mid-range hardware) | < 500 ms |
| Idle memory | < 150 MB |
| Installer size | < 15 MB (Windows/Linux), < 20 MB (macOS universal) |
| Open + render 100 MB / 100k-line file | < 2 s to first paint, no UI freeze |
| GitHub Markdown rendering parity | ≥ 95 % of GFM spec cases visually correct |
| Platforms | Windows 10+, macOS 12+, Ubuntu 20.04+ (and AppImage) |
| Accessibility | Keyboard-complete, screen-reader labeled ([01_Product_Requirements.md](01_Product_Requirements.md) §10) |

## 8. Why now

- **Tauri 2 is mature** — the "fast, small, Rust-backed webview app" architecture is production-proven (see [02_Technology_Evaluation.md](02_Technology_Evaluation.md)).
- **Markdown volume is exploding** — AI tooling generates Markdown at unprecedented scale; the "fast local Markdown viewer" niche is underserved.
- **Electron fatigue is real** — users actively seek lightweight alternatives; a genuinely light editor is a differentiator, not a nicety.

## 9. Document map

This vision is elaborated across the `/docs` set; [20_Master_Project_Plan.md](20_Master_Project_Plan.md) is the index and single source of truth for sequencing.
