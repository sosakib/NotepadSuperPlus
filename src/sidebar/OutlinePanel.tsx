import { ListTree } from "lucide-react";
import { EmptyState } from "../components/EmptyState.tsx";

/** Placeholder for the heading outline / Structure View (arrives in Stage 5). */
export function OutlinePanel() {
  return (
    <EmptyState
      icon={<ListTree size={28} strokeWidth={1.5} />}
      title="No outline"
      hint="Document headings will appear here."
    />
  );
}
