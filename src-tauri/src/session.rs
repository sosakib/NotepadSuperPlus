//! Workspace session: which documents were open, where the caret was, and which
//! view mode was active (FR-6.4, docs/06 §8).
//!
//! Stored as JSON next to `config.toml`. Settings and session are deliberately
//! separate files: settings are the user's stated preferences, a session is
//! disposable machine state, and losing one should never take the other with it.
//!
//! Only file-backed documents are recorded. Restoring an unsaved buffer means
//! persisting its text, which is crash-draft recovery (FR-1.7) — a different feature
//! with different durability requirements.

use crate::error::{NspError, NspResult};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

/// Restoring hundreds of tabs would make startup worse than losing the session.
const MAX_TABS: usize = 50;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", default)]
pub struct SessionTab {
    /// Absolute path. A tab whose file has since moved is dropped on load.
    pub path: String,
    /// 1-based caret line, as CodeMirror reports it.
    pub line: u32,
    /// 1-based caret column.
    pub column: u32,
}

impl Default for SessionTab {
    fn default() -> Self {
        Self {
            path: String::new(),
            line: 1,
            column: 1,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", default)]
pub struct Session {
    pub tabs: Vec<SessionTab>,
    /// Index into `tabs`. `None` when nothing was open.
    pub active: Option<usize>,
    /// "source" | "preview" | "split". Unknown values fall back to source.
    pub view_mode: String,
    /// Last opened workspace folder, reopened on boot when it still exists.
    pub workspace: Option<String>,
}

/// Hand-written rather than derived: a derived `Default` leaves `view_mode` empty,
/// which `sanitized()` then has to repair. A default that is not already valid is a
/// trap — every comparison against it has to remember to sanitize first.
impl Default for Session {
    fn default() -> Self {
        Self {
            tabs: Vec::new(),
            active: None,
            view_mode: "source".to_string(),
            workspace: None,
        }
    }
}

impl Session {
    /// Drops what can no longer be restored and clamps the rest.
    ///
    /// Files move and get deleted between runs. Restoring a path that no longer
    /// resolves would greet the user with a column of error tabs, so those are
    /// silently dropped — and dropping them shifts `active`, which must follow.
    fn sanitized(mut self) -> Self {
        let active_path = self
            .active
            .and_then(|i| self.tabs.get(i))
            .map(|t| t.path.clone());

        self.tabs
            .retain(|t| !t.path.trim().is_empty() && std::path::Path::new(&t.path).is_file());
        self.tabs.truncate(MAX_TABS);

        for tab in &mut self.tabs {
            tab.line = tab.line.max(1);
            tab.column = tab.column.max(1);
        }

        // Re-find the previously active tab by path rather than trusting the old index.
        self.active = active_path
            .and_then(|p| self.tabs.iter().position(|t| t.path == p))
            .or(if self.tabs.is_empty() { None } else { Some(0) });

        if !matches!(self.view_mode.as_str(), "source" | "preview" | "split") {
            self.view_mode = "source".to_string();
        }

        if let Some(ws) = &self.workspace {
            if !std::path::Path::new(ws).is_dir() {
                self.workspace = None;
            }
        }

        self
    }
}

pub struct SessionState {
    path: PathBuf,
    inner: Mutex<Session>,
}

impl SessionState {
    pub fn load(app_data_dir: PathBuf) -> Self {
        let path = app_data_dir.join("session.json");
        let raw = std::fs::read_to_string(&path)
            .ok()
            .and_then(|text| match serde_json::from_str::<Session>(&text) {
                Ok(s) => Some(s),
                Err(e) => {
                    tracing::warn!(error = %e, "session.json is invalid; starting fresh");
                    None
                }
            })
            .unwrap_or_default();

        let session = raw.clone().sanitized();

        let state = Self {
            path,
            inner: Mutex::new(session.clone()),
        };

        // Persist the pruning immediately rather than waiting for the user to change
        // something. Otherwise a deleted file's entry survives on disk indefinitely,
        // and if that path is ever recreated it reopens on launch as though the user
        // had asked for it. Only writes when sanitizing actually changed something,
        // so a normal launch does no extra I/O.
        if session != raw {
            if let Err(e) = state.save(session) {
                tracing::warn!(error = %e.message, "could not rewrite pruned session");
            }
        }

        state
    }

    pub fn get(&self) -> Session {
        self.inner
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .clone()
    }

    /// Writes the session via temp-file + rename, so an interrupted save cannot
    /// leave a truncated file that loses the session it was trying to preserve.
    pub fn save(&self, session: Session) -> NspResult<Session> {
        // Deliberately not sanitized on the way out: a file may be temporarily
        // unavailable (network drive, sync in progress) and dropping the tab here
        // would lose it permanently. Load-time sanitizing is the right place.
        let mut session = session;
        session.tabs.truncate(MAX_TABS);
        if let Some(i) = session.active {
            if i >= session.tabs.len() {
                session.active = if session.tabs.is_empty() {
                    None
                } else {
                    Some(0)
                };
            }
        }

        let text = serde_json::to_string_pretty(&session)
            .map_err(|e| NspError::new("E_IO", format!("Could not serialize session: {e}")))?;

        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| NspError::io(parent, &e))?;
        }
        let tmp = self.path.with_extension("json.tmp");
        std::fs::write(&tmp, text).map_err(|e| NspError::io(&tmp, &e))?;
        std::fs::rename(&tmp, &self.path).map_err(|e| {
            let _ = std::fs::remove_file(&tmp);
            NspError::io(&self.path, &e)
        })?;

        *self
            .inner
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner) = session.clone();
        Ok(session)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::time::{SystemTime, UNIX_EPOCH};

    static SEQ: AtomicU64 = AtomicU64::new(0);

    fn dir() -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let seq = SEQ.fetch_add(1, Ordering::Relaxed);
        let d =
            std::env::temp_dir().join(format!("nsp-ses-{}-{}-{}", std::process::id(), nanos, seq));
        std::fs::create_dir_all(&d).unwrap();
        d
    }

