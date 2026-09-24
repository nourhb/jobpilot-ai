import type { VerifiedCandidateProfile } from "@jobpilot/shared";
import type { QuestionAnswerJob } from "./questionAnswer.types";

/**
 * Offline, deterministic stand-in for a real AI provider's motivational
 * answer (same pattern as coverLetter.heuristic.ts). Used to seed
 * `MockAIProvider` with a short, genuine answer grounded only in
 * verified facts, rather than a meaningless canned string.
 */
export function heuristicMotivationalAnswer(
  _question: string,
  job: QuestionAnswerJob,
  profile: VerifiedCandidateProfile,
): string {
  const topSkills = profile.skills.slice(0, 3).map((s) => s.name);
  const currentOrMostRecent = profile.experience.find((exp) => exp.isCurrent) ?? profile.experience[0] ?? null;

  const parts: string[] = [];
  parts.push(`I'm interested in the ${job.title} role at ${job.company} because it lines up well with my background.`);

  if (currentOrMostRecent) {
    parts.push(`In my current work as ${currentOrMostRecent.jobTitle} at ${currentOrMostRecent.company}, I've developed skills I'm looking to apply in a new environment.`);
  }

  if (topSkills.length > 0) {
    parts.push(`My experience with ${topSkills.join(", ")} makes me confident I can contribute quickly to your team.`);
  }

  return parts.join(" ");
}
