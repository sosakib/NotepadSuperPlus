# 10 — Testing Strategy

**Related:** [09_Performance_Strategy.md](09_Performance_Strategy.md) · [12_Implementation_Phases.md](12_Implementation_Phases.md) · [18_Release_Checklist.md](18_Release_Checklist.md)

---

## 1. Test pyramid & tooling

| Layer | Scope | Tooling | Runs |
|---|---|---|---|
| Unit (TS) | pipeline config, stores, utils, editor extensions (headless CM6 `EditorState`) | Vitest | every PR, < 60 s |
| Unit (Rust) | fs, encoding, scope validation, search, config, session | `cargo test` + `tempfile` | every PR |
| Conformance | Markdown rendering vs CommonMark + GFM spec fixtures | Vitest against `specifications/gfm/` | every PR |
| Component | primitives + panels (tree keyboard nav, tab bar, find bar) | Vitest + Testing Library (jsdom) | every PR |
| Integration (Rust) | command handlers end-to-end against real temp dirs; watcher event flows | `cargo test` integration tree | every PR |
| E2E | real app: open/edit/save, split sync, search, session restore, settings | WebdriverIO + tauri-driver | PR (Linux), nightly (3 OS) |
| Visual | preview rendering screenshots per theme × platform | E2E + pixel-diff (odiff), reviewed baselines | nightly + release |
| Performance | budget suite ([09] §7) | custom harness | PR (Linux relative), nightly full |
| Security | network audit, sanitizer corpus (XSS vectors), path-traversal corpus | e2e + unit corpora | PR |
| Accessibility | axe-core scan of all chrome states; keyboard-path e2e | e2e | PR |

Coverage gates: TS lines ≥ 80 % on `renderer/`, `state/`, `editor/extensions/`; Rust ≥ 85 % on `fs/`, `search/`, `config/`. UI shell components exempt from line-coverage, covered by e2e flows instead. Coverage is a floor, not a goal — review checks assertions, not percentages.

## 2. What must be unit-tested (non-negotiable list)

- Every editor extension behavior table in [05] §3 (smart lists renumbering, pair-close skip-over, table Tab nav).
- Encoding matrix: 5 encodings × read/write round-trip × EOL preservation (FR-1.4).
- Atomic save: crash-simulation (kill between temp-write and rename) leaves original intact.
- Scope validation: symlink escape, `..` traversal, UNC/verbatim paths (Windows), case-insensitivity pitfalls.
- Sanitizer: corpus of 100+ XSS vectors (script tags, event handlers, javascript: URLs, SVG payloads, data URIs, mermaid injection) → zero survivors. Corpus grows with every reported bypass, never shrinks.
- Block-diff correctness: random-edit fuzz — incremental render output ≡ full render output (property test, 1k iterations CI / 100k nightly).
- Line map: heading positions and block ranges stable under edits (drives outline + scroll sync).
- Search: regex/case/word option matrix, gitignore respect, cancellation actually stops work.
- Ordered-list renumber + Replace-All single-undo (FR-7.3) as undo-history tests.

## 3. E2E critical journeys (release-blocking)

1. Fresh install → open folder → create file → type → save → relaunch → session restored.
2. Open 100 MB generated file → scroll → edit → save (asserts no long-task > 100 ms via tracing).
3. Split mode: type heading → outline updates → click outline → both panes navigate; scroll sync both directions.
4. External modify while dirty → conflict banner → both resolution paths.
5. Workspace search 10k files → stream results → open match → highlight.
6. Checkbox toggle in preview → source updated → undo restores.
7. Theme switch light/dark/HC → screenshot diff sane; reduced-motion honored.
8. Keyboard-only session: every journey above executed without pointer.
9. Settings: change font size in UI → TOML updated; hand-edit TOML → UI follows; invalid value → fallback + warning.
10. Export HTML → output opens standalone, sanitized, styled.

## 4. Fixtures & corpora (`specifications/`, `tests/fixtures/`)

- `gfm/`: CommonMark spec cases + GFM extensions (tables, tasklists, strikethrough, autolinks) as input/expected-HTML pairs; deviations from GitHub documented in `gfm/DEVIATIONS.md` (target ≥ 95 % parity, FR-3.1).
- `docs-corpus/`: real-world documents (long README, math-heavy, mermaid-heavy, CJK, RTL, emoji, deeply nested lists, 10k-row table).
- Generators (checked in, blobs are not): `make-large-md.ts` (1/10/100 MB), `make-workspace.ts` (10k files).
- `security/xss-corpus.txt`, `security/path-corpus.txt`.

## 5. Performance & leak testing

Budgets and harness defined in [09] §1/§7. Additional: leak test opens/closes 200 tabs + 50 workspace switches, asserts webview heap plateau (< 10 % growth after GC) and Rust RSS stability; watcher stress (rapid 5k-file churn) asserts event coalescing and no unbounded queue.

## 6. Manual test matrix (per release, [18] gate)

- OS spot pass: Win 10, Win 11, macOS (latest + latest−1), Ubuntu LTS (X11 + Wayland), Fedora latest.
- Screen readers: NVDA (Windows) + VoiceOver (macOS) scripted 15-min pass.
- IME input (Japanese/Chinese), RTL paragraph editing.
- HiDPI + mixed-DPI dual monitor; 200 % zoom.
- OS file-association open; drag-file-onto-window.

## 7. CI/CD (`.github/workflows/`)

| Workflow | Trigger | Jobs |
|---|---|---|
| `ci.yml` | PR, push main | lint (eslint, prettier-check, clippy -D, fmt-check) → typecheck → unit TS/Rust → conformance → component → integration → e2e-linux → security corpora → a11y scan → perf-relative → bundle-size report |
| `nightly.yml` | cron | full e2e 3-OS matrix, visual diffs, perf full, property-fuzz long runs, `cargo audit`/`pnpm audit` |
| `release.yml` | tag `v*` | build 3-OS artifacts → sign/notarize → generate SBOM + attestations → draft GitHub Release with checksums ([18]) |
| `codeql.yml` | PR + weekly | CodeQL JS/TS |

PR merge requires: all `ci.yml` green, review approval, no unresolved conversations ([14] §4). Flaky-test policy: a test flaking twice in a week is quarantined via issue with `flaky` label and must be fixed or deleted within 2 weeks — never silently retried.
