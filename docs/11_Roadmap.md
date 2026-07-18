# 11 — Roadmap

**Related:** [12_Implementation_Phases.md](12_Implementation_Phases.md) · [19_Future_Features.md](19_Future_Features.md) · [17_Plugin_System_Proposal.md](17_Plugin_System_Proposal.md)

Semantic versioning ([14] §6). Milestones map 1:1 to GitHub Milestones. Dates are targets, scope is the commitment — scope slips before quality does.

---

## v0.1 — "Skeleton" (internal)

Tauri shell boots under budget; CM6 editing; open/save single file; source mode only; CI green on 3 OS.
*Exit: NFR-1 measured < 400 ms on empty shell (headroom reserved for features).*

## v0.2 — "Reader" (first public pre-release)

Markdown worker pipeline; preview + split mode with scroll sync; outline panel; dark/light themes; GFM conformance ≥ 90 %.

## v0.3 — "Workspace"

File explorer + watcher; tabs + session restore; in-file find/replace; recent files; encodings matrix complete.

## v0.4 — "Search & Settings"

Workspace search (streaming, gitignore); settings UI + TOML; keymap remapping; command palette complete; high-contrast theme.

## v0.5 — "Polish" (beta)

Smart lists / pair-close / table nav; checkbox write-back; paste-image; export HTML; bundled theme pack (GitHub/Nord/Dracula/Catppuccin/Solarized); a11y audit pass; crash-draft recovery.

## v1.0 — "Release"

All P0 requirements ([01]) shipped and verified; GFM parity ≥ 95 %; performance budgets green on 3 OS; signed installers + updater; docs site; security review complete ([18] full gate).
*Target: ~12 months from Phase 1 start ([12] §14 effort model).*

## v1.x (P1 backlog, priority order)

1. Math (KaTeX) + Mermaid + callouts + emoji (FR-3.4–3.7)
2. Export PDF + print; `[TOC]`
3. Favorites/pins; preview tab; recently-closed list
4. Workspace replace with preview
5. Portable mode; settings import/export
6. Zen mode; minimap (opt-in)
7. Localization infrastructure (extraction of `t()` shim)

## v2.0 candidates (each requires its own design doc before acceptance)

- **Plugin system** — gated on [17] approval; the largest architectural commitment on the roadmap
- Multi-window; multiple workspace roots
- Wiki-link navigation + backlink pane (lightweight, no database — indexed on demand)
- Workspace-wide heading/link/tag search (may introduce optional index store — revisits the "no database" decision explicitly)
- DOCX export (bundled converter decision vs documented Pandoc bridge)
- Version-history / local snapshots for files
- Settings sync (file-based, user-owned storage only — never a hosted service)

## Explicit non-goals (permanent, from [00] §6)

Cloud accounts, collaboration/CRDT editing, WYSIWYG-only mode, knowledge-graph database, mobile, AI features, telemetry. Feature requests in these areas are closed with a policy link — this list is the maintainers' shield ([15] §7).

## Roadmap governance

- Public GitHub Project board: Now / Next / Later / Icebox.
- Promotion from Icebox requires: issue with problem statement, maintainer sponsor, and fit-check against [00] §4 principles.
- Roadmap reviewed each minor release; this file updated in the same PR as the release notes.
