import type { HybridScoreBreakdown, JobMatchInterpretation } from "@jobpilot/shared";

/**
 * Offline, deterministic stand-in for a real AI provider's job-match
 * interpretation (see resume.heuristic.ts for the same pattern applied
 * to resume parsing). Used to seed `MockAIProvider` so mock behaviour is
 * a genuine (if simple) explanation of the already-computed hybrid
 * score, rather than an empty/meaningless response.
 */
export function heuristicJobMatchInterpretation(breakdown: HybridScoreBreakdown): JobMatchInterpretation {
  const reasons: string[] = [];
  const missingRequirements: string[] = [];
  const riskFlags: string[] = [];

  if (breakdown.matchedSkills.length > 0) {
    reasons.push(`Your verified skills overlap with this posting: ${breakdown.matchedSkills.join(", ")}.`);
  } else {
    missingRequirements.push("None of your verified skills were found in this job's description.");
  }

  if (breakdown.locationScore >= 90) {
    reasons.push("The job's location/remote type matches your preferences.");
  } else if (breakdown.locationScore < 50) {
    riskFlags.push("This job's location or remote type may not match your preferences.");
  }

  if (breakdown.authorizationScore >= 90) {
    reasons.push("No work-authorization barrier was detected for this role.");
  } else if (breakdown.authorizationScore < 50) {
    riskFlags.push("This posting may not support the work authorization/sponsorship you need.");
  }

  if (breakdown.experienceScore < 50) {
    riskFlags.push("This role's experience level may not closely match your profile's years of experience.");
  }

  if (breakdown.salaryScore < 50) {
    riskFlags.push("The posted salary range may be below your stated salary expectations.");
  }

  const decision = breakdown.score >= 80 ? "APPLY" : breakdown.score >= 70 ? "REVIEW" : "SKIP";

  return { decision, reasons, missingRequirements, riskFlags };
}
