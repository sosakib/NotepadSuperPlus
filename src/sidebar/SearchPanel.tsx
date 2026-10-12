import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import { Search, CaseSensitive, WholeWord, Regex, Loader2 } from "lucide-react";
import { EmptyState } from "../components/EmptyState.tsx";
import { useWorkspaceStore } from "../state/workspace.ts";
import { searchWorkspace, type SearchMatch, type SearchOptions } from "../ipc/search.ts";
import { openPath } from "../actions/fileActions.ts";
import { basename } from "../utils/path.ts";

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

/** Safely renders snippet text with matched query wrapped in <mark> (no innerHTML). */
function HighlightedSnippet({
  text,
  query,
  options,
}: {
  text: string;
  query: string;
  options: SearchOptions;
}) {
  if (!query.trim()) return <>{text}</>;
  try {
    const pattern = options.regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const flags = options.caseSensitive ? "g" : "gi";
    const re = new RegExp(
      options.wholeWord && !options.regex ? `\\b${pattern}\\b` : pattern,
      flags,
    );
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let keyIdx = 0;
    while ((match = re.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      parts.push(
        <mark key={keyIdx++} className="search-snippet__mark">
          {match[0]}
        </mark>,
      );
      lastIndex = re.lastIndex;
      if (!match[0].length) {
        re.lastIndex++;
      }
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return <>{parts.length > 0 ? parts : text}</>;
  } catch {
    return <>{text}</>;
  }
}

/** Workspace text search (docs/01 §7, docs/21 §5). Requires an open folder. */
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
  const searchVersion = useRef(0);

  const executeSearch = useCallback(
    async (searchQuery: string): Promise<void> => {
      if (!root) return;
      const trimmed = searchQuery.trim();
      if (!trimmed) {
        setMatches([]);
        setStatus(null);
        return;
      }

      const version = ++searchVersion.current;
      setBusy(true);
      setStatus(null);
      try {
        const res = await searchWorkspace(root, trimmed, options);
        if (version === searchVersion.current) {
          setMatches(res.matches);
          setStatus(
            res.matches.length === 0
              ? `No results in ${res.filesSearched} files`
              : `${res.matches.length}${res.truncated ? "+" : ""} results in ${res.filesSearched} files`,
          );
        }
      } catch (err) {
        if (version === searchVersion.current) {
          const e2 = err as { message?: string };
          setMatches([]);
          setStatus(e2?.message ?? "Search failed.");
        }
      } finally {
        if (version === searchVersion.current) {
          setBusy(false);
        }
      }
    },
    [root, options],
  );

  // Search-as-you-type (debounced ~200ms)
  useEffect(() => {
    if (!root) return;
    if (!query.trim()) {
      setMatches([]);
      setStatus(null);
      return;
    }
    const timer = setTimeout(() => {
      void executeSearch(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, executeSearch, root]);

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
    await executeSearch(query);
  };

  const toggle = (key: keyof SearchOptions): void => setOptions((o) => ({ ...o, [key]: !o[key] }));

  const groups = groupByFile(matches);

  return (
    <div className="search-panel">
      <form onSubmit={(e) => void run(e)}>
        <div className="search-panel__input-wrap">
          <Search size={15} className="search-panel__input-icon" aria-hidden />
          <input
            className="search-panel__input"
            placeholder="Search workspace…"
            aria-label="Search workspace"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
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
          <li key={path} className="search-results__group">
            <div className="search-results__file" title={path}>
              <span className="search-results__filename">{basename(path)}</span>
              <span className="search-results__count">{hits.length}</span>
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
                    <span className="search-results__preview">
                      <HighlightedSnippet text={m.preview} query={query} options={options} />
                    </span>
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
