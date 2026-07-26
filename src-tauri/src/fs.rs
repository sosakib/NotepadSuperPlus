//! Filesystem read/write with encoding + line-ending detection and atomic saves
//! (docs/07 §2). Pure logic — no Tauri types — so it is unit-testable.

use crate::error::{NspError, NspResult};
use serde::Serialize;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::UNIX_EPOCH;

/// Makes each atomic-write temp file unique, so concurrent saves into the same
/// directory can never clobber one another's temp file.
static WRITE_SEQ: AtomicU64 = AtomicU64::new(0);

/// Largest file we will open as text (docs/07 §7).
const MAX_BYTES: u64 = 512 * 1024 * 1024;
const BINARY_SNIFF: usize = 8192;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileContent {
    /// Canonical absolute path (matches watcher event paths).
    pub path: String,
    /// Text normalized to LF line endings (the editor works in LF).
    pub content: String,
    /// Detected encoding label, echoed back on save.
    pub encoding: String,
    /// "lf" or "crlf".
    pub eol: String,
    pub readonly: bool,
    pub mtime_ms: u64,
}

fn mtime_ms(meta: &fs::Metadata) -> u64 {
    meta.modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// Canonicalizes an existing path to a clean absolute form (no `\\?\` on Windows).
pub fn canonicalize_existing(path: &Path) -> NspResult<PathBuf> {
    dunce::canonicalize(path).map_err(|e| NspError::io(path, &e))
}

/// Resolves the absolute path for a (possibly not-yet-existing) write target.
pub fn canonicalize_for_write(path: &Path) -> NspResult<PathBuf> {
    if path.exists() {
        return canonicalize_existing(path);
    }
    let parent = path
        .parent()
        .ok_or_else(|| NspError::invalid_input("Path has no parent directory."))?;
    let name = path
        .file_name()
        .ok_or_else(|| NspError::invalid_input("Path has no file name."))?;
    let parent = dunce::canonicalize(parent).map_err(|e| NspError::io(parent, &e))?;
    Ok(parent.join(name))
}

/// Detects line endings from *decoded text*, not raw bytes.
///
/// A byte-level scan is wrong for UTF-16: there, CRLF is `0D 00 0A 00`, so the bytes
/// `0D 0A` are never adjacent and every UTF-16 file would be reported as LF — then
/// saved back with its line endings silently converted.
fn detect_eol(text: &str) -> &'static str {
    if text.contains("\r\n") {
        "crlf"
    } else {
        "lf"
    }
}

/// Decodes bytes to `(text, encoding-label)` using BOM sniffing, then strict UTF-8,
/// then a charset guess (docs/07 §2).
fn decode(path: &Path, bytes: &[u8]) -> NspResult<(String, String)> {
    if bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
        let (text, _, _) = encoding_rs::UTF_8.decode(&bytes[3..]);
        return Ok((text.into_owned(), "utf-8-bom".into()));
    }
    if bytes.starts_with(&[0xFF, 0xFE]) {
        let (text, _, _) = encoding_rs::UTF_16LE.decode(&bytes[2..]);
        return Ok((text.into_owned(), "utf-16le".into()));
    }
    if bytes.starts_with(&[0xFE, 0xFF]) {
        let (text, _, _) = encoding_rs::UTF_16BE.decode(&bytes[2..]);
        return Ok((text.into_owned(), "utf-16be".into()));
    }
    // Strict UTF-8 first (the overwhelmingly common case).
    if let Ok(text) = std::str::from_utf8(bytes) {
        return Ok((text.to_string(), "utf-8".into()));
    }
    // Fall back to a charset guess.
    let mut detector = chardetng::EncodingDetector::new();
    detector.feed(bytes, true);
    let encoding = detector.guess(None, true);
    let (text, _, had_errors) = encoding.decode(bytes);
    if had_errors {
        return Err(NspError::encoding(
            path,
            "Could not decode the file's text; it may be corrupt.",
        ));
    }
    Ok((text.into_owned(), encoding.name().to_lowercase()))
}

