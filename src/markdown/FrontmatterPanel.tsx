import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { Frontmatter } from "./frontmatter.ts";

/**
 * Document metadata, shown above the rendered body (FR-3.3).
 *
 * Collapsed by default. Frontmatter is context, not content — a reader opening a
 * document wants the prose first, and an expanded metadata block would push the
 * first heading below the fold on every file that has one.
 */
export function FrontmatterPanel({ frontmatter }: { frontmatter: Frontmatter }) {
  const [open, setOpen] = useState(false);

  if (frontmatter.entries.length === 0) return null;

  return (
    <section className={`frontmatter${open ? " frontmatter--open" : ""}`}>
      <button
        type="button"
        className="frontmatter__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <ChevronRight size={14} className="frontmatter__chevron" aria-hidden />
        <span className="frontmatter__label">Frontmatter</span>
        <span className="frontmatter__count">
          {frontmatter.entries.length} {frontmatter.entries.length === 1 ? "field" : "fields"}
        </span>
      </button>

      {open ? (
        <dl className="frontmatter__list">
          {frontmatter.entries.map((entry) => (
            <div className="frontmatter__row" key={entry.key}>
              <dt className="frontmatter__key">{entry.key}</dt>
              <dd className={`frontmatter__value${entry.raw ? " frontmatter__value--raw" : ""}`}>
                {entry.value || <span className="frontmatter__empty">—</span>}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}
