# `scripts/`

Build, release, and benchmark tooling.

Planned contents ([docs/09_Performance_Strategy.md](../docs/09_Performance_Strategy.md) §7,
[docs/18_Release_Checklist.md](../docs/18_Release_Checklist.md)):

```
scripts/
├── bench/        # startup timer, typing-latency harness, memory sampler, search bench,
│                 # large-file + workspace generators (generators are committed, blobs are not)
├── version-set   # bump version across package.json / Cargo.toml / tauri.conf.json
└── release/      # signing, SBOM, checksum helpers
```

Benchmarks come online in Stage 1 (baseline) and grow through Stage 10. Added during Stage 0
to keep the directory tracked.
