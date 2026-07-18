# `tests/`

Cross-cutting test assets and end-to-end suites. Unit tests live next to the code they cover
(`*.test.ts` in `src/`, `#[cfg(test)]` in `src-tauri/`); this directory holds the shared
fixtures and e2e journeys from [docs/10_Testing_Strategy.md](../docs/10_Testing_Strategy.md).

Planned contents:

```
tests/
├── e2e/          # WebdriverIO + tauri-driver journeys (docs/10 §3)
├── fixtures/     # docs-corpus, generated large-file / workspace inputs
└── security/     # xss-corpus, path-traversal corpus (grow-only, docs/08)
```

The Markdown conformance fixtures (CommonMark + GFM) live in `specifications/gfm/` and are
added with the rendering engine in Stage 4. Added during Stage 0 to keep the directory tracked.
