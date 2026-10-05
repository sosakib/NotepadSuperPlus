//! Recent-files list, persisted as JSON in the app data directory (docs/07 §3).

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

const MAX_RECENT: usize = 20;

#[derive(Serialize, Deserialize, Default)]
struct RecentStore {
    files: Vec<String>,
}

pub struct RecentState {
    path: PathBuf,
    inner: Mutex<RecentStore>,
}

impl RecentState {
    pub fn load(app_data_dir: PathBuf) -> Self {
        let path = app_data_dir.join("recent.json");
        let inner = std::fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str::<RecentStore>(&s).ok())
            .unwrap_or_default();
        Self {
            path,
            inner: Mutex::new(inner),
        }
    }

    pub fn list(&self) -> Vec<String> {
        self.inner
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .files
            .clone()
    }

    pub fn add(&self, file: String) {
        let mut store = self
            .inner
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        store.files.retain(|f| f != &file);
        store.files.insert(0, file);
        store.files.truncate(MAX_RECENT);
        if let Some(parent) = self.path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        // Temp + rename, like config and session: a crash mid-write must not leave
        // invalid JSON that `load()` would silently replace with an empty list.
        if let Ok(json) = serde_json::to_string_pretty(&*store) {
            let tmp = self.path.with_extension("json.tmp");
            if std::fs::write(&tmp, json).is_ok() && std::fs::rename(&tmp, &self.path).is_err() {
                let _ = std::fs::remove_file(&tmp);
            }
        }
    }
}
