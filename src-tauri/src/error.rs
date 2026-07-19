//! Error taxonomy for the core. Every command returns `Result<T, NspError>`; the
//! error serializes to `{ code, message, path? }` for the UI to map to UX
//! (docs/16 §5). No command panics across the IPC boundary (docs/13 §2).

use serde::Serialize;
use std::path::Path;

/// A typed, serializable error carrying a stable machine code.
#[derive(Debug, Clone, Serialize)]
pub struct NspError {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
}

impl NspError {
    pub fn new(code: &str, message: impl Into<String>) -> Self {
        Self {
            code: code.to_string(),
            message: message.into(),
            path: None,
        }
    }

    pub fn with_path(code: &str, message: impl Into<String>, path: &Path) -> Self {
        Self {
            code: code.to_string(),
            message: message.into(),
            path: Some(path.display().to_string()),
        }
    }

    pub fn not_found(path: &Path) -> Self {
        Self::with_path("E_NOT_FOUND", "File not found.", path)
    }
    pub fn access_denied(path: &Path) -> Self {
        Self::with_path("E_ACCESS_DENIED", "Permission denied.", path)
    }
    pub fn binary(path: &Path) -> Self {
        Self::with_path(
            "E_BINARY",
            "This looks like a binary file and can't be opened as text.",
            path,
        )
    }
    pub fn too_large(path: &Path) -> Self {
        Self::with_path("E_TOO_LARGE", "File is too large to open.", path)
    }
    pub fn encoding(path: &Path, message: impl Into<String>) -> Self {
        Self::with_path("E_ENCODING", message, path)
    }
    pub fn io(path: &Path, err: &std::io::Error) -> Self {
        match err.kind() {
            std::io::ErrorKind::NotFound => Self::not_found(path),
            std::io::ErrorKind::PermissionDenied => Self::access_denied(path),
            _ => Self::with_path("E_IO", err.to_string(), path),
        }
    }
    pub fn invalid_input(message: impl Into<String>) -> Self {
        Self::new("E_INVALID_INPUT", message)
    }
}

impl std::fmt::Display for NspError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{}] {}", self.code, self.message)
    }
}

impl std::error::Error for NspError {}

pub type NspResult<T> = Result<T, NspError>;
