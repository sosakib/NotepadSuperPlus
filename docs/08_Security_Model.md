# 08 — Security Model

**Related:** [07_File_System_Architecture.md](07_File_System_Architecture.md) · [16_API_Design.md](16_API_Design.md) · [18_Release_Checklist.md](18_Release_Checklist.md)

---

## 1. Threat model

Assets: user documents (confidentiality/integrity), user machine (code execution), user privacy (no exfiltration).

| # | Threat | Vector | Primary control |
|---|---|---|---|
| T1 | Malicious Markdown file achieves script execution | Crafted HTML/JS in `.md`, SVG payloads, data URIs | Sanitization allowlist (§4), CSP (§2) |
| T2 | Path traversal via document content or IPC | `../../` image links, symlinks, crafted command args | Rust scope validation post-canonicalization (§3) |
| T3 | Data exfiltration | Remote images/scripts in preview, telemetry regression | CSP no-remote default (§2), CI network audit (§7) |
| T4 | Supply-chain compromise | Malicious npm/crate dependency or build tampering | §6 |
| T5 | Malicious theme/keymap/config file | JSON/TOML with hostile values | Schema validation, themes are data-only tokens (no CSS strings), no code paths from config |
| T6 | Update channel attack | MITM / forged release | Signed updates, Tauri updater pubkey pinning (§5) |
| T7 | Crafted file DoS (zip-bomb-style Markdown, pathological regex) | Huge/deep documents, catastrophic backtracking | Size caps ([07] §7), depth limits in pipeline, Rust `regex` (no backtracking), worker isolation |

Out of scope: a hostile OS/user account, physical access, and plugin threats (plugins not executable in v1 — [17_Plugin_System_Proposal.md](17_Plugin_System_Proposal.md) carries that model).

## 2. Webview hardening

- **CSP:** `default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' nsp-asset: data:; font-src 'self'; connect-src ipc:` — no remote origin in any directive. Remote images in documents render as click-to-load placeholders (explicit user action, off by default).
- No `unsafe-eval`; Mermaid/KaTeX chosen/configured for eval-free operation.
- Tauri v2 **capabilities**: only `dialog`, scoped `fs` events, window, updater; `shell` capability absent entirely; `open` (external browser) mediated by Rust command with URL-scheme allowlist (`http`, `https`, `mailto`) + confirmation for first-party-unknown hosts.
- Navigation locked: webview may not navigate away from app origin; `window.open` blocked.

## 3. IPC & filesystem boundary

- Every command validates inputs (serde strict types, no untyped JSON passthrough).
- All paths: canonicalize (symlinks resolved) → scope containment check → operation. Fail = `E_SCOPE`, audit-logged.
- Command surface is minimal and enumerated in [16_API_Design.md](16_API_Design.md); adding a command requires review checklist item "IPC security" ([13] §8).
- No command executes external processes. No dynamic command registration.

## 4. Content sanitization (preview)

- Pipeline: `remark-parse → remark-gfm → remark-math → rehype-raw → rehype-sanitize(schema) → rehype-katex/shiki → serialize`.
- Sanitize schema = GitHub's baseline: allowlisted tags/attributes; strips `script`, `style`, event handlers (`on*`), `javascript:`/`data:text` URLs, `iframe`, `object`, `embed`, forms.
- SVG in documents: rendered as sanitized static markup (script/foreignObject stripped) — same policy as images.
- Mermaid: rendered in the worker to SVG string → sanitized like any SVG → injected. `securityLevel: 'strict'`.
- Local images via `nsp-asset://` protocol only ([07] §6) — scope-checked in Rust; no `file://`.
- Export HTML applies the *same* sanitized output (exports are as safe as preview).

## 5. Updates & release integrity

- Tauri updater with static public key embedded at build; artifacts signed (minisign) in CI.
- Platform signing: Windows Authenticode, macOS Developer ID + notarization; Linux artifacts checksummed + GPG-signed `SHA256SUMS`.
- Update check is **manual by default** (privacy stance); opt-in weekly check; check request carries no identifiers beyond version + platform.
- Release process gates in [18_Release_Checklist.md](18_Release_Checklist.md).

## 6. Supply chain

- Lockfiles committed (`pnpm-lock.yaml`, `Cargo.lock`); CI installs frozen.
- `cargo audit` + `cargo deny` (licenses, advisories, duplicate versions) and `pnpm audit` + Dependabot — CI-blocking on high severity.
- Dependency budget policy: new runtime dependency requires PR justification note; prefer std/small crates; frontend runtime deps capped and reviewed ([13] §7).
- CodeQL (JS/TS) + `cargo clippy -D warnings` in CI; secret scanning enabled.
- Builds: GitHub Actions from tagged commit only; provenance attestation (SLSA-style artifact attestations) attached to releases.

## 7. Privacy guarantees (enforced, not promised)

- Zero telemetry/analytics/crash reporting in v1. Any future crash reporting must be opt-in, local-first, documented.
- CI "network audit" e2e test: run app through scripted session with network namespace monitored — any socket beyond localhost IPC fails the build (NFR-4 verification).
- Logs never contain document content; paths logged at `debug` only.

## 8. Vulnerability handling

`SECURITY.md` at repo root: private reporting via GitHub Security Advisories; 90-day coordinated disclosure; supported = latest minor; CVE requested for confirmed vulns; credits section. Security fixes ship as patch releases with advisory notes ([14] §5 hotfix flow).
