# `scripts/`

Build and release automation. Windows-first, so PowerShell.

| Script | Purpose |
|---|---|
| `package-release.ps1` | Builds the app and assembles `release/` — installers, SHA-256 checksums, notes, manifest. |
| `bench/startup.ps1` | Measures cold start against the < 500 ms budget. `-FailOver 500` exits non-zero over budget, so CI can gate on it. |

```powershell
powershell -File scripts/package-release.ps1              # full build, then package
powershell -File scripts/package-release.ps1 -SkipBuild   # package an existing build
powershell -File scripts/package-release.ps1 -Clean       # wipe release/ first
```

`release/` is generated and gitignored. Delete it whenever you need the disk space — this script
rebuilds it. Binaries belong on a GitHub Release, never in the repository.

## Benchmarking startup

```powershell
powershell -File scripts/bench/startup.ps1                    # 7 runs, report median
powershell -File scripts/bench/startup.ps1 -Runs 11 -FailOver 500
```

Requires a release build (`pnpm tauri build`). The first run is discarded as a warm-up —
cold-file-cache numbers are not reproducible enough to regress against — and the median is
reported so one antivirus stall cannot move the result.

**Startup cannot be timed from outside the process.** The native window handle exists long
before WebView2 paints, so an external observer measures ~40 ms for a window nobody can use
yet. Instead the app reports its own readiness: when `NSP_BENCH_OUT` names a file, the Rust
command `bench_ready` writes launch-to-interactive milliseconds there, and the script reads it.
Unset, the command is a no-op, so this costs nothing in normal use.

## Not built yet

Planned in [docs/09_Performance_Strategy.md](../docs/09_Performance_Strategy.md) §7 and
[docs/18_Release_Checklist.md](../docs/18_Release_Checklist.md), still absent:

```
bench/typing-latency   keystroke-to-paint harness
bench/memory           200-tab plateau sampler
bench/large-file       100 MB open benchmark
version-set            bump version across package.json / Cargo.toml / tauri.conf.json
release/               signing, SBOM helpers
```
