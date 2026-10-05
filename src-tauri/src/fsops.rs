//! Directory listing and file management for the workspace explorer (docs/07 §5).
//! Deletes go to the OS trash — the app never permanently deletes (docs/07 §2).

use crate::error::{NspError, NspResult};
use serde::Serialize;
use std::fs::{self, OpenOptions};
use std::io::{self, ErrorKind};
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

/// Rejects names that are empty, contain separators or characters invalid on
/// Windows, are `.`/`..`, use a reserved device name (CON, NUL, COM1…), or end
/// with a dot/space (silently stripped by Win32, which would desync the tree).
fn validate_name(name: &str) -> NspResult<()> {
    let trimmed = name.trim();
    if trimmed.is_empty() || trimmed == "." || trimmed == ".." {
        return Err(NspError::invalid_input("Invalid name."));
    }
    if name.contains(['/', '\\', '<', '>', ':', '"', '|', '?', '*'])
        || name.chars().any(|c| (c as u32) < 0x20)
    {
        return Err(NspError::invalid_input(
            "Names can't contain \\ / < > : \" | ? * or control characters.",
        ));
    }
    if name.ends_with('.') || name.ends_with(' ') {
        return Err(NspError::invalid_input(
            "Names can't end with a dot or a space.",
        ));
    }
    let stem = name.split('.').next().unwrap_or(name).to_ascii_uppercase();
    const RESERVED: [&str; 22] = [
        "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
        "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
    ];
    if RESERVED.contains(&stem.as_str()) {
        return Err(NspError::invalid_input(format!(
            "\"{name}\" is a reserved name on Windows."
        )));
    }
    Ok(())
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
    validate_name(name)?;
    let target = dir.join(name);
    ensure_absent(&target)?;
    if is_dir {
        fs::create_dir(&target).map_err(|e| already_exists_or_io(&target, &e))?;
    } else {
        // `create_new` fails if the file appeared since `ensure_absent` — never truncate.
        OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&target)
            .map_err(|e| already_exists_or_io(&target, &e))?;
    }
    to_entry(&target)
}

fn already_exists_or_io(path: &Path, e: &io::Error) -> NspError {
    if e.kind() == ErrorKind::AlreadyExists {
        NspError::with_path(
            "E_INVALID_INPUT",
            "Something with that name already exists.",
            path,
        )
    } else {
        NspError::io(path, e)
    }
}

/// Renames a file or directory in place.
pub fn rename(from: &Path, new_name: &str) -> NspResult<Entry> {
    validate_name(new_name)?;
    let parent = from
        .parent()
        .ok_or_else(|| NspError::invalid_input("Path has no parent directory."))?;
    let target = parent.join(new_name);
    // NTFS is case-insensitive: renaming "notes.md" to "Notes.md" finds *itself* in
    // ensure_absent. Only check for a collision when it's a genuinely different name.
    // (std::fs::rename on Windows replaces an existing target and has no portable
    // "no-replace" mode, so a tiny race remains here; acceptable for interactive use.)
    let same_file = target
        .to_string_lossy()
        .eq_ignore_ascii_case(&from.to_string_lossy());
    if !same_file {
        ensure_absent(&target)?;
    }
    fs::rename(from, &target).map_err(|e| NspError::io(from, &e))?;
    to_entry(&target)
}

/// Moves a file or directory to the OS trash (never a permanent delete).
pub fn trash(path: &Path) -> NspResult<()> {
    trash::delete(path).map_err(|e| NspError::with_path("E_IO", e.to_string(), path))
}

/// Claims a free "<stem> copy[ N].<ext>" sibling by creating it with `create_new`,
/// so a file that appears concurrently can never be overwritten.
fn claim_unique_sibling(path: &Path) -> NspResult<PathBuf> {
    let parent = path.parent().unwrap_or_else(|| Path::new("."));
    let stem = path
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();
    let ext = path
        .extension()
        .map(|s| format!(".{}", s.to_string_lossy()))
        .unwrap_or_default();
    for n in 1u32.. {
        let name = if n == 1 {
            format!("{stem} copy{ext}")
        } else {
            format!("{stem} copy {n}{ext}")
        };
        let candidate = parent.join(name);
        match OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&candidate)
        {
            Ok(_) => return Ok(candidate),
            Err(e) if e.kind() == ErrorKind::AlreadyExists => continue,
            Err(e) => return Err(NspError::io(&candidate, &e)),
        }
    }
    unreachable!("u32 range exhausted")
}

/// Copies a file next to itself with a " copy" suffix.
pub fn duplicate(path: &Path) -> NspResult<Entry> {
    let meta = fs::metadata(path).map_err(|e| NspError::io(path, &e))?;
    if meta.is_dir() {
        return Err(NspError::invalid_input(
            "Duplicating folders isn't supported yet.",
        ));
    }
    // The copy only ever overwrites the empty placeholder this call just claimed.
    let target = claim_unique_sibling(path)?;
    fs::copy(path, &target).map_err(|e| {
        let _ = fs::remove_file(&target);
        NspError::io(path, &e)
    })?;
    to_entry(&target)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::time::{SystemTime, UNIX_EPOCH};

    static TEST_SEQ: AtomicU64 = AtomicU64::new(0);

    fn tmp_dir() -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let seq = TEST_SEQ.fetch_add(1, Ordering::Relaxed);
        let d =
            std::env::temp_dir().join(format!("nsp-ops-{}-{}-{}", std::process::id(), nanos, seq));
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
    fn rejects_windows_invalid_names() {
        let dir = tmp_dir();
        for bad in [
            "a<b.md", "a?.md", "con", "CON.md", "NUL.txt", "note.", "note ", "..", ".",
        ] {
            assert_eq!(
                create(&dir, bad, false).unwrap_err().code,
                "E_INVALID_INPUT",
                "expected rejection for {bad:?}"
            );
        }
        assert_eq!(
            rename(&dir.join("x.md"), "aux.md").unwrap_err().code,
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

    #[test]
    fn create_never_truncates_an_existing_file() {
        let dir = tmp_dir();
        fs::write(dir.join("a.md"), "keep me").unwrap();
        assert!(create(&dir, "a.md", false).is_err());
        assert_eq!(fs::read_to_string(dir.join("a.md")).unwrap(), "keep me");
    }

    #[test]
    fn duplicate_copies_content() {
        let dir = tmp_dir();
        let p = dir.join("doc.md");
        fs::write(&p, "hello").unwrap();
        let e = duplicate(&p).unwrap();
        assert_eq!(fs::read_to_string(&e.path).unwrap(), "hello");
    }

    #[cfg(windows)]
    #[test]
    fn rename_allows_case_only_change() {
        let dir = tmp_dir();
        let p = dir.join("notes.md");
        fs::write(&p, "x").unwrap();
        let e = rename(&p, "Notes.md").unwrap();
        assert_eq!(e.name, "Notes.md");
    }
}
