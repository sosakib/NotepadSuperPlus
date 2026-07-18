# Build Guide

How to build and run Notepad Super Plus from source. **Windows is the only supported target
right now** (Windows-first strategy — see [../ROADMAP.md](../ROADMAP.md)); macOS/Linux come later.

## Prerequisites (Windows)

| Tool | Version | Notes |
|---|---|---|
| **Node.js** | ≥ 20 (LTS) | https://nodejs.org |
| **pnpm** | ≥ 9 | `npm install -g pnpm` (or `corepack enable pnpm` if you can write to the Node dir) |
| **Rust** | stable (pinned by `rust-toolchain.toml`) | Install via [rustup](https://rustup.rs); the `x86_64-pc-windows-msvc` target is used |
| **MSVC Build Tools** | VS 2022 Build Tools with the **"Desktop development with C++"** workload | Provides the MSVC linker Rust needs. https://visualstudio.microsoft.com/downloads/ → *Build Tools for Visual Studio* |
| **WebView2 Runtime** | Evergreen | Preinstalled on Windows 11 and current Windows 10; otherwise from Microsoft |

> The MSVC Build Tools are the one heavyweight prerequisite. If `cargo build` fails with
> `link.exe not found` or `error: linker 'link.exe' not found`, the C++ workload is missing —
> install it and reopen your terminal.

## First-time setup

```bash
git clone https://github.com/sosakib/NotepadSuperPlus
cd NotepadSuperPlus
pnpm install
```

## Run (development)

```bash
pnpm tauri dev
```

Launches the Vite dev server (port 1420) and the Tauri window with hot-reload. The Rust core
rebuilds automatically on change. The first run compiles the Rust dependency tree and can take
several minutes; subsequent runs are fast.

## Build (production)

```bash
pnpm tauri build
```

Produces the frontend bundle, compiles the Rust core in release mode, and packages Windows
installers (NSIS `.exe` and `.msi`) under `src-tauri/target/release/bundle/`.

## Frontend-only tasks (no Rust required)

```bash
pnpm dev            # Vite dev server in a browser (IPC calls fall back gracefully)
pnpm build          # typecheck + Vite production build
pnpm lint           # ESLint
pnpm typecheck      # tsc --noEmit
pnpm format         # Prettier write   /   pnpm format:check
```

## Rust-only tasks

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo test  --manifest-path src-tauri/Cargo.toml
```

## Icons

App icons are generated from a source image with `pnpm tauri icon <path-to-1024px.png>`, which
writes the full set into `src-tauri/icons/`. Production-quality icons land in Stage 13; the
current set is a generated placeholder.

## Logging

Set `NSP_LOG` to control the Rust log level (default `info`): `NSP_LOG=debug pnpm tauri dev`.
Document content is never logged.
