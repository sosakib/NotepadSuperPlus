//! Notepad Super Plus — Rust core.
//!
//! Stage 5 adds the filesystem surface: reading/writing files with encoding and
//! line-ending handling, atomic saves, a file watcher for external changes, and a
//! recent-files list (docs/07, docs/16).

#![forbid(unsafe_code)]
#![warn(missing_docs)]

mod error;
mod fs;
mod fsops;
mod recent;
mod search;
mod watcher;

use error::NspResult;
use fs::FileContent;
use fsops::Entry;
use recent::RecentState;
use serde::Serialize;
use std::path::Path;
use tauri::Manager;
use tracing_subscriber::EnvFilter;
use watcher::WatcherState;

/// Returns the application version (compile-time `CARGO_PKG_VERSION`).
#[tauri::command]
fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Result of a successful save.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SaveResult {
    path: String,
    mtime_ms: u64,
}

/// Reads a file as text; begins watching it and records it as recently opened.
#[tauri::command]
fn fs_read_file(
    path: String,
    watcher: tauri::State<'_, WatcherState>,
    recent: tauri::State<'_, RecentState>,
) -> NspResult<FileContent> {
    let p = Path::new(&path);
    let content = fs::read_file(p)?;
    let abs = fs::canonicalize_existing(p)?;
    watcher.watch(&abs);
    recent.add(abs.display().to_string());
    Ok(content)
}

/// Writes text atomically, suppressing the resulting watcher event.
#[tauri::command]
fn fs_write_file(
    path: String,
    content: String,
    encoding: String,
    eol: String,
    watcher: tauri::State<'_, WatcherState>,
    recent: tauri::State<'_, RecentState>,
) -> NspResult<SaveResult> {
    let abs = fs::canonicalize_for_write(Path::new(&path))?;
    watcher.suppress(&abs);
    let mtime_ms = fs::write_file(&abs, &content, &encoding, &eol)?;
    watcher.watch(&abs);
    recent.add(abs.display().to_string());
    Ok(SaveResult {
        path: abs.display().to_string(),
        mtime_ms,
    })
}

/// Stops watching a file (e.g. when its tab closes).
#[tauri::command]
fn fs_unwatch(path: String, watcher: tauri::State<'_, WatcherState>) {
    watcher.unwatch(Path::new(&path));
}

/// Returns the recent-files list, most recent first.
#[tauri::command]
fn recent_list(recent: tauri::State<'_, RecentState>) -> Vec<String> {
    recent.list()
}

/// Opens a folder as the workspace root: lists it and starts watching the tree.
#[tauri::command]
fn ws_open(path: String, watcher: tauri::State<'_, WatcherState>) -> NspResult<Vec<Entry>> {
    let abs = fs::canonicalize_existing(Path::new(&path))?;
    let entries = fsops::list_dir(&abs)?;
    watcher.watch_dir(&abs);
    Ok(entries)
}

/// Lists one directory level (lazy tree expansion).
#[tauri::command]
fn fs_list_dir(path: String) -> NspResult<Vec<Entry>> {
    fsops::list_dir(Path::new(&path))
}

/// Creates a file or folder inside a directory.
#[tauri::command]
fn fs_create(dir: String, name: String, is_dir: bool) -> NspResult<Entry> {
    fsops::create(Path::new(&dir), &name, is_dir)
}

/// Renames a file or folder in place.
#[tauri::command]
fn fs_rename(path: String, new_name: String) -> NspResult<Entry> {
    fsops::rename(Path::new(&path), &new_name)
}

/// Moves a file or folder to the OS trash.
#[tauri::command]
fn fs_trash(path: String, watcher: tauri::State<'_, WatcherState>) -> NspResult<()> {
    let p = Path::new(&path);
    watcher.unwatch(p);
    fsops::trash(p)
}

/// Duplicates a file next to itself.
#[tauri::command]
fn fs_duplicate(path: String) -> NspResult<Entry> {
    fsops::duplicate(Path::new(&path))
}

/// Searches the workspace for text, respecting .gitignore by default.
#[tauri::command]
async fn search_workspace(query: search::SearchQuery) -> NspResult<search::SearchResults> {
    // Walking the tree is blocking work; keep it off the IPC thread (docs/13 §2).
    tauri::async_runtime::spawn_blocking(move || search::search_workspace(&query))
        .await
        .map_err(|e| error::NspError::new("E_IO", e.to_string()))?
}

/// Builds and runs the Tauri application.
pub fn run() {
    init_tracing();
    tracing::info!(
        version = env!("CARGO_PKG_VERSION"),
        "Notepad Super Plus starting"
    );

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let handle = app.handle().clone();
            app.manage(WatcherState::new(handle));
            let data_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| std::env::temp_dir());
            app.manage(RecentState::load(data_dir));
            tracing::info!("application setup complete");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            app_version,
            fs_read_file,
            fs_write_file,
            fs_unwatch,
            recent_list,
            ws_open,
            fs_list_dir,
            fs_create,
            fs_rename,
            fs_trash,
            fs_duplicate,
            search_workspace
        ])
        .run(tauri::generate_context!())
        .expect("error while running Notepad Super Plus");
}

/// Initializes structured logging. Level is controlled by the `NSP_LOG` env var
/// (default `info`). No document content is ever logged (docs/08 §7).
fn init_tracing() {
    let filter = EnvFilter::try_from_env("NSP_LOG").unwrap_or_else(|_| EnvFilter::new("info"));
    let _ = tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_target(false)
        .try_init();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn app_version_matches_cargo_manifest() {
        assert_eq!(app_version(), env!("CARGO_PKG_VERSION"));
        assert!(!app_version().is_empty());
    }
}
