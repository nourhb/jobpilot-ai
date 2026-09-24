import type { VerifiedCandidateProfile } from "@jobpilot/shared";
import type { CoverLetterJob, CoverLetterMatchContext } from "./coverLetter.types";

/**
 * Offline, deterministic stand-in for a real AI provider's cover letter
 * (same pattern as resume.heuristic.ts and jobMatch.heuristic.ts). Used
 * to seed `MockAIProvider` so mock behaviour is a genuine, readable
 * cover letter assembled ONLY from verified facts, rather than a
 * meaningless canned string.
 */
export function heuristicCoverLetter(
  job: CoverLetterJob,
  profile: VerifiedCandidateProfile,
  matchContext?: CoverLetterMatchContext,
): string {
  const fullName = `${profile.identity.firstName} ${profile.identity.lastName}`.trim();

  const currentOrMostRecent =
    profile.experience.find((exp) => exp.isCurrent) ?? profile.experience[0] ?? null;

  const highlightSkills = (matchContext?.matchedSkills?.length ? matchContext.matchedSkills : profile.skills.map((s) => s.name)).slice(
    0,
    5,
  );

  const lines: string[] = [];

  lines.push(`Dear ${job.company} Hiring Team,`);
  lines.push("");
  lines.push(
    `I am writing to express my interest in the ${job.title} position at ${job.company}.` +
      (profile.professionalSummary ? ` ${profile.professionalSummary}` : ""),
  );
  lines.push("");

  if (currentOrMostRecent) {
    lines.push(
      `In my role as ${currentOrMostRecent.jobTitle} at ${currentOrMostRecent.company}, I have built experience that I believe is directly relevant to this position.` +
        (currentOrMostRecent.description ? ` ${currentOrMostRecent.description}` : ""),
    );
    lines.push("");
  }

  if (highlightSkills.length > 0) {
    lines.push(`My verified skills include ${highlightSkills.join(", ")}, which align well with what this role requires.`);
    lines.push("");
  }

  if (profile.yearsOfExperience !== null) {
    lines.push(
      `With ${profile.yearsOfExperience} year${profile.yearsOfExperience === 1 ? "" : "s"} of professional experience, I am confident I can contribute to your team from day one.`,
    );
    lines.push("");
  }

  lines.push(`Thank you for considering my application. I would welcome the opportunity to discuss how my background fits this role.`);
  lines.push("");
  lines.push("Sincerely,");
  lines.push(fullName);

  return lines.join("\n");
}
