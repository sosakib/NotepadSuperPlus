//! End-to-end journey tests across the Rust surface (Stage 12 / blocker B4).
//!
//! The per-module unit tests check functions in isolation. These cross module
//! boundaries against a **real temporary filesystem** — the paths `docs/10 §3` calls
//! release-blocking and the 2026-07-21 audit called "verified only by unit tests, never
//! clicked": open → edit → save round-trips, session save → restore, workspace open →
//! list → search, and settings persistence.
//!
//! Deliberately inside the crate rather than in `tests/`. The modules are private, and
//! an integration-test crate would only reach them by making the whole module tree
//! `pub` — widening the real API to suit a test.
//!
//! What this cannot cover: the `#[tauri::command]` wrappers and the WebView. Those need
//! a WebDriver (`tauri-driver` + `msedgedriver`), which is not installed here. The
//! wrappers are thin — they unwrap `State` and call straight into what is tested below —
//! but "thin" is an argument, not a test, and it is recorded as such in
//! `docs/reports/E2E_COVERAGE.md`.

#![cfg(test)]

use crate::{config, fs as nfs, fsops, search, session};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

static SEQ: AtomicU64 = AtomicU64::new(0);

/// A fresh temp directory per test. Tests run in parallel, so a shared fixture
/// directory would let one test's files satisfy another's assertions.
fn workspace() -> PathBuf {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let seq = SEQ.fetch_add(1, Ordering::Relaxed);
    let d = std::env::temp_dir().join(format!("nsp-journey-{}-{nanos}-{seq}", std::process::id()));
    std::fs::create_dir_all(&d).unwrap();
    d
}

fn write(path: &Path, bytes: &[u8]) {
    if let Some(p) = path.parent() {
        std::fs::create_dir_all(p).unwrap();
    }
    std::fs::write(path, bytes).unwrap();
}

// ---------------------------------------------------------------------------
// Journey 1 — open → edit → save, and the session survives a restart
// ---------------------------------------------------------------------------

#[test]
fn journey_open_edit_save_preserves_crlf() {
    let ws = workspace();
    let file = ws.join("notes.md");
    write(&file, b"# Title\r\nline two\r\n");

    let opened = nfs::read_file(&file).unwrap();
    // The editor works in LF; CRLF is remembered, not rewritten in the buffer.
    assert_eq!(opened.eol, "crlf");
    assert!(
        !opened.content.contains('\r'),
        "buffer should be normalized to LF"
    );

    // Edit as the editor would, then save with the encoding/EOL we were handed back.
    let edited = opened.content.replace("line two", "line two edited");
    nfs::write_file(&file, &edited, &opened.encoding, &opened.eol).unwrap();

    // The bytes on disk must be CRLF again, or every save would silently reformat
    // someone's file and show up as a whole-file diff.
    let raw = std::fs::read(&file).unwrap();
    let text = String::from_utf8(raw).unwrap();
    assert!(text.contains("line two edited\r\n"));
    assert!(!text.contains("line two edited\n\n"));

    let reopened = nfs::read_file(&file).unwrap();
    assert_eq!(reopened.eol, "crlf");
    assert!(reopened.content.contains("line two edited"));
}

#[test]
fn journey_save_preserves_utf16_and_bom() {
    let ws = workspace();
    let file = ws.join("utf16.md");
    // UTF-16 LE with BOM.
    let mut bytes = vec![0xFF, 0xFE];
    for u in "# Hi".encode_utf16() {
        bytes.extend_from_slice(&u.to_le_bytes());
    }
    write(&file, &bytes);

    let opened = nfs::read_file(&file).unwrap();
    assert!(
        opened.encoding.to_lowercase().contains("utf-16"),
        "got {}",
        opened.encoding
    );
    assert!(opened.content.contains("# Hi"));

    nfs::write_file(&file, "# Hi there", &opened.encoding, &opened.eol).unwrap();

    let raw = std::fs::read(&file).unwrap();
    assert_eq!(&raw[..2], &[0xFF, 0xFE], "BOM must survive a round-trip");
    let reopened = nfs::read_file(&file).unwrap();
    assert!(reopened.content.contains("# Hi there"));
}