    fn file(d: &std::path::Path, name: &str) -> String {
        let p = d.join(name);
        std::fs::write(&p, "# hello").unwrap();
        p.display().to_string()
    }

    fn tab(path: &str, line: u32) -> SessionTab {
        SessionTab {
            path: path.to_string(),
            line,
            column: 1,
        }
    }

    #[test]
    fn empty_when_no_file_exists() {
        assert_eq!(SessionState::load(dir()).get(), Session::default());
    }

    #[test]
    fn round_trips_tabs_and_caret() {
        let d = dir();
        let a = file(&d, "a.md");
        let state = SessionState::load(d.clone());
        state
            .save(Session {
                tabs: vec![tab(&a, 42)],
                active: Some(0),
                view_mode: "split".into(),
                workspace: None,
            })
            .unwrap();

        let reloaded = SessionState::load(d).get();
        assert_eq!(reloaded.tabs.len(), 1);
        assert_eq!(reloaded.tabs[0].path, a);
        assert_eq!(reloaded.tabs[0].line, 42);
        assert_eq!(reloaded.view_mode, "split");
        assert_eq!(reloaded.active, Some(0));
    }

    #[test]
    fn rewrites_the_file_when_loading_prunes_a_tab() {
        let d = dir();
        let a = file(&d, "a.md");
        let gone = d.join("gone.md").display().to_string();
        SessionState::load(d.clone())
            .save(Session {
                tabs: vec![tab(&a, 1), tab(&gone, 1)],
                active: Some(0),
                ..Session::default()
            })
            .unwrap();

        // Loading prunes the missing tab; the pruning must reach disk, or the stale
        // path reopens if that file is ever recreated.
        let _ = SessionState::load(d.clone());

        let on_disk: Session =
            serde_json::from_str(&std::fs::read_to_string(d.join("session.json")).unwrap())
                .unwrap();
        assert_eq!(on_disk.tabs.len(), 1);
        assert_eq!(on_disk.tabs[0].path, a);
    }

