# Changelog

All notable changes to Notepad Super Plus are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Entries are generated from [Conventional Commits](https://www.conventionalcommits.org/)
and hand-curated before each release (see [docs/14_Git_Workflow.md](docs/14_Git_Workflow.md) §7).

## [Unreleased]

### Added
- **Stage 1 — Workspace & Build System.** Toolchain wired end to end: Tauri 2 + Rust core
  (`src-tauri`), React 18 + TypeScript (strict) + Vite frontend, pnpm workspace. The app is an
  intentionally empty window that proves the stack: a single `app_version` IPC command bridges
  the webview and the Rust core. Adds `tracing` logging (Rust) and `performance.mark` startup
  instrumentation (frontend), strict ESLint + Prettier, `rust-toolchain.toml`, capability
  manifest (least-privilege `core:default`), release-profile size tuning, generated app icons,
  real CI jobs (frontend lint/typecheck/build on Linux; Rust fmt/clippy/test/build on Windows),
  and [docs/BUILD.md](docs/BUILD.md).
- **Stage 0 — Repository Initialization.** Complete project scaffolding: MIT license,
  contribution/security/conduct policies, GitHub issue & PR templates, CI/CodeQL/release
  workflow placeholders, Dependabot, and the full pre-implementation documentation set
  under [`docs/`](docs/) (21 architecture & planning documents).
- Master execution roadmap ([ROADMAP.md](ROADMAP.md)) covering Stages 0–15 (Windows-first to v1.0)
  plus the deferred macOS migration milestone.

_No application code yet — by design. Implementation begins at Stage 1 after roadmap approval._

[Unreleased]: https://github.com/sosakib/NotepadSuperPlus/commits/main
