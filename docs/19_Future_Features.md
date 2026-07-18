# 19 — Future Features

**Related:** [11_Roadmap.md](11_Roadmap.md) · [00_Project_Vision.md](00_Project_Vision.md) §6 · [17_Plugin_System_Proposal.md](17_Plugin_System_Proposal.md)

This document is the parking lot with judgment attached: each idea carries a fit assessment against the vision principles ([00] §4) so future maintainers inherit the reasoning, not just the list. Statuses: **Likely** (fits, needs design), **Possible** (fits with constraints), **Plugin-territory** (core says no, plugin API says maybe), **Rejected** (violates vision — recorded to end recurring debates).

---

## Likely

| Idea | Notes |
|---|---|
| Wiki-link navigation (`[[page]]`) + backlinks pane | On-demand workspace scan, no persistent database; renders v1 (FR-3.10), navigation here |
| Local file snapshots / version history | Bounded per-file history in app-data; complements crash drafts; must respect disk budget |
| Workspace-wide symbol search (headings/links/tags) | May justify optional SQLite index — the revisit is explicitly scheduled in [11] v2.0, decided by ADR |
| Multi-window & multiple workspace roots | State architecture already per-window-shaped ([03] §5) |
| DOCX export | Decision pending: bundled pure-Rust converter vs documented Pandoc bridge (size vs fidelity) |
| Beta update channel | Updater is channel-aware by design ([14] §6) |
| Localization | `t()` shim exists from Phase 1; community translation workflow post-1.0 |

## Possible (with constraints)

| Idea | Constraint |
|---|---|
| Settings sync | File-based only (user's own Dropbox/Syncthing/git); we ship export/import + merge rules, never a service |
| Typewriter / focus-paragraph mode | Pure CM6 extension; must not touch hot-path budgets |
| Custom CSS for preview | Security-reviewed: user CSS is style-only injection, sanitizer untouched; per-workspace opt-in |
| Diff view for external-change conflicts | Read-only diff, not a merge tool ([06] §5 banner's third button) |
| Pandoc-powered import (docx/org/rst → md) | External-tool bridge with explicit user-configured binary path; never bundled execution surprise |
| CLI companion (`nsp file.md`, `nsp --workspace .`) | Thin: open/focus running instance via single-instance IPC |

## Plugin-territory (core will not ship these)

Custom Markdown syntax beyond GFM+math+mermaid (directives, embeds, transclusion) · publishing integrations (static-site generators, blogs, Confluence) · citation/bibliography tooling · kanban/table-view over frontmatter · encryption-at-rest for notes · templating/snippets engines beyond basic snippets. Rationale: each serves a vocal minority and drags scope toward Obsidian-with-extra-steps; tier-1/2 plugin API ([17] §2) is the designed home.

## Rejected (recorded verdicts)

| Idea | Verdict rationale |
|---|---|
| Cloud sync / accounts / hosted anything | Violates "local and private" — permanent no ([00] §4.3) |
| Real-time collaboration (CRDT) | Different product; enormous complexity tax on every feature |
| WYSIWYG-only editing mode | Source is the product's spine; a third half-WYSIWYG mode splits testing and polish budgets. Typora exists |
| AI features (completion, chat, summarize) | Scope + privacy + dependency weight; explicitly out ([00] §6). The app is a great *viewer* for AI output — that's the relationship |
| Embedded terminal, git client, LSP | IDE gravity — the exact failure mode the vision names |
| Telemetry "just for crash rates" | NFR-4 is a promise; opt-in local crash dumps are the only future concession, per [08] §7 |
| Note database / vault format | Files in folders is the contract; no proprietary containers |

## Process

New idea → Discussions with problem statement → maintainer applies this document's lens → lands in a table above (PR updates this file) or becomes a roadmap item ([11] governance). Recurring rejected ideas get a saved-reply linking their table row — polite, final, and searchable.