    #[test]
    fn does_not_rewrite_when_nothing_needed_pruning() {
        let d = dir();
        let a = file(&d, "a.md");
        SessionState::load(d.clone())
            .save(Session {
                tabs: vec![tab(&a, 3)],
                active: Some(0),
                ..Session::default()
            })
            .unwrap();
        let before = std::fs::metadata(d.join("session.json"))
            .unwrap()
            .modified()
            .unwrap();

        let _ = SessionState::load(d.clone());

        let after = std::fs::metadata(d.join("session.json"))
            .unwrap()
            .modified()
            .unwrap();
        assert_eq!(
            before, after,
            "a clean session should not be rewritten on load"
        );
    }

    #[test]
    fn drops_tabs_whose_files_disappeared() {
        let d = dir();
        let a = file(&d, "a.md");
        let gone = d.join("gone.md").display().to_string();
        let state = SessionState::load(d.clone());
        state
            .save(Session {
                tabs: vec![tab(&gone, 1), tab(&a, 1)],
                active: Some(1),
                view_mode: "source".into(),
                workspace: None,
            })
            .unwrap();

        let reloaded = SessionState::load(d).get();
        assert_eq!(reloaded.tabs.len(), 1);
        assert_eq!(reloaded.tabs[0].path, a);
    }

    #[test]
    fn active_follows_its_tab_when_earlier_tabs_are_dropped() {
        let d = dir();
        let gone = d.join("gone.md").display().to_string();
        let b = file(&d, "b.md");
        let state = SessionState::load(d.clone());
        // b is active at index 1; dropping the missing tab shifts it to index 0.
        state
            .save(Session {
                tabs: vec![tab(&gone, 1), tab(&b, 7)],
                active: Some(1),
                view_mode: "source".into(),
                workspace: None,
            })
            .unwrap();

        let reloaded = SessionState::load(d).get();
        assert_eq!(reloaded.active, Some(0));
        assert_eq!(reloaded.tabs[0].path, b);
        assert_eq!(reloaded.tabs[0].line, 7);
    }

    #[test]
    fn invalid_json_starts_fresh_rather_than_failing() {
        let d = dir();
        std::fs::write(d.join("session.json"), "{ not json").unwrap();
        assert_eq!(SessionState::load(d).get(), Session::default());
    }

    #[test]
    fn rejects_unknown_view_mode() {
        let d = dir();
        std::fs::write(
            d.join("session.json"),
            r#"{"tabs":[],"active":null,"viewMode":"hologram"}"#,
        )
        .unwrap();
        assert_eq!(SessionState::load(d).get().view_mode, "source");
    }

    #[test]
    fn caps_restored_tabs() {
        let d = dir();
        let state = SessionState::load(d.clone());
        let tabs: Vec<_> = (0..MAX_TABS + 20)
            .map(|i| tab(&file(&d, &format!("f{i}.md")), 1))
            .collect();
        state
            .save(Session {
                tabs,
                active: Some(0),
                view_mode: "source".into(),
                workspace: None,
            })
            .unwrap();
        assert_eq!(SessionState::load(d).get().tabs.len(), MAX_TABS);
    }

    #[test]
    fn drops_workspace_that_no_longer_exists() {
        let d = dir();
        let state = SessionState::load(d.clone());
        state
            .save(Session {
                workspace: Some(d.join("no-such-dir").display().to_string()),
                ..Session::default()
            })
            .unwrap();
        assert_eq!(SessionState::load(d).get().workspace, None);
    }

    #[test]
    fn keeps_workspace_that_still_exists() {
        let d = dir();
        let state = SessionState::load(d.clone());
        state
            .save(Session {
                workspace: Some(d.display().to_string()),
                ..Session::default()
            })
            .unwrap();
        assert_eq!(
            SessionState::load(d.clone()).get().workspace,
            Some(d.display().to_string())
        );
    }
}
