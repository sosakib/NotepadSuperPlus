//! Directory listing and file management for the workspace explorer (docs/07 §5).
//! Deletes go to the OS trash — the app never permanently deletes (docs/07 §2).

use crate::error::{NspError, NspResult};
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    /// True for directories that contain at least one entry (drives the expand arrow).
    pub has_children: bool,
    /// Dotfiles, so the UI can hide them by default.
    pub hidden: bool,
}

fn to_entry(path: &Path) -> NspResult<Entry> {
    let meta = fs::metadata(path).map_err(|e| NspError::io(path, &e))?;
    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| path.display().to_string());
    let is_dir = meta.is_dir();
    let has_children = is_dir
        && fs::read_dir(path)
            .ok()
            .and_then(|mut it| it.next())
            .is_some();
    Ok(Entry {
        hidden: name.starts_with('.'),
        name,
        path: path.display().to_string(),
        is_dir,
        has_children,
    })
}

/// Lists one directory level, directories first then files, each case-insensitively sorted.
pub fn list_dir(path: &Path) -> NspResult<Vec<Entry>> {
    let abs = dunce::canonicalize(path).map_err(|e| NspError::io(path, &e))?;
    let mut entries: Vec<Entry> = fs::read_dir(&abs)
        .map_err(|e| NspError::io(&abs, &e))?
        .filter_map(|e| e.ok())
        .filter_map(|e| to_entry(&e.path()).ok())
        .collect();
    entries.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(entries)
}

fn ensure_absent(path: &Path) -> NspResult<()> {
    if path.exists() {
        return Err(NspError::with_path(
            "E_INVALID_INPUT",
            "Something with that name already exists.",
            path,
        ));
    }
    Ok(())
}

/// Creates an empty file or directory inside `dir`.
pub fn create(dir: &Path, name: &str, is_dir: bool) -> NspResult<Entry> {
    if name.trim().is_empty() || name.contains(['/', '\\']) {
        return Err(NspError::invalid_input("Invalid name."));
    }
    let target = dir.join(name);
    ensure_absent(&target)?;
    if is_dir {
        fs::create_dir(&target).map_err(|e| NspError::io(&target, &e))?;
    } else {
        fs::File::create(&target).map_err(|e| NspError::io(&target, &e))?;
    }
    to_entry(&target)
}

/// Renames a file or directory in place.
pub fn rename(from: &Path, new_name: &str) -> NspResult<Entry> {
    if new_name.trim().is_empty() || new_name.contains(['/', '\\']) {
        return Err(NspError::invalid_input("Invalid name."));
    }
    let parent = from
        .parent()
        .ok_or_else(|| NspError::invalid_input("Path has no parent directory."))?;
    let target = parent.join(new_name);
    if target != from {
        ensure_absent(&target)?;
    }
    fs::rename(from, &target).map_err(|e| NspError::io(from, &e))?;
    to_entry(&target)
}

/// Moves a file or directory to the OS trash (never a permanent delete).
pub fn trash(path: &Path) -> NspResult<()> {
    trash::delete(path).map_err(|e| NspError::with_path("E_IO", e.to_string(), path))
}

fn unique_sibling(path: &Path) -> PathBuf {
    let parent = path.parent().unwrap_or_else(|| Path::new("."));
    let stem = path
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();
    let ext = path
        .extension()
        .map(|s| format!(".{}", s.to_string_lossy()))
        .unwrap_or_default();
    let mut candidate = parent.join(format!("{stem} copy{ext}"));
    let mut n = 2;
    while candidate.exists() {
        candidate = parent.join(format!("{stem} copy {n}{ext}"));
        n += 1;
    }
    candidate
}

/// Copies a file next to itself with a " copy" suffix.
pub fn duplicate(path: &Path) -> NspResult<Entry> {
    let meta = fs::metadata(path).map_err(|e| NspError::io(path, &e))?;
    if meta.is_dir() {
        return Err(NspError::invalid_input(
            "Duplicating folders isn't supported yet.",
        ));
    }
    let target = unique_sibling(path);
    fs::copy(path, &target).map_err(|e| NspError::io(path, &e))?;
    to_entry(&target)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn tmp_dir() -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let d = std::env::temp_dir().join(format!("nsp-ops-{}-{}", std::process::id(), nanos));
        fs::create_dir_all(&d).unwrap();
        d
    }

    #[test]
    fn lists_directories_before_files() {
        let dir = tmp_dir();
        fs::write(dir.join("b.md"), "x").unwrap();
        fs::create_dir(dir.join("a-folder")).unwrap();
        let entries = list_dir(&dir).unwrap();
        assert!(entries[0].is_dir);
        assert_eq!(entries[0].name, "a-folder");
        assert_eq!(entries[1].name, "b.md");
    }

    #[test]
    fn creates_files_and_rejects_duplicates() {
        let dir = tmp_dir();
        let entry = create(&dir, "note.md", false).unwrap();
        assert_eq!(entry.name, "note.md");
        assert!(!entry.is_dir);
        assert_eq!(
            create(&dir, "note.md", false).unwrap_err().code,
            "E_INVALID_INPUT"
        );
    }

    #[test]
    fn rejects_path_separators_in_names() {
        let dir = tmp_dir();
        assert_eq!(
            create(&dir, "a/b.md", false).unwrap_err().code,
            "E_INVALID_INPUT"
        );
    }

    #[test]
    fn renames_a_file() {
        let dir = tmp_dir();
        let p = dir.join("old.md");
        fs::write(&p, "x").unwrap();
        let entry = rename(&p, "new.md").unwrap();
        assert_eq!(entry.name, "new.md");
        assert!(!p.exists());
    }

    #[test]
    fn duplicates_with_copy_suffix() {
        let dir = tmp_dir();
        let p = dir.join("doc.md");
        fs::write(&p, "x").unwrap();
        let first = duplicate(&p).unwrap();
        assert_eq!(first.name, "doc copy.md");
        let second = duplicate(&p).unwrap();
        assert_eq!(second.name, "doc copy 2.md");
    }
}
