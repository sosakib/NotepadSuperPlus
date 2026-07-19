import { useState, type KeyboardEvent } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FileText,
  FilePlus,
  FolderPlus,
  Pencil,
  Copy,
  Trash2,
} from "lucide-react";
import { useWorkspaceStore } from "../state/workspace.ts";
import type { Entry } from "../ipc/workspace.ts";
import { openPath } from "../actions/fileActions.ts";
import {
  toggleDir,
  createEntry,
  renameEntry,
  deleteEntry,
  duplicateEntry,
} from "../actions/workspaceActions.ts";

interface Row {
  entry: Entry;
  depth: number;
}

/** Flattens the expanded tree into rows for rendering. */
function flatten(
  dir: string,
  children: Record<string, Entry[]>,
  expanded: Record<string, boolean>,
  showHidden: boolean,
  depth: number,
): Row[] {
  const entries = children[dir] ?? [];
  const rows: Row[] = [];
  for (const entry of entries) {
    if (entry.hidden && !showHidden) continue;
    rows.push({ entry, depth });
    if (entry.isDir && expanded[entry.path]) {
      rows.push(...flatten(entry.path, children, expanded, showHidden, depth + 1));
    }
  }
  return rows;
}

/** Workspace file tree: lazy expansion, open on click, and inline file management. */
export function FileTree() {
  const root = useWorkspaceStore((s) => s.root);
  const children = useWorkspaceStore((s) => s.children);
  const expanded = useWorkspaceStore((s) => s.expanded);
  const showHidden = useWorkspaceStore((s) => s.showHidden);

  const [renaming, setRenaming] = useState<string | null>(null);
  const [creating, setCreating] = useState<{ dir: string; isDir: boolean } | null>(null);
  const [draft, setDraft] = useState("");

  if (!root) return null;
  const rows = flatten(root, children, expanded, showHidden, 0);

  const submitRename = (path: string): void => {
    const name = draft.trim();
    setRenaming(null);
    if (name) void renameEntry(path, name);
  };

  const submitCreate = (): void => {
    if (!creating) return;
    const name = draft.trim();
    const { dir, isDir } = creating;
    setCreating(null);
    if (name) void createEntry(dir, name, isDir);
  };

  const onDraftKey = (e: KeyboardEvent<HTMLInputElement>, commit: () => void): void => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setRenaming(null);
      setCreating(null);
    }
  };

  const startCreate = (dir: string, isDir: boolean): void => {
    setDraft("");
    setCreating({ dir, isDir });
  };

  return (
    <ul className="tree" role="tree" aria-label="Workspace files">
      {rows.map(({ entry, depth }) => {
        const isRenaming = renaming === entry.path;
        return (
          <li key={entry.path} role="treeitem" aria-level={depth + 1}>
            <div className="tree__row" style={{ paddingLeft: `${depth * 12 + 4}px` }}>
              {isRenaming ? (
                <input
                  className="tree__input"
                  autoFocus
                  value={draft}
                  aria-label={`Rename ${entry.name}`}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => onDraftKey(e, () => submitRename(entry.path))}
                  onBlur={() => setRenaming(null)}
                />
              ) : (
                <>
                  <button
                    type="button"
                    className="tree__label"
                    onClick={() =>
                      entry.isDir ? void toggleDir(entry.path) : void openPath(entry.path)
                    }
                    title={entry.path}
                  >
                    {entry.isDir ? (
                      expanded[entry.path] ? (
                        <ChevronDown size={14} className="tree__chevron" />
                      ) : (
                        <ChevronRight size={14} className="tree__chevron" />
                      )
                    ) : (
                      <span className="tree__chevron" />
                    )}
                    {entry.isDir ? <Folder size={14} /> : <FileText size={14} />}
                    <span className="tree__name">{entry.name}</span>
                  </button>
                  <span className="tree__actions">
                    {entry.isDir && (
                      <>
                        <button
                          type="button"
                          aria-label={`New file in ${entry.name}`}
                          onClick={() => startCreate(entry.path, false)}
                        >
                          <FilePlus size={13} />
                        </button>
                        <button
                          type="button"
                          aria-label={`New folder in ${entry.name}`}
                          onClick={() => startCreate(entry.path, true)}
                        >
                          <FolderPlus size={13} />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      aria-label={`Rename ${entry.name}`}
                      onClick={() => {
                        setDraft(entry.name);
                        setRenaming(entry.path);
                      }}
                    >
                      <Pencil size={13} />
                    </button>
                    {!entry.isDir && (
                      <button
                        type="button"
                        aria-label={`Duplicate ${entry.name}`}
                        onClick={() => void duplicateEntry(entry.path)}
                      >
                        <Copy size={13} />
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={`Delete ${entry.name}`}
                      onClick={() => void deleteEntry(entry.path)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                </>
              )}
            </div>
            {creating?.dir === entry.path && (
              <div className="tree__row" style={{ paddingLeft: `${(depth + 1) * 12 + 4}px` }}>
                <input
                  className="tree__input"
                  autoFocus
                  placeholder={creating.isDir ? "Folder name" : "File name"}
                  aria-label={creating.isDir ? "New folder name" : "New file name"}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => onDraftKey(e, submitCreate)}
                  onBlur={() => setCreating(null)}
                />
              </div>
            )}
          </li>
        );
      })}
      {creating?.dir === root && (
        <li>
          <div className="tree__row">
            <input
              className="tree__input"
              autoFocus
              placeholder={creating.isDir ? "Folder name" : "File name"}
              aria-label={creating.isDir ? "New folder name" : "New file name"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => onDraftKey(e, submitCreate)}
              onBlur={() => setCreating(null)}
            />
          </div>
        </li>
      )}
    </ul>
  );
}
