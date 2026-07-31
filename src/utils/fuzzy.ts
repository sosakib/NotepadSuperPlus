/**
 * Tiny subsequence fuzzy matcher for the command palette / quick-open.
 * Returns a score (higher = better) and the matched character indices, or null
 * if `query` is not a subsequence of `text`. Not a hot path — clarity over speed.
 */
export interface FuzzyResult {
  score: number;
  indices: number[];
}

export function fuzzyMatch(query: string, text: string): FuzzyResult | null {
  if (query === "") return { score: 0, indices: [] };

  const q = query.toLowerCase();
  const t = text.toLowerCase();
  const indices: number[] = [];

  let score = 0;
  let qi = 0;
  let prevMatch = -2;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      indices.push(ti);
      // Reward consecutive matches and matches at word boundaries.
      if (ti === prevMatch + 1) score += 8;
      else score += 1;
      if (ti === 0 || t[ti - 1] === " " || t[ti - 1] === "-" || t[ti - 1] === ":") score += 6;
      prevMatch = ti;
      qi++;
    }
  }

  if (qi < q.length) return null;
  // Prefer shorter, earlier matches.
  score -= Math.max(0, indices[0] ?? 0) * 0.1;
  score -= text.length * 0.02;
  return { score, indices };
}
