# Security Audit Report — Notepad Super Plus

**Date:** 2026-07-21 · **Scope:** full repository (frontend, Rust core, IPC, CI, supply chain) · **Branch:** `develop`

## Threat Model Review

The app opens untrusted local Markdown files and renders them as HTML inside a WebView with filesystem-capable IPC behind it. The primary threats are: (T1) XSS via rendered Markdown reaching the IPC bridge, (T2) path abuse through filesystem commands, (T3) ReDoS/resource exhaustion via search and large files, (T4) supply-chain compromise, (T5) shell-integration abuse (new this release). All are addressed below.

## Vulnerabilities Found & Fixed

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 1 | Medium | **DOM clobbering**: sanitizer ran with `clobberPrefix: ""`, so a document could emit `<a id="...">` shadowing any `document.getElementById` lookup | Ids are now prefixed `user-content-` (GitHub's scheme); a rehype step rewrites internal `#anchor` links so navigation keeps working. Regression tests added |
| 2 | Low | **Live form fields in preview**: raw `<input type="text">` (any type) rendered as an interactive control | Schema now constrains `input` to `type="checkbox"` + `disabled`; the sanitizer's `required` map forces every surviving input to a disabled checkbox. Test added |
| 3 | Low | **UI spoofing**: `className` was allowed on `*`, letting a document borrow app CSS classes (e.g. `.titlebar`) inside the preview | `className` now allowed only where the renderer emits it: `code`, `span`, `pre`, `ul`, `ol`, `li`. Test added |
| 4 | Low | **Windows filename hazards**: `fs_create`/`fs_rename` accepted reserved device names (`CON`, `NUL`, `COM1`…), `<>:"|?*`, control chars, `.`/`..`, and trailing dots/spaces | `validate_name()` in `fsops.rs` rejects all of these with clear messages. Tests added |
| 5 | Info | Closing a file left its watcher registered (resource leak, stale `fs:changed` events) | `closeFile()` unwatches before removing the document |

## IPC Audit

All 15 commands reviewed (`lib.rs`). Findings: every command returns typed `NspResult` (no panics across the boundary); binary/oversize rejection on read (512 MB cap, NUL sniff); atomic writes (unique temp + fsync + rename); search runs on `spawn_blocking` with regex-crate linear-time matching, match/file-size/preview caps, and `regex::escape` for literal queries; recent/config stores are capped and clamped. The new `cli_paths` command only returns canonicalized, existing files vetted at startup. Path scope: the app is a general-purpose editor, so commands intentionally accept absolute paths chosen via OS dialogs, CLI args, or the opened workspace — there is no web-controllable path input, and the WebView cannot reach `invoke` with attacker JS (see sanitization).

## Filesystem Audit

`dunce::canonicalize` normalizes every path before use; deletes go exclusively to the OS trash; temp files are per-process **and** per-write sequence (clobber race fixed in an earlier stage, verified by test); config writes are temp-then-rename. No symlink-following hazards beyond what the user explicitly opens.

## Markdown Rendering Audit

Pipeline: `remark-parse → remark-gfm → remark-rehype (allowDangerousHtml) → rehype-raw → rehype-sanitize (hardened GitHub schema) → rehype-stringify`, entirely inside a dedicated Web Worker; the DOM only ever receives sanitized strings. Verified live: `<script>`, `javascript:` URLs, event handlers, non-checkbox inputs, foreign ids, and foreign classes are all stripped. HTML export uses the same pipeline, so exports are exactly as safe as the preview.

## CSP & WebView

`default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self'; connect-src ipc: http://ipc.localhost` — no remote script/style/img/frame origins; `unsafe-inline` styles are required by inline React styles and are not script-capable. Capabilities are least-privilege: `core:default` + `dialog:default` only (no fs/http/shell plugin permissions — all filesystem work goes through audited custom commands). `withGlobalTauri` is off.

## Windows Shell Integration (new)

- Context-menu verbs are registered under `SystemFileAssociations\<ext>\shell` — extends the menu without stealing default handlers; removed on uninstall; `SHChangeNotify` refreshes Explorer.
- Command line is `"$INSTDIR\<app>.exe" "%1"` — quoted, no cmd.exe interpolation surface.
- Forwarded/startup args are filtered: flags dropped, paths canonicalized, must exist and be files; the read path then re-applies binary/size checks.
- Single-instance forwarding uses the official Tauri plugin (registered first, before any state exists).

## Supply Chain Review

- `pnpm audit --prod`: **0 known vulnerabilities**.
- `cargo audit`: **0 vulnerabilities**; warnings only — GTK3-binding crates flagged "unmaintained" and `glib` "unsound iterator" are **Linux-only transitive dependencies of Tauri**, unreachable in the Windows target; `proc-macro-error`/`unic-*` are build-time or transitive with no advisory fix available upstream.
- Lockfiles (`pnpm-lock.yaml`, `Cargo.lock`) committed; CI installs with `--frozen-lockfile`.
- Dependabot: npm + cargo + GitHub Actions, weekly.
- CI workflow permissions are least-privilege (`contents: read`); release workflow limited to `contents: write`.
- CodeQL workflow present (JS/TS); automatic triggers blocked until the repo is public/GHAS (documented in the workflow).

## Logging & Secrets

`tracing` never logs document content (verified by inspection); no secrets, tokens, or telemetry anywhere in the codebase; `.gitignore` excludes `.env*`, keys, and runtime data. Repo contains no committed secrets (checked).

## Remaining Recommendations

1. **Code signing** — installers are unsigned until a certificate is provisioned (SmartScreen warnings will appear). Tracked in the release checklist.
2. Enable CodeQL triggers + add the `rust` language matrix once the repository is public.
3. Consider SLSA provenance (`actions/attest-build-provenance`) in the release workflow after signing lands.

## Final Security Rating

**Strong.** No known exploitable vulnerabilities remain; the renderer sanitization now matches GitHub's hardening, the IPC surface is small, typed, and capability-scoped, and the supply chain is clean and pinned. Main residual risk is the absence of code signing (distribution trust, not runtime security).
