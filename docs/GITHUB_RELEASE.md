# Publishing v1.0.0 to GitHub

Everything in the repository is ready. What remains are the steps that reach outside it —
each needs a human decision, so none were taken automatically.

Current state: **6 commits on `develop`, working tree clean, nothing pushed, no tag created.**

---

## 1. Decide: does the repo go public?

It is currently **private**. Two things in the project depend on this:

- **CodeQL** (`.github/workflows/codeql.yml`) is `workflow_dispatch`-only because code scanning
  needs a public repo or GitHub Advanced Security.
- **Branch protection** on `main` is Pro-gated for private repos, so `main` is directly pushable.

Going public also means the MIT licence starts doing its job. Nothing in the repo blocks it:
no secrets are committed, `.env` is ignored, and `pnpm audit --prod` / `cargo audit` are clean.

## 2. Merge `develop` → `main`

`release.yml` triggers on tags, not on a branch, but the tag should sit on `main`.

```bash
git checkout main
git merge --no-ff develop
```

## 3. Tag

**No tag was created for you** — pushing one triggers the release workflow, which builds
installers and drafts a public GitHub Release. That is an outward-facing action and yours to
start.

```bash
git tag -a v1.0.0 -m "Notepad Super Plus 1.0.0"
```

## 4. Push

```bash
git push origin main
git push origin v1.0.0
```

The tag push starts `.github/workflows/release.yml`, which will:

1. Install dependencies and run `pnpm tauri build`
2. Run the **gated** startup benchmark — in-page < 500 ms, total < 2000 ms. **The release fails
   here if startup regresses.**
3. Assemble `release/` with `scripts/package-release.ps1` (installers + SHA-256 checksums)
4. Create a **draft** GitHub Release using `docs/RELEASE_NOTES.md` as the body, with the
   installers and `SHA256SUMS.txt` attached

It drafts rather than publishes, so you get to look before anyone else does.

## 5. Before hitting Publish on the draft

- [ ] **Install the `.exe` on a machine that has never run the app.** Never performed. This is
      the single most valuable remaining check — it is the only way to catch a missing runtime
      dependency or a broken shortcut.
- [ ] Eyeball the OS surfaces: taskbar, Alt+Tab, Start Menu, File Explorer, the installer
      wizard in flight. All were verified by extracting icons from the binaries, not by looking.
- [ ] Verify the attached checksums match what you downloaded.
- [ ] Add screenshots. The README's screenshot block is commented out so nothing renders broken;
      specs for the four wanted shots are in `assets/screenshots/README.md`. This is the highest
      -value 20 minutes available — the interface work is currently invisible to anyone deciding
      whether to download.
- [ ] Confirm the release notes' limitations still read as true to you, particularly the unsigned
      installer and the ~1.5 s cold start.

## 6. Not done, and deliberately

- **Code signing.** Installers are unsigned, so SmartScreen warns every downloader.
  `docs/INSTALL.md` explains the warning honestly rather than hiding it. Fixing it requires
  buying a certificate (~$100–400/yr) and adding it to `release.yml` — a purchase, not an
  engineering task.
- **Auto-updater.** Designed in `docs/08 §5`, not implemented; it needs signing keys first.
- **SBOM and attestations.** `docs/18 §4` release-gate items, not wired up.
- **Portable build.** FR-11.4, not built.

## 7. If something goes wrong

The release is a draft until you publish it, and the tag is the only thing that triggers it. To
retry after a failed workflow:

```bash
git tag -d v1.0.0
git push origin :refs/tags/v1.0.0
```

Then fix, re-tag and push again. Deleting a tag that has already been published to users is
worse than shipping a `v1.0.1`, so only do this while the release is still a draft.
