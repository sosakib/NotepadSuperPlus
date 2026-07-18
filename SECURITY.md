# Security Policy

The full security model (threat model, sanitization, CSP, supply-chain, privacy guarantees)
is documented in [docs/08_Security_Model.md](docs/08_Security_Model.md).

## Supported versions

During pre-1.0 development, only the latest release (or `main`/`develop` HEAD) is supported.
From v1.0, the latest minor release receives security fixes.

## Reporting a vulnerability

**Please do not open a public issue for security vulnerabilities.**

Report privately via GitHub's **Security Advisories** ("Report a vulnerability" on the
repository's Security tab). Include: affected version/commit, reproduction steps, impact,
and any suggested mitigation.

- We aim to acknowledge within **72 hours**.
- Coordinated disclosure window: **90 days** (negotiable for complex fixes).
- Confirmed vulnerabilities receive a CVE request and a credit in the advisory (opt-out available).

## Scope

In scope: the desktop application and its build/release pipeline — remote code execution,
sandbox/CSP escapes, path-traversal, content-sanitization bypass (malicious Markdown → script
execution), supply-chain issues, and data-exfiltration regressions (the app makes **no** network
calls except user-initiated update checks).

Out of scope: a compromised host OS/account, physical access, and third-party plugins (plugins
are not executable in v1 — see [docs/17_Plugin_System_Proposal.md](docs/17_Plugin_System_Proposal.md)).

## Privacy guarantee

Zero telemetry, zero analytics, zero tracking. This is verified in CI by a network-audit test
that fails the build on any non-IPC socket. Any regression is treated as a security defect.
