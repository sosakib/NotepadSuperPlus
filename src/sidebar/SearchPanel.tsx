import { useState, type FormEvent } from "react";
import { Search, CaseSensitive, WholeWord, Regex, Loader2 } from "lucide-react";
import { EmptyState } from "../components/EmptyState.tsx";
import { useWorkspaceStore } from "../state/workspace.ts";
import { searchWorkspace, type SearchMatch, type SearchOptions } from "../ipc/search.ts";
import { openPath } from "../actions/fileActions.ts";

const basename = (p: string): string => p.split(/[\\/]/).pop() ?? p;

/** Groups matches by file, preserving the order they were found in. */
function groupByFile(matches: SearchMatch[]): [string, SearchMatch[]][] {
  const groups = new Map<string, SearchMatch[]>();
  for (const m of matches) {
    const list = groups.get(m.path);
    if (list) list.push(m);
    else groups.set(m.path, [m]);
  }
  return [...groups.entries()];
}

/** Workspace text search (docs/01 §7). Requires an open folder. */
export function SearchPanel() {
  const root = useWorkspaceStore((s) => s.root);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<SearchOptions>({
    regex: false,
    caseSensitive: false,
    wholeWord: false,
    respectGitignore: true,
  });
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!root) {
    return (
      <EmptyState
        icon={<Search size={28} strokeWidth={1.5} />}
        title="No folder open"
        hint="Open a folder to search across its files."
      />
    );
  }

  const run = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await searchWorkspace(root, query, options);
      setMatches(res.matches);
      setStatus(
        res.matches.length === 0
          ? `No results in ${res.filesSearched} files`
          : `${res.matches.length}${res.truncated ? "+" : ""} results in ${res.filesSearched} files`,
      );
    } catch (err) {
      const e2 = err as { message?: string };
      setMatches([]);
      setStatus(e2?.message ?? "Search failed.");
    } finally {
      setBusy(false);
    }
  };

  const toggle = (key: keyof SearchOptions): void => setOptions((o) => ({ ...o, [key]: !o[key] }));

  const groups = groupByFile(matches);

  return (
    <div className="search-panel">
      <form onSubmit={(e) => void run(e)}>
        <input
          className="search-panel__input"
          placeholder="Search workspace…"
          aria-label="Search workspace"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="search-panel__options">
          <button
            type="button"
            aria-label="Match case"
            aria-pressed={options.caseSensitive}
            className={options.caseSensitive ? "is-on" : ""}
            onClick={() => toggle("caseSensitive")}
          >
            <CaseSensitive size={14} />
          </button>
          <button
            type="button"
            aria-label="Whole word"
            aria-pressed={options.wholeWord}
            className={options.wholeWord ? "is-on" : ""}
            onClick={() => toggle("wholeWord")}
          >
            <WholeWord size={14} />
          </button>
          <button
            type="button"
            aria-label="Use regular expression"
            aria-pressed={options.regex}
            className={options.regex ? "is-on" : ""}
            onClick={() => toggle("regex")}
          >
            <Regex size={14} />
          </button>
          <button type="submit" className="search-panel__go" disabled={busy}>
            {busy ? <Loader2 size={14} className="spin" /> : "Search"}
          </button>
        </div>
      </form>

      {status && <p className="search-panel__status">{status}</p>}

      <ul className="search-results">
        {groups.map(([path, hits]) => (
          <li key={path}>
            <div className="search-results__file" title={path}>
              {basename(path)} <span className="search-results__count">{hits.length}</span>
            </div>
            <ul>
              {hits.map((m, i) => (
                <li key={`${m.line}-${m.column}-${i}`}>
                  <button
                    type="button"
                    className="search-results__hit"
                    onClick={() => void openPath(m.path, m.line)}
                  >
                    <span className="search-results__line">{m.line}</span>
                    <span className="search-results__preview">{m.preview}</span>
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
