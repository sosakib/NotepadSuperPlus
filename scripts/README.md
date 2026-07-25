# `scripts/`

Build and release automation. Windows-first, so PowerShell.

| Script | Purpose |
|---|---|
| `package-release.ps1` | Builds the app and assembles `release/` — installers, SHA-256 checksums, notes, manifest. |

```powershell
powershell -File scripts/package-release.ps1              # full build, then package
powershell -File scripts/package-release.ps1 -SkipBuild   # package an existing build
powershell -File scripts/package-release.ps1 -Clean       # wipe release/ first
```

`release/` is generated and gitignored. Delete it whenever you need the disk space — this script
rebuilds it. Binaries belong on a GitHub Release, never in the repository.

## Not built yet

Planned in [docs/09_Performance_Strategy.md](../docs/09_Performance_Strategy.md) §7 and
[docs/18_Release_Checklist.md](../docs/18_Release_Checklist.md), still absent:

```
bench/        startup timer, typing-latency harness, memory sampler, large-file generators
version-set   bump version across package.json / Cargo.toml / tauri.conf.json
release/      signing, SBOM helpers
```

The missing benchmark harness is blocker **B1** in
[docs/reports/REMAINING_TASKS.md](../docs/reports/REMAINING_TASKS.md): there is currently no
regression guard on startup time, and startup is the app's headline promise.
