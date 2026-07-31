import { useEffect, useState } from "react";
import { recentList } from "../ipc/fs.ts";
import { useDocumentsStore } from "../state/documents.ts";

/**
 * The persisted recent-files list, refreshed whenever the set of open documents
 * changes (opening/saving a file updates the list on the Rust side). Returns an
 * empty list in the browser dev harness where no Tauri runtime exists.
 */
export function useRecentFiles(limit?: number): string[] {
  const order = useDocumentsStore((s) => s.order);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    void recentList()
      .then((r) => {
        if (!cancelled) setRecent(limit !== undefined ? r.slice(0, limit) : r);
      })
      .catch(() => {
        /* browser dev — no Tauri */
      });
    return () => {
      cancelled = true;
    };
  }, [order, limit]);

  return recent;
}
