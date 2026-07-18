# 07 — File System Architecture

**Related:** [03_System_Architecture.md](03_System_Architecture.md) · [08_Security_Model.md](08_Security_Model.md) · [06_Data_Flow.md](06_Data_Flow.md)

All filesystem access lives in the Rust core (`nsp-core::fs`). The webview has **no** direct fs capability.

---

## 1. Access scopes

Runtime scope set (in-memory, Rust-owned):

- **Workspace scopes** — folders the user opened via dialog or CLI arg; grants recursive read/write/watch.
- **File scopes** — individual files opened (dialog, drag-drop, OS association); grants that file + sibling-asset read for image resolution (`../assets` style relative image links resolve only if inside an existing scope or the file's own directory).

Every command canonicalizes its path (`dunce::canonicalize` on Windows) and verifies containment in a scope **after** symlink resolution. Violations return `E_SCOPE` and are logged. This is the anti-path-traversal boundary ([08] §3).

## 2. File operations

| Operation | Implementation notes |
|---|---|
| Read | Streamed 1 MB chunks for > 4 MB files; BOM/heuristic encoding detection (`encoding_rs` + `chardetng`); EOL sniff; binary detection (NUL scan in first 8 KB) |
| Write | Atomic: temp file in same directory → write → `fsync` → rename; preserves original permissions; self-change marker registered with watcher before rename |
| Delete | OS trash via `trash` crate — never permanent delete from app UI |
| Rename/Move | `rename` when same volume; copy+trash fallback across volumes; open-tab paths remapped |
| Duplicate | Copy with ` copy`/` (2)` suffix collision strategy |
| Create | Guard against overwrite; templates (empty, frontmatter stub) applied UI-side |

Encoding matrix (FR-1.4): read UTF-8 / UTF-8-BOM / UTF-16 LE / UTF-16 BE / Latin-1 fallback (lossy flag surfaces banner); write in original encoding by default, convertible via status-bar control.

## 3. Application data locations

| Data | Format | Location (per-platform via `dirs` crate) |
|---|---|---|
| Config | TOML | `%APPDATA%/NotepadSuperPlus/config.toml` · `~/Library/Application Support/…` · `~/.config/notepad-super-plus/` |
| Keymap | JSON | same dir, `keybindings.json` |
| Themes (user) | JSON | same dir, `themes/*.json` |
| Session | JSON | same dir, `session.json` |
| Crash drafts | text | same dir, `drafts/<docId>.txt` (pruned on clean save/close) |
| Logs | text | same dir, `logs/` (rotating, 5 × 1 MB max) |

**Portable mode (FR-11.4):** if `portable` marker file sits next to the executable, all of the above resolve to `./data/` beside the executable. Checked once at startup.

## 4. Watching

- One recursive watcher per workspace scope, one non-recursive per loose open file (`notify` crate, platform backends: ReadDirectoryChangesW / FSEvents / inotify).
- Debounce 300 ms per path; rename pairs coalesced; self-changes (our atomic saves) filtered via marker set.
- Event fan-out to UI capped (bulk operations like `git checkout` collapse into a single `fs:bulk_changed { root }` → tree re-sync instead of thousands of events).
- Watcher failure (e.g., inotify limits) degrades gracefully: banner suggests `fs.inotify` limit fix on Linux; polling fallback at 5 s for open files only.

## 5. Workspace tree index

- Lazy: root children listed on open; deeper levels on expand. No full recursive scan on open (10k+ file folders open instantly).
- Node: `{ name, path, kind, hasChildren }`; sorted dirs-first, natural order, locale-aware.
- Hidden files: dotfiles hidden by default (toggle); `.gitignore`d files shown dimmed (toggle).
- Tree index lives Rust-side; UI holds only expanded slices — keeps 100k-file workspaces within memory budget.

## 6. Image asset handling (FR-9.1/9.2)

- Paste/drop image → Rust writes to configured pattern (default `./assets/<docname>/img-<timestamp>.png`, pattern configurable) → returns workspace-relative path → editor inserts `![](path)`.
- Preview resolves relative image srcs through a custom `nsp-asset://` protocol handler (Rust) that enforces scope checks — the webview never gets raw `file://` access ([08] §4).

## 7. Large file strategy (fs side)

- `> 4 MB`: chunked streaming read; memory-mapped (`memmap2`) for workspace-search of big files.
- `> 32 MB`: UI notified → large-file mode ([03] §3.4).
- `> 512 MB`: refuse with `E_TOO_LARGE` (protects webview memory); suggest external tool.
- Search skips files > 64 MB unless explicitly included in options.