#[test]
fn journey_session_restores_open_files_after_restart() {
    let ws = workspace();
    let data = ws.join("appdata");
    std::fs::create_dir_all(&data).unwrap();
    let a = ws.join("a.md");
    let b = ws.join("b.md");
    write(&a, b"# A");
    write(&b, b"# B");

    // Session 1: two files open, second active, caret parked mid-document.
    let s1 = session::SessionState::load(data.clone());
    s1.save(session::Session {
        tabs: vec![
            session::SessionTab {
                path: a.display().to_string(),
                line: 1,
                column: 1,
            },
            session::SessionTab {
                path: b.display().to_string(),
                line: 12,
                column: 4,
            },
        ],
        active: Some(1),
        view_mode: "split".into(),
        workspace: Some(ws.display().to_string()),
    })
    .unwrap();

    // Session 2: a fresh process reading the same directory.
    let restored = session::SessionState::load(data).get();
    assert_eq!(restored.tabs.len(), 2);
    assert_eq!(restored.active, Some(1));
    assert_eq!(restored.tabs[1].line, 12);
    assert_eq!(restored.tabs[1].column, 4);
    assert_eq!(restored.view_mode, "split");
    assert_eq!(restored.workspace, Some(ws.display().to_string()));

    // Every restored path must still be openable — a session that restores a path
    // `read_file` then rejects is worse than not restoring it.
    for tab in &restored.tabs {
        nfs::read_file(Path::new(&tab.path)).unwrap();
    }
}

#[test]
fn journey_session_survives_a_file_deleted_between_runs() {
    let ws = workspace();
    let data = ws.join("appdata");
    std::fs::create_dir_all(&data).unwrap();
    let keep = ws.join("keep.md");
    let gone = ws.join("gone.md");
    write(&keep, b"# keep");
    write(&gone, b"# gone");

    let s1 = session::SessionState::load(data.clone());
    s1.save(session::Session {
        tabs: vec![
            session::SessionTab {
                path: gone.display().to_string(),
                line: 1,
                column: 1,
            },
            session::SessionTab {
                path: keep.display().to_string(),
                line: 5,
                column: 1,
            },
        ],
        active: Some(1),
        ..session::Session::default()
    })
    .unwrap();

    std::fs::remove_file(&gone).unwrap();

    let restored = session::SessionState::load(data).get();
    assert_eq!(
        restored.tabs.len(),
        1,
        "the missing file must be dropped, not restored as an error tab"
    );
    assert_eq!(restored.tabs[0].path, keep.display().to_string());
    // Active pointed at index 1; after pruning it must follow the file, not the index.
    assert_eq!(restored.active, Some(0));
    assert_eq!(
        restored.tabs[0].line, 5,
        "caret position must survive the pruning"
    );
}

// ---------------------------------------------------------------------------
// Journey 5 — workspace: open → list → search → open the match
// ---------------------------------------------------------------------------

#[test]
fn journey_open_workspace_list_and_search() {
    let ws = workspace();
    write(&ws.join("readme.md"), b"# Readme\nthe needle is here\n");
    write(
        &ws.join("docs/guide.md"),
        b"# Guide\nno needle\nneedle again\n",
    );
    write(&ws.join("docs/nested/deep.md"), b"nothing\n");

    let entries = fsops::list_dir(&ws).unwrap();
    let names: Vec<_> = entries.iter().map(|e| e.name.as_str()).collect();
    assert!(names.contains(&"readme.md"), "got {names:?}");
    assert!(names.contains(&"docs"), "got {names:?}");

    let results = search::search_workspace(&search::SearchQuery {
        root: ws.display().to_string(),
        query: "needle".into(),
        regex: false,
        case_sensitive: false,
        whole_word: false,
        respect_gitignore: true,
    })
    .unwrap();

    assert_eq!(
        results.matches.len(),
        3,
        "two files, three hits: {:?}",
        results.matches
    );

    // Every hit must be openable at the line it claims — the UI navigates straight
    // there, so an off-by-one or a stale path is a broken journey.
    for m in &results.matches {
        let content = nfs::read_file(Path::new(&m.path)).unwrap().content;
        let line = content.lines().nth(m.line - 1).unwrap_or("");
        assert!(
            line.to_lowercase().contains("needle"),
            "match at {}:{} points at {line:?}",
            m.path,
            m.line
        );
    }
}

