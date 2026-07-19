import { Search } from "lucide-react";
import { EmptyState } from "../components/EmptyState.tsx";

/** Placeholder for workspace search (arrives in Stage 7). */
export function SearchPanel() {
  return (
    <EmptyState
      icon={<Search size={28} strokeWidth={1.5} />}
      title="Search"
      hint="Workspace search arrives in Stage 7."
    />
  );
}
