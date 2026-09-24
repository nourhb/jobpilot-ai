/**
 * Section 26 (15% "title similarity"). A simple, explainable word-overlap
 * (Jaccard) similarity -- not semantic/embedding-based -- so the score
 * is deterministic and testable without an AI provider. Good enough to
 * distinguish "Cloud Support Engineer" from "Marketing Manager" without
 * needing a model call for every job on every page load.
 */
const STOPWORDS = new Set(["a", "an", "the", "and", "or", "of", "for", "to", "in", "on", "with"]);

function tokenize(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .split(/[^a-z0-9+#]+/)
      .filter((word) => word.length > 0 && !STOPWORDS.has(word)),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Compares a job title against a list of candidate reference titles
 * (e.g. JobPreference.targetTitles, or the candidate's own verified
 * job titles as a fallback) and returns the best (highest) similarity,
 * scaled 0-100.
 */
export function scoreTitleSimilarity(jobTitle: string, referenceTitles: string[]): number {
  if (referenceTitles.length === 0) return 0;
  const jobTokens = tokenize(jobTitle);
  let best = 0;
  for (const reference of referenceTitles) {
    const score = jaccardSimilarity(jobTokens, tokenize(reference));
    if (score > best) best = score;
  }
  return Math.round(best * 100);
}
