import type { MatchCategory, MatchDecision } from "../constants";

/**
 * Phase 4, section 26 (Matching Algorithm). Every field here is produced
 * by a deterministic algorithm (apps/api/src/matching/scoring.ts) --
 * never by an AI provider. This is the "hybrid score" the spec insists
 * on computing before any LLM is involved:
 *
 *   score = 30% skills + 20% experience + 15% title similarity
 *         + 10% location + 10% authorization + 5% salary
 *         + 5% employment type + 5% preferences
 */
export interface HybridScoreBreakdown {
  score: number;
  matchCategory: MatchCategory;
  skillsScore: number;
  experienceScore: number;
  titleScore: number;
  locationScore: number;
  authorizationScore: number;
  salaryScore: number;
  employmentTypeScore: number;
  preferencesScore: number;
  /** Candidate's verified skill names found in the job description text. */
  matchedSkills: string[];
}

/**
 * Section 25 (AI Job Matcher) output -- narrative interpretation only.
 * `decision` here is the AI's own advisory opinion; it is never used to
 * drive auto-apply directly (see JobMatch.decision in schema.prisma,
 * which is computed from `HybridScoreBreakdown.score` vs. the user's
 * configured threshold instead).
 */
export interface JobMatchInterpretation {
  decision: MatchDecision | null;
  reasons: string[];
  missingRequirements: string[];
  riskFlags: string[];
}
