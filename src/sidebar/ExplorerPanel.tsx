import { useState } from "react";
import { FolderOpen, FileText, FilePlus, FolderPlus, X } from "lucide-react";
import { EmptyState } from "../components/EmptyState.tsx";
import { Button } from "../components/Button.tsx";
import { openFile, openPath } from "../actions/fileActions.ts";
import { useRecentFiles } from "../actions/useRecentFiles.ts";
import { openFolder, createEntry, refreshDir } from "../actions/workspaceActions.ts";
import { useWorkspaceStore } from "../state/workspace.ts";
import { FileTree } from "./FileTree.tsx";

const basename = (p: string): string => p.split(/[\\/]/).pop() ?? p;

function RecentFiles() {
  const recent = useRecentFiles();
  if (recent.length === 0) return null;
  return (
    <div className="recent">
      <div className="recent__header">Recent</div>
      <ul className="recent__list">
        {recent.map((path) => (
          <li key={path}>
            <button
              type="button"
              className="recent__item"
              title={path}
              onClick={() => void openPath(path)}
            >
              <FileText size={14} />
              <span className="recent__name">{basename(path)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Explorer: the workspace tree when a folder is open, otherwise recent files. */
export function ExplorerPanel() {
  const root = useWorkspaceStore((s) => s.root);
  const rootName = useWorkspaceStore((s) => s.rootName);
  const closeWorkspace = useWorkspaceStore((s) => s.closeWorkspace);
  const [creating, setCreating] = useState<{ isDir: boolean } | null>(null);
  const [draft, setDraft] = useState("");

  if (!root) {
    return (
      <>
        <EmptyState
          icon={<FolderOpen size={28} strokeWidth={1.5} />}
          title="No folder open"
          hint="Open a folder to browse its Markdown files."
        >
          <div className="empty-state__buttons">
            <Button onClick={() => void openFolder()}>Open folder</Button>
            <Button variant="subtle" onClick={() => void openFile()}>
              Open file
            </Button>
          </div>
        </EmptyState>
        <RecentFiles />
      </>
    );
  }

  const submitCreate = (): void => {
    const name = draft.trim();
    const isDir = creating?.isDir ?? false;
    setCreating(null);
    if (name) void createEntry(root, name, isDir).then(() => refreshDir(root));
  };

  return (
    <div className="workspace">
      <div className="workspace__header">
        <span className="workspace__name" title={root}>
          {rootName}
        </span>
        <span className="workspace__actions">
          <button
            type="button"
            aria-label="New file"
            onClick={() => {
              setDraft("");
              setCreating({ isDir: false });
            }}
          >
            <FilePlus size={14} />
          </button>
          <button
            type="button"
            aria-label="New folder"
            onClick={() => {
              setDraft("");
              setCreating({ isDir: true });
            }}
          >
            <FolderPlus size={14} />
          </button>
          <button type="button" aria-label="Close folder" onClick={closeWorkspace}>
            <X size={14} />
          </button>
        </span>
      </div>
      {creating && (
        <input
          className="tree__input"
          autoFocus
          placeholder={creating.isDir ? "Folder name" : "File name"}
          aria-label={creating.isDir ? "New folder name" : "New file name"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitCreate();
            if (e.key === "Escape") setCreating(null);
          }}
          onBlur={() => setCreating(null)}
        />
      )}
      <FileTree />
    </div>
  );
}
