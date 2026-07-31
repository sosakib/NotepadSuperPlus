//! Workspace text search (docs/06 §6). Uses the `ignore` walker so `.gitignore`
//! is respected, and the `regex` crate whose linear-time matching makes
//! pathological user patterns safe (docs/08 §1, T7).

use crate::error::{NspError, NspResult};
use ignore::WalkBuilder;
use regex::{Regex, RegexBuilder};
use serde::{Deserialize, Serialize};
use std::path::Path;

/// Hard caps so a huge workspace can't hang the UI or exhaust memory.
const MAX_MATCHES: usize = 2000;
const MAX_FILE_BYTES: u64 = 4 * 1024 * 1024;
const MAX_PREVIEW: usize = 200;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchQuery {
    pub root: String,
    pub query: String,
    #[serde(default)]
    pub regex: bool,
    #[serde(default)]
    pub case_sensitive: bool,
    #[serde(default)]
    pub whole_word: bool,
    #[serde(default = "default_true")]
    pub respect_gitignore: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchMatch {
    pub path: String,
    /// 1-based line number.
    pub line: usize,
    /// 1-based column of the match start.
    pub column: usize,
    pub preview: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResults {
    pub matches: Vec<SearchMatch>,
    pub files_searched: usize,
    /// True when the result cap was hit and results are partial.
    pub truncated: bool,
}

fn build_regex(q: &SearchQuery) -> NspResult<Regex> {
    if q.query.is_empty() {
        return Err(NspError::invalid_input("Search query is empty."));
    }
    let base = if q.regex {
        q.query.clone()
    } else {
        regex::escape(&q.query)
    };
    let pattern = if q.whole_word {
        format!(r"\b(?:{base})\b")
    } else {
        base
    };
    RegexBuilder::new(&pattern)
        .case_insensitive(!q.case_sensitive)
        .build()
        .map_err(|e| NspError::invalid_input(format!("Invalid search pattern: {e}")))
}

/// Searches every text file under `root`, returning capped, ordered matches.
pub fn search_workspace(q: &SearchQuery) -> NspResult<SearchResults> {
    let re = build_regex(q)?;
    let root = dunce::canonicalize(Path::new(&q.root))
        .map_err(|e| NspError::io(Path::new(&q.root), &e))?;

    let mut matches = Vec::new();
    let mut files_searched = 0usize;
    let mut truncated = false;

    let walker = WalkBuilder::new(&root)
        .git_ignore(q.respect_gitignore)
        .git_global(q.respect_gitignore)
        .git_exclude(q.respect_gitignore)
        // The `ignore` crate defaults to `require_git(true)`, which silently disables
        // every gitignore rule outside a git repository. A workspace is just a folder
        // here — plenty of them have a `.gitignore` and no `.git` — so the toggle did
        // nothing for those users while the README promised it worked.
        .require_git(false)
        .hidden(true)
        .build();

    for entry in walker.flatten() {
        if truncated {
            break;
        }
        if !entry.file_type().is_some_and(|t| t.is_file()) {
            continue;
        }
        let path = entry.path();
        if entry
            .metadata()
            .map(|m| m.len() > MAX_FILE_BYTES)
            .unwrap_or(true)
        {
            continue;
        }
        // Only text files; invalid UTF-8 is skipped rather than lossily matched.
        let Ok(text) = std::fs::read_to_string(path) else {
            continue;
        };
        files_searched += 1;

        for (idx, line) in text.lines().enumerate() {
            for m in re.find_iter(line) {
                if matches.len() >= MAX_MATCHES {
                    truncated = true;
                    break;
                }
                let preview = if line.len() > MAX_PREVIEW {
                    line.chars().take(MAX_PREVIEW).collect::<String>()
                } else {
                    line.to_string()
                };
                matches.push(SearchMatch {
                    path: path.display().to_string(),
                    line: idx + 1,
                    column: line[..m.start()].chars().count() + 1,
                    preview: preview.trim_end().to_string(),
                });
            }
            if truncated {
                break;
            }
        }
    }

    Ok(SearchResults {
        matches,
        files_searched,
        truncated,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::time::{SystemTime, UNIX_EPOCH};

    static TEST_SEQ: AtomicU64 = AtomicU64::new(0);

    fn workspace() -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let seq = TEST_SEQ.fetch_add(1, Ordering::Relaxed);
        let d = std::env::temp_dir().join(format!(
            "nsp-search-{}-{}-{}",
            std::process::id(),
            nanos,
            seq
        ));
        fs::create_dir_all(&d).unwrap();
        fs::write(d.join("a.md"), "Hello world\nsecond line\nhello again\n").unwrap();
        fs::write(d.join("b.md"), "nothing here\n").unwrap();
        d
    }

    fn query(root: &Path, q: &str) -> SearchQuery {
        SearchQuery {
            root: root.display().to_string(),
            query: q.to_string(),
            regex: false,
            case_sensitive: false,
            whole_word: false,
            respect_gitignore: true,
        }
    }

    #[test]
    fn finds_case_insensitive_matches_with_positions() {
        let ws = workspace();
        let res = search_workspace(&query(&ws, "hello")).unwrap();
        assert_eq!(res.matches.len(), 2);
        assert_eq!(res.matches[0].line, 1);
        assert_eq!(res.matches[0].column, 1);
        assert_eq!(res.matches[1].line, 3);
    }

    #[test]
    fn respects_case_sensitivity() {
        let ws = workspace();
        let mut q = query(&ws, "Hello");
        q.case_sensitive = true;
        assert_eq!(search_workspace(&q).unwrap().matches.len(), 1);
    }

    #[test]
    fn whole_word_excludes_substrings() {
        let ws = workspace();
        let mut q = query(&ws, "second");
        q.whole_word = true;
        assert_eq!(search_workspace(&q).unwrap().matches.len(), 1);

        let mut partial = query(&ws, "econd");
        partial.whole_word = true;
        assert_eq!(search_workspace(&partial).unwrap().matches.len(), 0);
    }

    #[test]
    fn supports_regex_mode() {
        let ws = workspace();
        let mut q = query(&ws, r"h\w+o");
        q.regex = true;
        assert_eq!(search_workspace(&q).unwrap().matches.len(), 2);
    }

    #[test]
    fn rejects_an_invalid_pattern() {
        let ws = workspace();
        let mut q = query(&ws, "([unclosed");
        q.regex = true;
        assert_eq!(search_workspace(&q).unwrap_err().code, "E_INVALID_INPUT");
    }
}
