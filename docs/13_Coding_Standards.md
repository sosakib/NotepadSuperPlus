# 13 — Coding Standards

**Related:** [14_Git_Workflow.md](14_Git_Workflow.md) · [15_Contribution_Guide.md](15_Contribution_Guide.md) · [05_Component_Design.md](05_Component_Design.md)

Enforced by tooling wherever possible; review enforces the remainder. "Should" means justify deviations in the PR; "must" means CI blocks.

---

## 1. TypeScript

- **Strict mode** (`strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`). `any` is banned (`@typescript-eslint/no-explicit-any` error); `unknown` + narrowing instead. `as` casts require a comment stating the invariant that makes them safe.
- ESLint (typescript-eslint strict + react-hooks + import-order) and Prettier are CI gates; no style debates in review.
- Modules: no default exports (grep-ability); barrel files only at package boundaries; import order: node → deps → packages → app absolute (`@/`) → relative.
- Naming: `PascalCase` components/types, `camelCase` values/functions, `SCREAMING_SNAKE` true constants, file names follow export (`PascalCase.tsx`, `camelCase.ts`).
- Errors: never swallow — either handle meaningfully or rethrow wrapped with context. UI-facing failures go through the toast/dialog error mapper, never `console.error` alone.
- Async: no floating promises (`no-floating-promises` error); cancellation tokens/AbortSignal for any operation a user can outrun (search, render).
- React: function components + hooks; effects must list honest deps (`exhaustive-deps` error); derived state computed, not mirrored; keys stable, never index on mutable lists. Store access via selectors only ([09] §8).

## 2. Rust

- Toolchain pinned via `rust-toolchain.toml`; `cargo fmt --check` and `clippy -- -D warnings` are CI gates (`pedantic` on, curated allows in workspace lints).
- `unsafe` is forbidden in `nsp-core` (`#![forbid(unsafe_code)]`); if a dependency-boundary exception ever arises it requires an ADR.
- `unwrap()`/`expect()` banned outside tests (clippy lint); all fallible paths return `Result<T, NspError>`; `?` + context via `thiserror` variants. Panics never cross IPC.
- Every command handler: input validation first, scope check second, work third ([08] §3 order is normative).
- Blocking work on `spawn_blocking`; no `std::thread::sleep` in async contexts; channels bounded.
- Public items documented (`#![warn(missing_docs)]` in `nsp-core`); doc examples compile (`cargo test --doc`).

## 3. Comments & documentation-in-code

Comments state invariants, constraints, and *why* — never narrate the code. Every module opens with a 2–5 line "what lives here and why" header. TODOs: banned unless `TODO(#issue)` — CI greps for bare TODO/FIXME and fails.

## 4. Testing standards

Test names describe behavior ("continues task list marker on Enter"), not methods. One behavior per test. No sleeps — await conditions. Fixtures from [10] §4 generators, never ad-hoc large blobs. New bug fix = regression test in same PR (review-enforced).

## 5. Commit & PR hygiene

Conventional Commits (details [14] §3). PRs small and single-purpose (< ~400 changed lines guideline; mechanical renames exempt and separated). PR description: what/why, screenshots for UI, perf note if hot path touched.

## 6. Design-token discipline

No literal colors/sizes in component CSS — tokens only ([04] §3). Stylelint rule bans hex/rgb literals outside `packages/themes`. Motion only from the approved spec table ([04] §6).

## 7. Dependency policy

New runtime dependency (npm or crate) requires PR-description justification: what it does, size cost, maintenance status, why not std/existing. Frontend runtime deps are budgeted (bundle-size CI); "left-pad-shaped" micro-deps rejected. Dev-deps lighter bar, still reviewed. Licenses: MIT/Apache-2.0/BSD/ISC allowlist enforced by `cargo deny` + license-checker.

## 8. PR review checklist (template-embedded)

- [ ] CI green; new/changed behavior covered by tests
- [ ] Hot path touched? → perf note + bench delta ([09])
- [ ] New IPC command? → input validation, scope check, [16] catalog updated, security note ([08] §3)
- [ ] User-visible strings through `t()` shim; UX writing per [04] §8
- [ ] A11y: keyboard path + labels for any new interactive element
- [ ] Docs updated (relevant file in `/docs`, settings reference, keymap spec)
- [ ] No new dependency without justification (§7)
