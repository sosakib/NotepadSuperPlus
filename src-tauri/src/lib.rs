//! Notepad Super Plus — Rust core.
//!
//! Stage 5 adds the filesystem surface: reading/writing files with encoding and
//! line-ending handling, atomic saves, a file watcher for external changes, and a
//! recent-files list (docs/07, docs/16).

#![forbid(unsafe_code)]
#![warn(missing_docs)]

mod config;
mod error;
mod fs;
mod fsops;
mod journeys;
mod recent;
mod search;
mod session;
mod watcher;

use config::{Config, ConfigState};
use error::NspResult;
use fs::FileContent;
use fsops::Entry;
use recent::RecentState;
use serde::Serialize;
use session::{Session, SessionState};
use std::path::Path;
use tauri::{Emitter, Manager};
use tracing_subscriber::EnvFilter;
use watcher::WatcherState;

/// Files passed on the command line at launch (Explorer "Open with", drag onto
/// the exe, `nsp file.md`). Held until the frontend asks for them.
struct CliPaths(Vec<String>);

/// Filters command-line arguments down to existing, canonicalized files.
/// `base` resolves relative paths (the invoking shell's working directory).
fn paths_from_args<I: IntoIterator<Item = String>>(args: I, base: &Path) -> Vec<String> {
    args.into_iter()
        .skip(1) // argv[0] is the executable
        .filter(|a| !a.starts_with('-'))
        .filter_map(|a| {
            let p = Path::new(&a);
            let abs = if p.is_absolute() {
                p.to_path_buf()
            } else {
                base.join(p)
            };
            dunce::canonicalize(&abs).ok()
        })
        .filter(|p| p.is_file())
        .map(|p| p.display().to_string())
        .collect()
}

/// Returns the files this instance was launched with (consumed once by the UI).
#[tauri::command]
fn cli_paths(paths: tauri::State<'_, CliPaths>) -> Vec<String> {
    paths.0.clone()
}

/// Returns the application version (compile-time `CARGO_PKG_VERSION`).
#[tauri::command]
fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Process start, captured before any Tauri work.
///
/// The bench harness cannot time startup from outside: the native window handle
/// exists long before WebView2 paints, so an external observer measures ~40 ms for a
/// window nobody can use yet. The app has to report its own readiness.
static PROCESS_START: std::sync::OnceLock<std::time::Instant> = std::sync::OnceLock::new();

/// Milliseconds from process start to the end of Tauri's `setup` hook. Splits the
/// pre-page time into "our Rust work" and "WebView2 bringing itself up", which decides
/// whether the remaining startup cost is something this codebase can act on at all.
static SETUP_DONE_MS: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);

/// Milliseconds from process start to the *first line* of the setup hook. Everything
/// before this is binary load, tracing init, and Tauri/plugin construction — none of
/// which this crate's own setup body can be blamed for.
static SETUP_ENTER_MS: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);

/// Process start → logging initialised.
static PHASE_TRACING_MS: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
/// Process start → `generate_context!()` finished building the embedded asset table.
static PHASE_CONTEXT_MS: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);

/// Records milliseconds since process start into `slot`.
fn mark(slot: &std::sync::atomic::AtomicU64) {
    if let Some(t0) = PROCESS_START.get() {
        slot.store(
            t0.elapsed().as_millis() as u64,
            std::sync::atomic::Ordering::Relaxed,
        );
    }
}

/// Records that the UI reached its interactive phase.
///
/// No-op unless `NSP_BENCH_OUT` names a file to write, so benchmarking costs nothing
/// in normal use beyond one fire-and-forget IPC call.
/// In-page boot phases, milliseconds since the webview's navigation start.
#[derive(serde::Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct InPagePhases {
    script_eval: f64,
    /// Deserialized but not reported: it has measured within 5 ms of `script_eval`
    /// on every run, so printing it only widened the line. Kept so the frontend
    /// payload stays stable and it can be surfaced again without a protocol change.
    #[allow(dead_code)]
    react_mounted: f64,
    interactive: f64,
}

