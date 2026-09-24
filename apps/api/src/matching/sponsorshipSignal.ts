/**
 * Section 27 hard filter: "IF required sponsorship == true SKIP". No
 * source adapter exposes a structured "sponsorship offered" field (job
 * postings are free text), so this is a documented keyword heuristic
 * over the posting text -- not a guarantee. It only matters when the
 * candidate's own Profile.requiresSponsorship is true; candidates who
 * don't need sponsorship are never affected by this check.
 *
 * Deliberately conservative: only phrases that clearly and specifically
 * rule out sponsorship trigger a match, to minimize false positives that
 * would wrongly hide an otherwise-good job.
 */
const NO_SPONSORSHIP_PHRASES = [
  "no sponsorship",
  "not able to sponsor",
  "unable to sponsor",
  "does not offer sponsorship",
  "without sponsorship",
  "must not require sponsorship",
  "cannot provide sponsorship",
  "will not sponsor",
  "not sponsor visas",
  "not offer visa sponsorship",
];

export function describesNoSponsorship(description: string): boolean {
  const normalized = description.toLowerCase();
  return NO_SPONSORSHIP_PHRASES.some((phrase) => normalized.includes(phrase));
}
