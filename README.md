# Notepad Super Plus

> A lightweight, MIT-licensed desktop Markdown editor for Windows: Notepad++-fast, GitHub-faithful rendering, and nothing you don't need.

**Free and open source, forever.** Every feature is in the box — no accounts, no paid tier, no telemetry.

Notepad Super Plus is a Tauri 2 desktop app focused exclusively on viewing and editing Markdown. It pairs a CodeMirror 6 source editor with a sanitized, GitHub-flavored live preview, a workspace explorer with full-text search, and a themeable, keyboard-first shell.

## Features

- **Source / Preview / Split** view modes with synced scrolling (`Ctrl+1/2/3`)
- **GitHub-flavored Markdown** — tables, task lists, strikethrough — rendered in a Web Worker and sanitized before it ever touches the DOM
- **Workspace explorer** — open a folder, browse lazily, create/rename/duplicate/trash files (deletes always go to the OS trash)
- **Workspace search** — regex, case, whole-word toggles; respects `.gitignore`
- **Command palette** (`Ctrl+Shift+P`) with fuzzy matching; every command is keyboard-bindable
- **Document outline**, live word/char counts, and read-time estimate
- **7 bundled themes** (incl. High Contrast) with OS light/dark following
- **Encoding & EOL fidelity** — UTF-8/UTF-16/BOM and LF/CRLF are detected and preserved; saves are atomic
- **External-change detection** — clean buffers reload silently, dirty buffers get a conflict banner
- **Windows shell integration** — "Open with Notepad Super Plus" in the Explorer context menu for `.md`, `.markdown`, `.mdown`, `.mkd`, `.mdx`, and `.txt`; single-instance launches; file associations
- **Export** to standalone HTML, Markdown, or plain text
- **Zero telemetry.** Everything stays on your machine.

## Install

Download the latest NSIS installer (or MSI) from [Releases](https://github.com/sosakib/NotepadSuperPlus/releases). Windows 10/11, x64.

## Development

Prerequisites: Node ≥ 20, pnpm 9, Rust ≥ 1.77, and the [Tauri 2 Windows prerequisites](https://tauri.app/start/prerequisites/).

```sh
pnpm install
pnpm tauri dev        # run the desktop app
pnpm dev              # UI only, in a browser (Tauri APIs degrade gracefully)

pnpm test             # vitest unit tests
pnpm lint && pnpm typecheck
cargo test --manifest-path src-tauri/Cargo.toml
pnpm tauri build      # produce installers
```

## Architecture

- `src/` — React 18 + TypeScript UI. Zustand stores hold metadata; CodeMirror owns document text; Markdown renders in a worker (`src/markdown/`).
- `src-tauri/` — Rust core: filesystem (encoding detection, atomic writes), workspace listing, search (`ignore` + `regex`), file watcher, settings (TOML), recent files.
- All IPC goes through typed wrappers in `src/ipc/`; every Rust command returns a typed `{ code, message, path? }` error.

Full design docs live in [docs/](docs/) — start at [docs/20_Master_Project_Plan.md](docs/20_Master_Project_Plan.md).

## Security

Rendered Markdown is sanitized (rehype-sanitize, GitHub-style schema with DOM-clobbering protection), the WebView runs under a strict CSP, and the Rust surface is least-privilege (no shell, no HTTP, no eval). See [SECURITY.md](SECURITY.md) for the reporting policy and [SECURITY_AUDIT_REPORT.md](SECURITY_AUDIT_REPORT.md) for the latest audit.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Issues and PRs welcome.

## License

[MIT](LICENSE)
