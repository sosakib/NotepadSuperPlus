import { useEffect, useState } from "react";
import { FolderOpen, FileText } from "lucide-react";
import { EmptyState } from "../components/EmptyState.tsx";
import { Button } from "../components/Button.tsx";
import { recentList } from "../ipc/fs.ts";
import { openFile, openPath } from "../actions/fileActions.ts";
import { useDocumentsStore } from "../state/documents.ts";

const basename = (p: string): string => p.split(/[\\/]/).pop() ?? p;

/**
 * Explorer: recent files for now (the full workspace tree + watcher arrive in
 * Stage 6). Refreshes when the set of open documents changes.
 */
export function ExplorerPanel() {
  const order = useDocumentsStore((s) => s.order);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    void recentList()
      .then((r) => {
        if (!cancelled) setRecent(r);
      })
      .catch(() => {
        /* browser dev — no Tauri */
      });
    return () => {
      cancelled = true;
    };
  }, [order]);

  if (recent.length === 0) {
    return (
      <EmptyState
        icon={<FolderOpen size={28} strokeWidth={1.5} />}
        title="No recent files"
        hint="Open a Markdown file to get started."
      >
        <Button variant="subtle" onClick={() => void openFile()}>
          Open file
        </Button>
      </EmptyState>
    );
  }

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
