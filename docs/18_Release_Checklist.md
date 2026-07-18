# 18 — Release Checklist

**Related:** [14_Git_Workflow.md](14_Git_Workflow.md) §5–6 · [10_Testing_Strategy.md](10_Testing_Strategy.md) §6 · [08_Security_Model.md](08_Security_Model.md) §5

Executed for every release; copy into the release-tracking issue and check items there. Hotfix waiver: only §3 manual matrix and §6 comms may be trimmed ([14] §5) — signing, tests, and integrity steps are never waived.

---

## 1. Pre-freeze

- [ ] Milestone clean: all issues closed or explicitly bumped with comment
- [ ] `CHANGELOG.md` drafted from commits (git-cliff), hand-curated, contributors credited
- [ ] Version bumped (`package.json`, `Cargo.toml`, `tauri.conf.json` — single script `pnpm version:set`)
- [ ] Docs updated: settings reference, keymap spec, roadmap ([11]) refreshed in same PR
- [ ] Deprecations honored (nothing removed without its promised window — [16] §6)

## 2. Quality gates (CI evidence linked in tracking issue)

- [ ] `ci.yml` green on release commit, 3-OS nightly green
- [ ] Full e2e journey suite ([10] §3) green on all 3 OS
- [ ] Perf budgets ([09] §1) green p75, no unexplained trend regression over the cycle
- [ ] Visual baselines reviewed & approved for all bundled themes
- [ ] GFM conformance ≥ target (95 % for 1.0+); deviations doc current
- [ ] Security: XSS + path corpora green; `cargo audit`/`deny` + `pnpm audit` zero high; CodeQL clean
- [ ] Network audit test green (zero non-IPC sockets — NFR-4)
- [ ] a11y: axe zero critical; NVDA + VoiceOver manual pass recorded ([10] §6)

## 3. Manual matrix ([10] §6)

- [ ] Win 10 / Win 11 spot pass (incl. file association, HiDPI)
- [ ] macOS latest + latest−1 (incl. notarization-gatekeeper first-launch)
- [ ] Ubuntu LTS X11 + Wayland; Fedora latest; AppImage on one non-deb distro
- [ ] IME + RTL spot checks
- [ ] Clean-machine install (no dev tools) per OS — the "grandma test"

## 4. Build & integrity

- [ ] Tag `vX.Y.Z` signed, pushed → `release.yml` artifacts: NSIS `.exe` + `.msi`, `.dmg` (universal), `.deb`/`.rpm`/`.AppImage`
- [ ] Windows Authenticode verified; macOS notarization stapled & `spctl` verified
- [ ] Updater manifest signed (minisign), private key ceremony log updated
- [ ] `SHA256SUMS` + GPG signature published; SBOM + build attestations attached
- [ ] Installer sizes within budget (NFR-6) — recorded in tracking issue
- [ ] **Update-path test:** previous release → this release via in-app updater, on all 3 OS, settings/session preserved

## 5. Publish

- [ ] GitHub Release: curated notes, artifacts, checksums, "known issues" section (honest, even if empty is a lie)
- [ ] Package channels: winget manifest PR, Homebrew cask PR, AUR bump, Flathub update (best-effort, tracked per-channel)
- [ ] Docs site version switched; screenshots/GIFs refreshed if UI changed

## 6. Comms & post-release

- [ ] Announcement in Discussions (+ release thread pinned for feedback)
- [ ] Watch first-48h: crash reports in issues, updater errors, package-channel breakage — hotfix threshold pre-agreed (data loss or startup failure = immediate)
- [ ] Retro note in tracking issue: what leaked past gates → new test or checklist item (checklist only grows from evidence)
- [ ] Milestone for next release opened; [11] roadmap column shift