#[tauri::command]
fn bench_ready(in_page: Option<InPagePhases>) {
    let Ok(path) = std::env::var("NSP_BENCH_OUT") else {
        return;
    };
    let Some(start) = PROCESS_START.get() else {
        return;
    };
    let total = start.elapsed().as_secs_f64() * 1000.0;
    let p = in_page.unwrap_or_default();
    // `shell` is everything before the page: process start, our Rust setup, and
    // WebView2 bringing up its runtime. Attributing it separately is the difference
    // between optimising and guessing — and `rust` isolates the part we wrote from
    // the part the platform imposes.
    let shell = (total - p.interactive).max(0.0);
    let rust = SETUP_DONE_MS.load(std::sync::atomic::Ordering::Relaxed);
    let pre = SETUP_ENTER_MS.load(std::sync::atomic::Ordering::Relaxed);
    let tracing_ms = PHASE_TRACING_MS.load(std::sync::atomic::Ordering::Relaxed);
    let ctx = PHASE_CONTEXT_MS.load(std::sync::atomic::Ordering::Relaxed);
    let line = format!(
        "{total:.0} shell={shell:.0} tracing={tracing_ms} context={ctx} pre-setup={pre} rust={rust} script={:.0} interactive={:.0}",
        p.script_eval, p.interactive
    );
    if let Err(e) = std::fs::write(&path, line) {
        tracing::warn!(error = %e, path = %path, "failed to write bench marker");
    }
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
    watcher.watch_workspace(&abs);
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

/// Returns the persisted user settings.
#[tauri::command]
fn config_get(config: tauri::State<'_, ConfigState>) -> Config {
    config.get()
}

/// Persists user settings, returning the sanitized values that were written.
#[tauri::command]
fn config_save(settings: Config, config: tauri::State<'_, ConfigState>) -> NspResult<Config> {
    config.save(settings)
}

/// Path of the settings file, so the UI can offer to open it directly.
#[tauri::command]
fn config_path(config: tauri::State<'_, ConfigState>) -> String {
    config.path()
}

/// Returns the previous session, already pruned of files that no longer exist.
#[tauri::command]
fn session_get(session: tauri::State<'_, SessionState>) -> Session {
    session.get()
}

/// Persists the open documents, caret positions and view mode (FR-6.4).
#[tauri::command]
fn session_save(snapshot: Session, session: tauri::State<'_, SessionState>) -> NspResult<Session> {
    session.save(snapshot)
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
    let _ = PROCESS_START.set(std::time::Instant::now());
    init_tracing();
    tracing::info!(
        version = env!("CARGO_PKG_VERSION"),
        "Notepad Super Plus starting"
    );
    mark(&PHASE_TRACING_MS);

    // `generate_context!()` is evaluated as an argument to `.run()`, which means it
    // executes *before* the setup hook — so it lands inside the pre-setup window that
    // dominates cold start. It deserializes the config and builds the embedded asset
    // table, and the asset table now holds ~180 chunks. Timed separately rather than
    // assumed cheap: last time an assumption about this window went untested, it
    // produced a confident wrong answer about the whole budget.
    let context = tauri::generate_context!();
    mark(&PHASE_CONTEXT_MS);

    tauri::Builder::default()
        // Must be the first plugin: a second launch (e.g. Explorer "Open with"
        // while the app runs) forwards its arguments here and exits.
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            let paths = paths_from_args(args, Path::new(&cwd));
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
            if !paths.is_empty() {
                let _ = app.emit("cli:open", paths);
            }
        }))
        // Defense in depth for the preview: the main window may only ever show the
        // app itself. Anything else (a link a document smuggled past the click
        // handler, a future regression) is refused instead of replacing the editor.
        .plugin(
            tauri::plugin::Builder::<tauri::Wry>::new("nav-guard")
                .on_navigation(|_webview, url| {
                    let allowed = url.scheme() == "tauri"
                        || url.host_str() == Some("tauri.localhost")
                        || (cfg!(debug_assertions) && url.host_str() == Some("localhost"));
                    if !allowed {
                        tracing::warn!(%url, "blocked navigation away from the app");
                    }
                    allowed
                })
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            if let Some(t0) = PROCESS_START.get() {
                SETUP_ENTER_MS.store(
                    t0.elapsed().as_millis() as u64,
                    std::sync::atomic::Ordering::Relaxed,
                );
            }
            let cwd = std::env::current_dir().unwrap_or_else(|_| std::env::temp_dir());
            app.manage(CliPaths(paths_from_args(std::env::args(), &cwd)));
            let handle = app.handle().clone();
            app.manage(WatcherState::new(handle));
            let data_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| std::env::temp_dir());
            app.manage(RecentState::load(data_dir.clone()));
            app.manage(ConfigState::load(data_dir.clone()));
            app.manage(SessionState::load(data_dir));
            if let Some(t0) = PROCESS_START.get() {
                SETUP_DONE_MS.store(
                    t0.elapsed().as_millis() as u64,
                    std::sync::atomic::Ordering::Relaxed,
                );
            }
            tracing::info!("application setup complete");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            app_version,
            bench_ready,
            cli_paths,
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
            search_workspace,
            config_get,
            config_save,
            config_path,
            session_get,
            session_save
        ])
        .run(context)
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

    #[test]
    fn cli_args_keep_only_existing_files() {
        let dir = std::env::temp_dir().join(format!("nsp-cli-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let file = dir.join("doc.md");
        std::fs::write(&file, "x").unwrap();

        let args = vec![
            "nsp.exe".to_string(),
            "--flag".to_string(),
            file.display().to_string(),
            dir.display().to_string(), // directory — dropped
            dir.join("missing.md").display().to_string(), // nonexistent — dropped
        ];
        let paths = paths_from_args(args, &dir);
        assert_eq!(paths.len(), 1);
        assert!(paths[0].ends_with("doc.md"));
    }

    #[test]
    fn cli_args_resolve_relative_paths_against_base() {
        let dir = std::env::temp_dir().join(format!("nsp-cli-rel-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("rel.md"), "x").unwrap();

        let paths = paths_from_args(vec!["nsp.exe".to_string(), "rel.md".to_string()], &dir);
        assert_eq!(paths.len(), 1);
        assert!(paths[0].ends_with("rel.md"));
    }
}
