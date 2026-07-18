# 06 — Data Flow

**Related:** [03_System_Architecture.md](03_System_Architecture.md) · [05_Component_Design.md](05_Component_Design.md) · [16_API_Design.md](16_API_Design.md)

Canonical flows. Arrows: `→` sync call, `⇒` async command (invoke), `⇢` event (emit), `~>` worker message.

---

## 1. Open file

```
User (tree dblclick / Ctrl+P / OS "Open with")
  → tabs.openFile(path)
  ⇒ fs.read_file(path)                      # Rust: scope-check, stream chunks,
  ⇢ fs:chunk events (large files)           #   detect encoding + EOL
  → documents.register(docId, meta)
  → CM6 view created ← first chunk (editor usable immediately)
  → watcher.watch_file(path)                # external-change detection
  → md.worker ~> initial render ~> preview blocks + outline + lineMap
  → outline store updated; tab shows title; session snapshot scheduled
```

Failure paths: `E_NOT_FOUND` → toast + remove from recent; `E_BINARY` → hex-preview refusal dialog; `E_TOO_LARGE`(>512 MB hard cap) → refusal with explanation.

## 2. Edit keystroke (hot path — budget ≤ 16 ms main thread)

```
keystroke → CM6 transaction (sync, rope update, decorations)
         → documents.markDirty(docId)        # cheap store write
         → debounce 75 ms idle
             ~> md.worker { version, text }  # transfer via structured clone
                 worker: block-split → diff block hashes → parse changed blocks
                 (remark→rehype→sanitize→serialize) → outline + lineMap rebuild
             ~> response { changed blocks, manifest, outline, lineMap }
         → version check (discard stale)
         → PreviewPane patches changed block DOM nodes only
         → shiki.worker ~> highlight new/changed code blocks ~> patch in
```

Main thread never parses Markdown. Preview patch is `requestIdleCallback`-scheduled when tab is not in split/preview mode.

## 3. Scroll sync (split mode)

```
Source scroll (leader=source):
  CM6 scrolled(topLine) → SplitContainer → lineMap.blockFor(topLine)
  → PreviewPane.revealBlock(id, interpolate(offsetInBlock)) [suppress echo 150ms]

Preview scroll (leader=preview): inverse via block→srcLineStart.
Cursor sync: cursorMoved(line) → preview block flash-highlight (FR-2.5).
```

## 4. Save

```
Ctrl+S → documents.save(docId)
  → CM6 state → text snapshot
  ⇒ fs.write_file(path, text, { encoding, eol, atomic: true })
      Rust: write tmp in same dir → fsync → rename over target
      → suppress next watcher event for this path (self-change marker)
  → documents.clearDirty; status bar "Saved" (live region)
Save As ⇒ dialog.save() ⇒ same, then re-register path, update watchers/recent.
```

Conflict: if watcher flagged external change while dirty → dialog {Overwrite / Reload / Save a copy} before write.

## 5. External change

```
notify (Rust, debounced 300ms, self-changes filtered)
  ⇢ fs:changed { path, kind: modify|remove|rename }
  → if open + clean → auto-reload, preserve cursor/scroll (best effort)
  → if open + dirty → non-blocking banner: "Changed on disk" {Reload | Keep mine | Diff(P2)}
  → if tree-visible → workspace.treeIndex patch (add/remove/rename node)
```

## 6. Workspace search

```
Ctrl+Shift+F → search panel → query + opts
  ⇒ search.start { root, query, regex, caseSensitive, wholeWord, respectGitignore } → token
  ⇢ search:results { token, batch: [{file, line, col, preview}] }   # batched ~50, streamed
  ⇢ search:done { token, stats } | search:error
  → results store append (virtualized list renders incrementally)
New query / Esc ⇒ search.cancel(token)   # Rust cancellation flag checked per file
Result click → open file (flow 1) → revealLine + flash highlight.
```

## 7. Settings change

```
Settings UI toggle → ⇒ config.set(key, value)
  Rust: validate against schema → write TOML (atomic) 
  ⇢ config:changed { key, value }        # also fired on manual file edit (config watcher)
  → settings store patch → subscribers react (theme swap, editor reconfigure, etc.)
```

Single loop for both UI edits and hand-edits of the TOML — the file is the source of truth, the event is the propagation.

## 8. Session lifecycle

```
Continuous: tabs/cursor/scroll/mode changes → debounced 2 s
  ⇒ session.snapshot(json)
Startup: ⇒ session.load → restore tabs (lazy: active tab loads content first,
  others hydrate on activation) → restore window geometry
Crash recovery: dirty docs additionally draft-snapshotted every 30 s
  ⇒ session.draft(docId, text); startup with drafts present → recovery prompt.
```

## 9. Checkbox toggle from preview (write-back)

```
Preview checkbox click → { srcLine } from block metadata
  → SourcePane.applyTextEdit(toggle "[ ]"/"[x]" at srcLine)   # through CM6 transaction → undoable
  → normal edit flow (2) re-renders block
```

Pattern rule: **preview never mutates HTML state directly** — all mutations round-trip through the source document, keeping undo history and single-source-of-truth intact.

## 10. Export HTML

```
Command → md.worker full render (no virtualization, all blocks)
  → assemble: html + inlined theme CSS + inlined Shiki CSS + embedded local images (base64, opt-in)
  ⇒ export.write_html(path, html)
```
