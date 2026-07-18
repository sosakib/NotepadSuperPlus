# 14 — Git Workflow

**Related:** [13_Coding_Standards.md](13_Coding_Standards.md) · [15_Contribution_Guide.md](15_Contribution_Guide.md) · [18_Release_Checklist.md](18_Release_Checklist.md)

---

## 1. Branching model

> **Execution refinement (Stage 0):** the execution plan adopts **gitflow-lite** (`main` +
> `develop` + `feature/*` `release/*` `hotfix/*`) instead of the pure trunk-based model
> described below — see [../ROADMAP.md](../ROADMAP.md) → *Branch & workflow model*. Concretely:
> `develop` is the integration branch and features merge there first; `main` stays protected
> and release-only. The rest of this document (squash-merge, Conventional Commits, SemVer,
> hotfix flow, protection rules) applies unchanged. The trunk-based description below is
> retained as the original rationale and the fallback model if `develop` proves to add
> ceremony without value at this project's contributor scale.

Trunk-based, lightweight:

- `main` — always releasable; protected (no direct pushes, required CI + 1 approval, linear history via squash).
- `feat/<slug>`, `fix/<slug>`, `docs/<slug>`, `chore/<slug>`, `perf/<slug>` — short-lived work branches off `main`.
- `release/v1.x` — cut only when a release needs stabilization while `main` moves on; receives cherry-picks, never original work.
- No `develop` branch — CI quality on `main` is the integration gate.

## 2. Merge strategy

Squash-merge only: one PR = one commit on `main`, message rewritten to Conventional Commit at merge. Keeps `main` bisectable and changelog generation mechanical. Exception: none — even multi-commit epics land as sequenced PRs.

## 3. Commit convention (Conventional Commits)

```
<type>(<scope>)!: <subject ≤ 72 chars, imperative>

<body: what & why, wrapped 100>

Closes #123
```

Types: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `chore`, `revert`. Scopes: `editor`, `preview`, `outline`, `explorer`, `tabs`, `search`, `settings`, `themes`, `fs`, `watcher`, `ipc`, `export`, `a11y`, `release`. `!` marks breaking change (config schema, keymap format, CLI args — user-facing contracts). Commitlint enforces on PR titles (which become the squash message).

## 4. PR lifecycle

1. Issue first for non-trivial work (bug template or feature template; `good first issue` labels maintained — [15] §4).
2. Draft PR early; CI runs on drafts.
3. Ready → auto-assigned reviewer (CODEOWNERS: `src-tauri/` and `docs/08*` require a maintainer with security hat).
4. Review SLA target: first response < 5 working days (community project — honest, not aspirational-24h).
5. All conversations resolved + CI green + approval → squash merge; branch auto-deleted.
6. Stale PRs: ping at 30 days, close-with-thanks at 60 (reopenable).

## 5. Hotfix flow

Security/data-loss bug on latest release: branch `fix/…` off the release tag → PR → cherry-pick to `main` (or vice-versa) → tag `vX.Y.Z+1` → expedited [18] checklist (signing + smoke e2e only may be waived: **nothing else**) → security advisory if applicable ([08] §8).

## 6. Versioning & tags

SemVer: MAJOR = breaking user-facing contracts (file formats, keymap schema, config schema without migration), MINOR = features, PATCH = fixes. Tags `vX.Y.Z` signed; tagging triggers `release.yml`. Pre-releases: `vX.Y.Z-beta.N` (updater channel-aware: beta opt-in in settings, P1).

## 7. Changelog

`CHANGELOG.md` generated from Conventional Commits (git-cliff), curated by hand before release — generated output is the draft, human editing makes it readable. Sections: Added / Changed / Fixed / Performance / Security. Every user-visible change credits the contributor (`@handle`).

## 8. Repository settings (documented so they're reproducible)

- Branch protection as §1; force-push disabled everywhere; tags protected (`v*` maintainers-only).
- Merge queue enabled when contributor volume warrants.
- Actions: pinned by SHA for third-party actions; `GITHUB_TOKEN` read-only default; release signing keys in environment-scoped secrets with required reviewers.
- Issues: bug / feature / question templates + config.yml routing questions to Discussions ([15] §6).
