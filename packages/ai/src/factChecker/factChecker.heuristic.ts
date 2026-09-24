import type { VerifiedCandidateProfile } from "@jobpilot/shared";

/**
 * Offline, deterministic stand-in for a real AI provider's fact-check
 * (section 37). Intentionally limited in scope: it only catches
 * concrete, cheaply-verifiable numeric/name mismatches --
 *   1. "N years" claims that don't match the candidate's overall
 *      `yearsOfExperience` or any individual skill's `yearsExperience`
 *      (within +/-1 year tolerance for rounding).
 *   2. Certification-sounding language ("certified", "certification")
 *      where none of the candidate's actual certification names appear
 *      anywhere in the answer.
 *
 * It deliberately does NOT attempt general named-entity fabrication
 * detection (e.g. an invented employer or achievement with no numbers
 * attached) -- that requires real language understanding and is left to
 * a real AI provider. This heuristic exists only to give `MockAIProvider`
 * genuine, testable behaviour for the two failure modes above, not to
 * be a complete substitute for the real check. It always reports a
 * modest confidence for exactly this reason.
 */
export function heuristicFactCheck(answer: string, profile: VerifiedCandidateProfile): {
  valid: boolean;
  unsupportedClaims: string[];
  confidence: number;
} {
  const unsupportedClaims: string[] = [];

  const knownYearCounts = new Set<number>();
  if (profile.yearsOfExperience !== null) knownYearCounts.add(profile.yearsOfExperience);
  for (const skill of profile.skills) {
    if (skill.yearsExperience !== null) knownYearCounts.add(skill.yearsExperience);
  }

  const yearClaimPattern = /(\d+)\+?\s*years?/gi;
  let match: RegExpExecArray | null;
  while ((match = yearClaimPattern.exec(answer)) !== null) {
    const claimed = Number(match[1]);
    const isSupported = [...knownYearCounts].some((known) => Math.abs(known - claimed) <= 1);
    if (!isSupported) {
      unsupportedClaims.push(`Answer claims "${match[0]}" of experience, which is not confirmed anywhere in your verified profile.`);
    }
  }

  if (/certifi(ed|cation)/i.test(answer)) {
    const certNames = profile.certifications.map((c) => c.name.toLowerCase());
    const mentionsKnownCert = certNames.some((name) => answer.toLowerCase().includes(name));
    if (!mentionsKnownCert) {
      unsupportedClaims.push(
        "Answer references a certification, but none of your verified certifications are named in the answer.",
      );
    }
  }

  const valid = unsupportedClaims.length === 0;

  return {
    valid,
    unsupportedClaims,
    // This heuristic only catches two specific failure modes, so it never
    // claims high confidence either way -- see the doc comment above.
    confidence: valid ? 0.6 : 0.75,
  };
}