/// Reads a file as text (docs/07 §2). Rejects binary and oversized files.
pub fn read_file(path: &Path) -> NspResult<FileContent> {
    let abs = canonicalize_existing(path)?;
    let meta = fs::metadata(&abs).map_err(|e| NspError::io(&abs, &e))?;
    if !meta.is_file() {
        return Err(NspError::invalid_input("Not a file."));
    }
    if meta.len() > MAX_BYTES {
        return Err(NspError::too_large(&abs));
    }
    let bytes = fs::read(&abs).map_err(|e| NspError::io(&abs, &e))?;

    // UTF-16 encodes ASCII as `XX 00`, so a UTF-16 text file is full of NUL bytes by
    // construction. Running the binary sniff on one rejected *every* UTF-16 document —
    // which made the UTF-16 branches in `decode`/`encode` unreachable and the
    // "UTF-8 / UTF-16 / BOM detected and preserved" claim false. A BOM is a strong
    // enough signal to skip the sniff.
    let utf16_bom = bytes.starts_with(&[0xFF, 0xFE]) || bytes.starts_with(&[0xFE, 0xFF]);
    if !utf16_bom {
        let sniff = &bytes[..bytes.len().min(BINARY_SNIFF)];
        if sniff.contains(&0) {
            return Err(NspError::binary(&abs));
        }
    }

    let (raw, encoding) = decode(&abs, &bytes)?;
    let eol = detect_eol(&raw).to_string();
    // Normalize to LF for the editor; `eol` remembers the original for save.
    let content = raw.replace("\r\n", "\n");

    Ok(FileContent {
        path: abs.display().to_string(),
        content,
        encoding,
        eol,
        readonly: meta.permissions().readonly(),
        mtime_ms: mtime_ms(&meta),
    })
}

fn encode(text: &str, encoding: &str) -> NspResult<Vec<u8>> {
    match encoding {
        "utf-8" => Ok(text.as_bytes().to_vec()),
        "utf-8-bom" => {
            let mut out = vec![0xEF, 0xBB, 0xBF];
            out.extend_from_slice(text.as_bytes());
            Ok(out)
        }
        "utf-16le" => {
            let mut out = vec![0xFF, 0xFE];
            for u in text.encode_utf16() {
                out.extend_from_slice(&u.to_le_bytes());
            }
            Ok(out)
        }
        "utf-16be" => {
            let mut out = vec![0xFE, 0xFF];
            for u in text.encode_utf16() {
                out.extend_from_slice(&u.to_be_bytes());
            }
            Ok(out)
        }
        other => {
            let enc = encoding_rs::Encoding::for_label(other.as_bytes())
                .ok_or_else(|| NspError::invalid_input(format!("Unknown encoding: {other}")))?;
            let (bytes, _, _) = enc.encode(text);
            Ok(bytes.into_owned())
        }
    }
}

