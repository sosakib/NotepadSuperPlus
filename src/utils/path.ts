/**
 * Path helpers for display and tree bookkeeping. Paths come from the Rust core
 * already canonicalized, so these only need to split on either separator —
 * Windows and POSIX both appear (the app is Windows-first but runs in a browser
 * dev harness).
 */

const SEPARATOR = /[\\/]/;

/** Final segment of a path. Trailing separators are ignored (`C:\dir\` → `dir`). */
export function basename(path: string): string {
  return path.split(SEPARATOR).filter(Boolean).pop() ?? path;
}

/** Everything before the final segment (`C:\a\b.md` → `C:\a`). */
export function parentDir(path: string): string {
  return path.replace(/[\\/][^\\/]+[\\/]*$/, "");
}

/**
 * True when `path` is `root` or inside it. Separator-aware (so `C:\notes` does not
 * contain `C:\notes-old\x.md`) and case-insensitive, matching NTFS.
 */
export function isInside(path: string, root: string): boolean {
  const p = path.toLowerCase();
  const r = root.replace(/[\\/]+$/, "").toLowerCase();
  return p === r || p.startsWith(`${r}\\`) || p.startsWith(`${r}/`);
}
