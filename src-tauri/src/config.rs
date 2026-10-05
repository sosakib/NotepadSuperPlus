//! User settings, persisted as TOML in the app data directory (docs/07 §3,
//! docs/11 FR-11.1/11.2). Every field has a default, so a missing, partial, or
//! corrupt file degrades to defaults rather than failing to start.

use crate::error::{NspError, NspResult};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct Config {
    /// Theme id, or "system" to follow the OS.
    pub theme: String,
    pub word_wrap: bool,
    pub font_family: String,
    pub font_size: u32,
    /// Zoom step; each step is ~10%.
    pub zoom: i32,
    pub sidebar_width: u32,
    pub split_ratio: f64,
    pub show_hidden_files: bool,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            word_wrap: true,
            font_family: "Cascadia Code".to_string(),
            font_size: 14,
            zoom: 0,
            sidebar_width: 280,
            split_ratio: 0.5,
            show_hidden_files: false,
        }
    }
}

impl Config {
    /// Clamps values into supported ranges so a hand-edited file can't break the UI.
    fn sanitized(mut self) -> Self {
        self.font_size = self.font_size.clamp(8, 32);
        self.zoom = self.zoom.clamp(-4, 8);
        self.sidebar_width = self.sidebar_width.clamp(240, 400);
        self.split_ratio = self.split_ratio.clamp(0.2, 0.8);
        if self.font_family.trim().is_empty() {
            self.font_family = Config::default().font_family;
        }
        self
    }
}

pub struct ConfigState {
    path: PathBuf,
    inner: Mutex<Config>,
}

impl ConfigState {
    pub fn load(app_data_dir: PathBuf) -> Self {
        let path = app_data_dir.join("config.toml");
        let config = std::fs::read_to_string(&path)
            .ok()
            .and_then(|text| match toml::from_str::<Config>(&text) {
                Ok(c) => Some(c),
                Err(e) => {
                    tracing::warn!(error = %e, "config.toml is invalid; using defaults");
                    None
                }
            })
            .unwrap_or_default()
            .sanitized();
        Self {
            path,
            inner: Mutex::new(config),
        }
    }

    pub fn get(&self) -> Config {
        self.inner
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .clone()
    }

    /// Writes settings to disk atomically-ish (temp file then rename).
    pub fn save(&self, config: Config) -> NspResult<Config> {
        let config = config.sanitized();
        let text = toml::to_string_pretty(&config)
            .map_err(|e| NspError::new("E_IO", format!("Could not serialize settings: {e}")))?;

        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| NspError::io(parent, &e))?;
        }
        let tmp = self.path.with_extension("toml.tmp");
        std::fs::write(&tmp, text).map_err(|e| NspError::io(&tmp, &e))?;
        std::fs::rename(&tmp, &self.path).map_err(|e| {
            let _ = std::fs::remove_file(&tmp);
            NspError::io(&self.path, &e)
        })?;

        *self
            .inner
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner) = config.clone();
        Ok(config)
    }

    /// The settings file path, so the UI can offer "open settings file".
    pub fn path(&self) -> String {
        self.path.display().to_string()
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
            std::env::temp_dir().join(format!("nsp-cfg-{}-{}-{}", std::process::id(), nanos, seq));
        std::fs::create_dir_all(&d).unwrap();
        d
    }

    #[test]
    fn defaults_apply_when_no_file_exists() {
        let state = ConfigState::load(dir());
        assert_eq!(state.get(), Config::default());
    }

    #[test]
    fn saves_and_reloads_settings() {
        let d = dir();
        let state = ConfigState::load(d.clone());
        let mut cfg = state.get();
        cfg.theme = "nord".into();
        cfg.font_size = 18;
        state.save(cfg).unwrap();

        let reloaded = ConfigState::load(d);
        assert_eq!(reloaded.get().theme, "nord");
        assert_eq!(reloaded.get().font_size, 18);
    }

    #[test]
    fn clamps_out_of_range_values() {
        let d = dir();
        let state = ConfigState::load(d);
        let cfg = Config {
            font_size: 999,
            split_ratio: 5.0,
            sidebar_width: 10,
            ..Config::default()
        };
        let saved = state.save(cfg).unwrap();
        assert_eq!(saved.font_size, 32);
        assert_eq!(saved.split_ratio, 0.8);
        assert_eq!(saved.sidebar_width, 240);
    }

    #[test]
    fn invalid_file_falls_back_to_defaults() {
        let d = dir();
        std::fs::write(d.join("config.toml"), "this is not valid toml {{{").unwrap();
        assert_eq!(ConfigState::load(d).get(), Config::default());
    }

    #[test]
    fn partial_file_keeps_defaults_for_missing_fields() {
        let d = dir();
        std::fs::write(d.join("config.toml"), "theme = \"github\"\n").unwrap();
        let cfg = ConfigState::load(d).get();
        assert_eq!(cfg.theme, "github");
        assert_eq!(cfg.font_size, Config::default().font_size);
    }
}
