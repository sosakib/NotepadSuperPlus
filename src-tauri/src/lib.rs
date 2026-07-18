//! Notepad Super Plus — Rust core.
//!
//! Stage 1 wires the process, tracing, and the IPC bridge with a single trivial
//! command (`app_version`). The real command catalog — filesystem, watcher, search,
//! config, session — arrives in later stages (see docs/16_API_Design.md).

#![forbid(unsafe_code)]
#![warn(missing_docs)]

use tracing_subscriber::EnvFilter;

/// Returns the application version (compile-time `CARGO_PKG_VERSION`).
///
/// Also serves as the Stage 1 liveness check for the webview <-> core IPC bridge.
#[tauri::command]
fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Builds and runs the Tauri application.
pub fn run() {
    init_tracing();
    tracing::info!(
        version = env!("CARGO_PKG_VERSION"),
        "Notepad Super Plus starting"
    );

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![app_version])
        .setup(|_app| {
            tracing::info!("application setup complete");
            Ok(())
        })
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
