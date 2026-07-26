# End-to-End Coverage — What Is Tested, and What Still Is Not

**Date:** 2026-07-26 · **Blocker:** B4 · **Spec:** `docs/10_Testing_Strategy.md` §3

---

## Summary

B4 asked for the 10 release-blocking journeys, automated with WebdriverIO + `tauri-driver`.
**That is not what shipped.** `tauri-driver` needs `msedgedriver.exe` matching the installed
WebView2 runtime, which is not present on this machine and is a binary download.

What shipped instead is **two verified layers** covering most of the same ground:

| Layer | File | Tests | Drives |
|---|---|---|---|
| Rust journeys | `src-tauri/src/journeys.rs` | 9 | Real temp filesystem, across module boundaries |
| UI journeys | `src/journeys.test.tsx` | 11 | The real `App`, rendered and clicked, IPC mocked |

Every one was run and passes. Nothing here is written-but-unexecuted.

**This found two real bugs that 300+ unit tests had not.** See §3.

---

## 1. Journey coverage against `docs/10 §3`

| # | Journey | Status |
|---|---|---|
| 1 | Open folder → create file → type → save → relaunch → session restored | **Covered, split across layers.** Rust: open→edit→save round-trip (CRLF and UTF-16 preserved), session save→restore incl. caret, session survives a file deleted between runs. UI: boot → welcome → create document → tab appears; `session_get` invoked on every launch. *Not covered:* the real file-picker dialog. |
| 2 | 100 MB file → scroll → edit → save, no long task > 100 ms | **Not covered.** Needs the large-file generator and long-task tracing from `docs/09 §7`; neither exists. |
| 3 | Split mode → outline updates → click outline navigates; scroll sync | **Partial.** UI: view-mode switch mounts the matching lazy pane. Outline generation and source-line stamping are asserted in `src/markdown/*.test.ts` (incl. line numbers surviving frontmatter). *Not covered:* clicking an outline row moving both panes, and scroll sync — both need layout, which jsdom has none of. |
| 4 | External modify while dirty → conflict banner → both resolution paths | **Covered (UI).** Banner appears for a dirty conflicted document; "Keep my changes" dismisses it and — asserted explicitly — leaves the buffer dirty, so the next save cannot silently skip. *Not covered:* a real filesystem watcher event driving it. |
| 5 | Workspace search 10k files → stream → open match → highlight | **Covered at the data layer (Rust).** Workspace open → list → search; every hit is re-opened and the claimed line verified to contain the match, so an off-by-one is caught. Gitignore respected, and opting out reaches the ignored directory. *Not covered:* 10k-file scale, result streaming (deferred from Stage 7), and the highlight in the UI. |
| 6 | Checkbox toggle in preview → source updated → undo restores | **Not covered — the feature does not exist.** FR-3.12 is unimplemented. No test was written, rather than writing one that asserts nothing. |
| 7 | Theme switch → sane rendering; reduced motion honoured | **Covered (UI).** Tokens land on the document root, `data-scheme` flips for light themes, `--cm-*` follows so the editor and code blocks do not keep the old palette, and the rail button reaches all 10 themes (regression guard for D2). Contrast for all 10 themes is enforced separately in `src/theme/contrast.test.ts`. *Not covered:* screenshot diffing, and `prefers-reduced-motion` — jsdom applies no stylesheets. |
| 8 | Keyboard-only execution of every journey | **Partial.** The command palette journey is entirely keyboard-driven (`Ctrl+Shift+P`, `Escape`). The rest use clicks. |
| 9 | Settings change → TOML updated; hand-edit → UI follows; invalid → fallback | **Covered.** Rust: save→reload, hand-edited file honoured, out-of-range clamped, invalid TOML falls back to defaults, and settings/session shown to be independent when one is corrupted. UI: a font-size change reaches `config_save` with the right value through the IPC boundary. |
| 10 | Export HTML → standalone, sanitized, styled | **Partial.** Sanitization and standalone output are asserted in `src/actions/exportActions.test.ts` and `src/markdown/*.test.ts` (incl. a code fence not smuggling live markup). *Not covered:* the real save dialog and opening the artefact in a browser. |

**7 of 10 covered or substantially covered. 2 not covered (2, 6). 1 partial (8).**
Journey 6 cannot be covered until the feature exists.

---

## 2. What these layers cannot do

Stated plainly so the coverage is not overread:

- **No WebView.** jsdom is not a browser: no layout, no paint, no CSS applied. Anything about
  pixels, scroll position, or computed styles from stylesheets is out of reach.
- **The IPC boundary is mocked.** `invoke` is a stub. The `#[tauri::command]` wrappers are not
  executed by any test. They are thin — each unwraps `State` and calls straight into code that
  *is* tested — but "thin" is an argument, not a test.
- **No real file dialogs.** Every open/save/save-as/folder-pick path still reaches the OS dialog
  only when a human clicks it.
- **No clean-machine install test.** Never performed.

## 3. Bugs these tests found

Both were user-visible, both contradicted shipped documentation, and both survived 300+ unit
tests because they only appear when modules are combined.

1. **Every UTF-16 file was rejected as binary.** `read_file` sniffed the first 8 KB for a NUL byte
   and bailed. UTF-16 encodes ASCII as `XX 00`, so *every* UTF-16 document hit that guard — which
   made the UTF-16 branches in `decode`/`encode` unreachable dead code, and made the README's
   "UTF-8 / UTF-16 / BOM are detected and preserved" false. The BOM check now runs first.
   - Second-order bug found with it: `detect_eol` scanned raw bytes for `0D 0A`, which are never
     adjacent in UTF-16, so a CRLF UTF-16 file reported LF and would have had its line endings
     silently converted on save. It now reads the decoded text.

2. **`.gitignore` was silently ignored outside a git repository.** The `ignore` crate defaults to
   `require_git(true)`, so `.git_ignore(true)` did nothing in a plain folder — and a workspace here
   is just a folder. Users with a `.gitignore` and no `.git` got no filtering while the README
   promised it. Now `require_git(false)`.

A third was found in the test harness itself: jsdom has no `matchMedia`, so mounting the real
`App` threw on its first effect and rendered nothing. That surfaced as ~10 broken selectors rather
than one missing global; it is now stubbed in `src/test/setup.ts`.

---

## 4. To finish B4 as originally specified

1. Install the driver: `cargo install tauri-driver`, and download `msedgedriver.exe` matching the
   WebView2 runtime (currently **150.0.4078.83**) from Microsoft's developer site.
2. Add WebdriverIO with `tauri-driver` as the WebDriver proxy, pointed at the release binary.
3. Port journeys 1, 4, 9 and 10 to click the real dialogs, and add 2 and 8.
4. Wire into `ci.yml`. GitHub's `windows-latest` runners already ship Edge WebDriver, so CI needs
   no extra download step — only local development does.

Until then, the honest position for the release notes is: **no automated test drives the real
window.** That is what they say.
