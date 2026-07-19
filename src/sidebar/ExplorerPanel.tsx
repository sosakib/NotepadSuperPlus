import { FolderOpen } from "lucide-react";
import { EmptyState } from "../components/EmptyState.tsx";

/** Placeholder for the file explorer (real tree + watcher arrive in Stages 5-6). */
export function ExplorerPanel() {
  return (
    <EmptyState
      icon={<FolderOpen size={28} strokeWidth={1.5} />}
      title="No folder open"
      hint="File tree and workspace arrive in Stage 6."
    />
  );
}
