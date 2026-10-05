//! Watches open files for external changes and emits `fs:changed` to the UI
//! (docs/06 §5, docs/07 §4). Self-inflicted changes (our own atomic saves) are
//! suppressed so a save does not look like an external edit.

use notify_debouncer_mini::notify::{RecommendedWatcher, RecursiveMode};
use notify_debouncer_mini::{new_debouncer, DebounceEventResult, Debouncer};
use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

const SUPPRESS_WINDOW: Duration = Duration::from_millis(1500);

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ChangePayload {
    path: String,
    kind: String,
}

#[derive(Clone, Default)]
struct Shared {
    suppress: Arc<Mutex<HashMap<PathBuf, Instant>>>,
}

/// Managed state holding the live watcher.
pub struct WatcherState {
    debouncer: Mutex<Option<Debouncer<RecommendedWatcher>>>,
    watched: Mutex<HashSet<PathBuf>>,
    /// The current workspace root, so opening another folder can drop the old watch.
    workspace: Mutex<Option<PathBuf>>,
    shared: Shared,
}

impl WatcherState {
    /// Builds the watcher and wires its callback to emit `fs:changed`.
    pub fn new(app: AppHandle) -> Self {
        let shared = Shared::default();
        let cb_shared = shared.clone();

        let debouncer = new_debouncer(
            Duration::from_millis(300),
            move |res: DebounceEventResult| {
                let events = match res {
                    Ok(events) => events,
                    Err(_) => return,
                };
                for ev in events {
                    let path = ev.path;
                    // Our own atomic-save temp files (fs.rs) are never interesting.
                    if path
                        .file_name()
                        .is_some_and(|n| n.to_string_lossy().starts_with(".nsp-tmp-"))
                    {
                        continue;
                    }
                    {
                        let mut sup = cb_shared
                            .suppress
                            .lock()
                            .unwrap_or_else(std::sync::PoisonError::into_inner);
                        if let Some(when) = sup.get(&path) {
                            if when.elapsed() < SUPPRESS_WINDOW {
                                sup.remove(&path);
                                continue;
                            }
                        }
                    }
                    let kind = if path.exists() { "modify" } else { "remove" };
                    let _ = app.emit(
                        "fs:changed",
                        ChangePayload {
                            path: path.display().to_string(),
                            kind: kind.to_string(),
                        },
                    );
                }
            },
        );

        let debouncer = match debouncer {
            Ok(d) => Some(d),
            Err(e) => {
                tracing::warn!(error = %e, "file watcher unavailable");
                None
            }
        };

        Self {
            debouncer: Mutex::new(debouncer),
            watched: Mutex::new(HashSet::new()),
            workspace: Mutex::new(None),
            shared,
        }
    }

    pub fn watch(&self, path: &Path) {
        let mut guard = self
            .debouncer
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        if let Some(deb) = guard.as_mut() {
            if deb
                .watcher()
                .watch(path, RecursiveMode::NonRecursive)
                .is_ok()
            {
                self.watched
                    .lock()
                    .unwrap_or_else(std::sync::PoisonError::into_inner)
                    .insert(path.to_path_buf());
            }
        }
    }

    /// Watches a directory tree (workspace root) for changes.
    pub fn watch_dir(&self, path: &Path) {
        let mut guard = self
            .debouncer
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        if let Some(deb) = guard.as_mut() {
            if deb.watcher().watch(path, RecursiveMode::Recursive).is_ok() {
                self.watched
                    .lock()
                    .unwrap_or_else(std::sync::PoisonError::into_inner)
                    .insert(path.to_path_buf());
            }
        }
    }

    /// Makes `path` the watched workspace root, replacing any previous one.
    pub fn watch_workspace(&self, path: &Path) {
        let previous = self
            .workspace
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .replace(path.to_path_buf());
        if let Some(old) = previous {
            if old != path {
                self.unwatch(&old);
            }
        }
        self.watch_dir(path);
    }

    pub fn unwatch(&self, path: &Path) {
        let mut guard = self
            .debouncer
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        if let Some(deb) = guard.as_mut() {
            let _ = deb.watcher().unwatch(path);
        }
        self.watched
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .remove(path);
    }

    /// Marks a path as about-to-be-written so the resulting event is ignored.
    pub fn suppress(&self, path: &Path) {
        self.shared
            .suppress
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .insert(path.to_path_buf(), Instant::now());
    }
}