/// Writes text atomically: temp file in the same directory, fsync, then rename over
/// the target (docs/07 §2). `content` is LF; `eol` and `encoding` are re-applied.
/// Returns the new modification time (ms).
pub fn write_file(path: &Path, content: &str, encoding: &str, eol: &str) -> NspResult<u64> {
    let abs = canonicalize_for_write(path)?;
    let with_eol = if eol == "crlf" {
        content.replace('\n', "\r\n")
    } else {
        content.to_string()
    };
    let bytes = encode(&with_eol, encoding)?;

    let dir = abs
        .parent()
        .ok_or_else(|| NspError::invalid_input("Path has no parent directory."))?;
    let tmp = dir.join(format!(
        ".nsp-tmp-{}-{}",
        std::process::id(),
        WRITE_SEQ.fetch_add(1, Ordering::Relaxed)
    ));

    // Scope the file handle so it is flushed/closed before the rename.
    {
        let mut file = fs::File::create(&tmp).map_err(|e| NspError::io(&tmp, &e))?;
        file.write_all(&bytes).map_err(|e| NspError::io(&tmp, &e))?;
        file.sync_all().map_err(|e| NspError::io(&tmp, &e))?;
    }
    fs::rename(&tmp, &abs).map_err(|e| {
        let _ = fs::remove_file(&tmp);
        NspError::io(&abs, &e)
    })?;

    let meta = fs::metadata(&abs).map_err(|e| NspError::io(&abs, &e))?;
    Ok(mtime_ms(&meta))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    static TEST_SEQ: AtomicU64 = AtomicU64::new(0);

    /// Unique per call — the system clock alone is too coarse on Windows, so
    /// parallel tests could otherwise share a directory.
    fn tmp_dir() -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let seq = TEST_SEQ.fetch_add(1, Ordering::Relaxed);
        let d =
            std::env::temp_dir().join(format!("nsp-test-{}-{}-{}", std::process::id(), nanos, seq));
        fs::create_dir_all(&d).unwrap();
        d
    }

    #[test]
    fn roundtrips_utf8_lf() {
        let dir = tmp_dir();
        let p = dir.join("a.md");
        fs::write(&p, "# Hi\nline\n").unwrap();
        let fc = read_file(&p).unwrap();
        assert_eq!(fc.content, "# Hi\nline\n");
        assert_eq!(fc.encoding, "utf-8");
        assert_eq!(fc.eol, "lf");
        write_file(&p, &fc.content, &fc.encoding, &fc.eol).unwrap();
        assert_eq!(fs::read_to_string(&p).unwrap(), "# Hi\nline\n");
    }

    #[test]
    fn detects_and_preserves_crlf() {
        let dir = tmp_dir();
        let p = dir.join("crlf.md");
        fs::write(&p, "a\r\nb\r\n").unwrap();
        let fc = read_file(&p).unwrap();
        assert_eq!(fc.eol, "crlf");
        assert_eq!(fc.content, "a\nb\n"); // normalized to LF for the editor
        write_file(&p, &fc.content, &fc.encoding, &fc.eol).unwrap();
        assert_eq!(fs::read(&p).unwrap(), b"a\r\nb\r\n"); // CRLF restored on save
    }

    #[test]
    fn detects_utf8_bom() {
        let dir = tmp_dir();
        let p = dir.join("bom.md");
        let mut f = fs::File::create(&p).unwrap();
        f.write_all(&[0xEF, 0xBB, 0xBF]).unwrap();
        f.write_all("héllo".as_bytes()).unwrap();
        let fc = read_file(&p).unwrap();
        assert_eq!(fc.encoding, "utf-8-bom");
        assert_eq!(fc.content, "héllo");
    }

    #[test]
    fn rejects_binary() {
        let dir = tmp_dir();
        let p = dir.join("bin");
        fs::write(&p, [0u8, 1, 2, 3, 0]).unwrap();
        let err = read_file(&p).unwrap_err();
        assert_eq!(err.code, "E_BINARY");
    }

    /// Regression: temp files were named per-process, so simultaneous saves into
    /// one directory raced and clobbered each other's temp file.
    #[test]
    fn concurrent_writes_in_one_directory_dont_clobber() {
        let dir = tmp_dir();
        let handles: Vec<_> = (0..8)
            .map(|i| {
                let dir = dir.clone();
                std::thread::spawn(move || {
                    let p = dir.join(format!("f{i}.md"));
                    write_file(&p, &format!("content {i}\n"), "utf-8", "lf").unwrap();
                })
            })
            .collect();
        for h in handles {
            h.join().unwrap();
        }
        for i in 0..8 {
            assert_eq!(
                fs::read_to_string(dir.join(format!("f{i}.md"))).unwrap(),
                format!("content {i}\n")
            );
        }
    }

    #[test]
    fn atomic_write_leaves_no_temp() {
        let dir = tmp_dir();
        let p = dir.join("out.md");
        write_file(&p, "data\n", "utf-8", "lf").unwrap();
        let temps: Vec<_> = fs::read_dir(&dir)
            .unwrap()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_name().to_string_lossy().starts_with(".nsp-tmp-"))
            .collect();
        assert!(temps.is_empty(), "temp file left behind");
    }
}
