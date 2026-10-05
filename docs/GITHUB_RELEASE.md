# Publishing a release to GitHub

How a version of Notepad Super Plus gets from `main` to a GitHub Release. The full quality
checklist is [18_Release_Checklist.md](18_Release_Checklist.md); this is the mechanical part.
Last used for **v1.0.1** (2026-10-05).

---

## 1. Prepare the release PR

On a `fix/…` (patch) or `release/…` branch off `main` ([14_Git_Workflow.md](14_Git_Workflow.md) §5):

1. Bump the version in **all three** places — they must match, the installer name comes from
   `tauri.conf.json`:
   - `package.json` → `"version"`
   - `src-tauri/Cargo.toml` → `version` (then any `cargo` command updates `Cargo.lock`)
   - `src-tauri/tauri.conf.json` → `"version"`
2. README version badge and the status line under the intro.
3. `CHANGELOG.md`: move entries from `[Unreleased]` into a dated `## [X.Y.Z]` section and add
   its compare link at the bottom.
4. Rewrite `docs/RELEASE_NOTES.md` for this version — **it becomes the GitHub Release body**.
   Keep the *Known limitations* table honest and update the installer filename in *Install*.
5. Optional but cheap: `powershell -File scripts/package-release.ps1 -Clean` builds the
   installers locally, and `./scripts/bench/startup.ps1 -Runs 9 -FailInPageOver 500 -FailOver 2000`
   runs the same startup gate CI will.

Open the PR into `main`. The repository only allows **squash merges**, so the PR title becomes
the commit subject — use `release: Notepad Super Plus X.Y.Z`.

## 2. Merge and tag

When CI is green (Frontend, Rust core, cargo-audit, CodeQL ×2):

```bash
gh pr merge <N> --squash --delete-branch
git checkout main && git pull --ff-only
git tag -a vX.Y.Z -m "Notepad Super Plus X.Y.Z"
git push origin vX.Y.Z
```

Then fast-forward `develop` so it does not fall behind: `git push origin main:develop`.

## 3. What the tag starts

`.github/workflows/release.yml`:

1. `pnpm tauri build` on `windows-latest`
2. The **gated** startup benchmark — in-page < 500 ms, total < 2000 ms. The release fails here
   if startup regresses.
3. `scripts/package-release.ps1 -SkipBuild` — installers + `SHA256SUMS.txt`
4. A **draft** GitHub Release with `docs/RELEASE_NOTES.md` as the body and the NSIS `.exe`,
   `.msi` and `SHA256SUMS.txt` attached

Nobody sees a draft until it is published.

## 4. Before pressing Publish

- [ ] Title reads `Notepad Super Plus X.Y.Z`, tag `vX.Y.Z`, target `main`.
- [ ] Three assets attached; download the `.exe` and check it against `SHA256SUMS.txt`.
- [ ] Install it over the previous version: settings, recent files and session survive.
- [ ] Install it once on a machine that has **never** run the app (still never performed —
      the only way to catch a missing runtime dependency or a broken shortcut).
- [ ] "Set as the latest release" is ticked.

## 5. Not done, and deliberately

- **Code signing.** Installers are unsigned, so SmartScreen warns every downloader;
  [INSTALL.md](INSTALL.md) explains it. Fixing it is buying a certificate (or Azure Trusted
  Signing) and wiring it into `release.yml`.
- **Auto-updater.** Designed in [08](08_Security_Model.md) §5, not implemented; needs signing keys.
- **SBOM and attestations.** [18](18_Release_Checklist.md) §4 items, not wired up.

## 6. If the workflow fails

The release is a draft until published and the tag is the only trigger, so while it is still a
draft:

```bash
git tag -d vX.Y.Z
git push origin :refs/tags/vX.Y.Z
```

Delete the draft release too, fix, re-tag and push. Once a release has been **published**, never
move its tag — ship the next patch version instead.