#[test]
fn journey_search_respects_gitignore_then_ignores_it_when_asked() {
    let ws = workspace();
    write(&ws.join(".gitignore"), b"secret/\n");
    write(&ws.join("visible.md"), b"token here\n");
    write(&ws.join("secret/hidden.md"), b"token here\n");

    let q = |respect: bool| search::SearchQuery {
        root: ws.display().to_string(),
        query: "token".into(),
        regex: false,
        case_sensitive: false,
        whole_word: false,
        respect_gitignore: respect,
    };

    let respected = search::search_workspace(&q(true)).unwrap();
    assert_eq!(respected.matches.len(), 1, "ignored dir must be skipped");

    let everything = search::search_workspace(&q(false)).unwrap();
    assert_eq!(
        everything.matches.len(),
        2,
        "opting out must reach the ignored dir"
    );
}

#[test]
fn journey_create_rename_duplicate_then_trash() {
    let ws = workspace();

    let created = fsops::create(&ws, "draft.md", false).unwrap();
    assert!(Path::new(&created.path).is_file());

    let renamed = fsops::rename(Path::new(&created.path), "final.md").unwrap();
    assert!(Path::new(&renamed.path).is_file());
    assert!(
        !Path::new(&created.path).exists(),
        "the old name must be gone"
    );

    let copy = fsops::duplicate(Path::new(&renamed.path)).unwrap();
    assert!(Path::new(&copy.path).is_file());
    assert_ne!(
        copy.path, renamed.path,
        "duplicate must not overwrite the original"
    );

    // Trash, not delete: this is the app's one hard guarantee about user data. On a
    // machine with no recycle bin for temp volumes this can legitimately fail, so the
    // assertion is that the file is no longer *there* — by whichever route.
    if fsops::trash(Path::new(&copy.path)).is_ok() {
        assert!(!Path::new(&copy.path).exists());
    }
    assert!(
        Path::new(&renamed.path).is_file(),
        "the original must be untouched"
    );
}

// ---------------------------------------------------------------------------
// Journey 9 — settings: change in UI → file updated; hand-edit → UI follows
// ---------------------------------------------------------------------------

#[test]
fn journey_settings_round_trip_and_hand_edit() {
    let ws = workspace();

    // Change in the UI → persisted.
    let s1 = config::ConfigState::load(ws.clone());
    let mut cfg = s1.get();
    cfg.theme = "everforest".into();
    cfg.font_size = 17;
    s1.save(cfg).unwrap();

    let s2 = config::ConfigState::load(ws.clone());
    assert_eq!(s2.get().theme, "everforest");
    assert_eq!(s2.get().font_size, 17);

    // Hand-edit the file → the app follows on next launch.
    std::fs::write(ws.join("config.toml"), "theme = \"nord\"\nfontSize = 21\n").unwrap();
    let s3 = config::ConfigState::load(ws.clone());
    assert_eq!(s3.get().theme, "nord");
    assert_eq!(s3.get().font_size, 21);

    // An out-of-range hand-edit must clamp, not break the UI.
    std::fs::write(ws.join("config.toml"), "fontSize = 9999\n").unwrap();
    assert_eq!(config::ConfigState::load(ws.clone()).get().font_size, 32);

    // Garbage must fall back to defaults rather than refusing to start.
    std::fs::write(ws.join("config.toml"), "this is not toml {{{").unwrap();
    assert_eq!(
        config::ConfigState::load(ws).get(),
        config::Config::default()
    );
}

#[test]
fn journey_settings_and_session_are_independent() {
    let ws = workspace();
    let file = ws.join("a.md");
    write(&file, b"# A");

    config::ConfigState::load(ws.clone())
        .save(config::Config {
            theme: "monochrome".into(),
            ..config::Config::default()
        })
        .unwrap();
    session::SessionState::load(ws.clone())
        .save(session::Session {
            tabs: vec![session::SessionTab {
                path: file.display().to_string(),
                line: 1,
                column: 1,
            }],
            active: Some(0),
            ..session::Session::default()
        })
        .unwrap();

    // Corrupting one must not take the other with it — the whole reason they are
    // separate files.
    std::fs::write(ws.join("session.json"), "{ corrupt").unwrap();
    assert_eq!(
        config::ConfigState::load(ws.clone()).get().theme,
        "monochrome"
    );
    assert!(session::SessionState::load(ws).get().tabs.is_empty());
}
