import type { VerifiedCandidateProfile } from "@jobpilot/shared";
import type { AIProvider } from "../providers/types";
import { MockAIProvider } from "../providers/mock.provider";
import { COVER_LETTER_PROMPT_VERSION, COVER_LETTER_SYSTEM_PROMPT } from "./coverLetter.prompt";
import { heuristicCoverLetter } from "./coverLetter.heuristic";
import type { CoverLetterJob, CoverLetterMatchContext } from "./coverLetter.types";

export interface CoverLetterResult {
  content: string;
  model: string;
  promptVersion: string;
}

/**
 * Section 29 (Cover Letter Generator). Input is exactly what the spec
 * lists: candidate profile + job description + company + (optional)
 * match analysis. Persistence (the `CoverLetter` Prisma model, which is
 * FK'd to `Application`) is deferred to Phase 6 when the `Application`
 * entity exists -- this function is a pure generator, callable
 * independently of any application record.
 */
export async function generateCoverLetter(
  provider: AIProvider,
  job: CoverLetterJob,
  profile: VerifiedCandidateProfile,
  matchContext?: CoverLetterMatchContext,
): Promise<CoverLetterResult> {
  if (provider instanceof MockAIProvider) {
    provider.queueTextResponse(heuristicCoverLetter(job, profile, matchContext));
  }

  const verifiedCandidateProfile = {
    identity: { firstName: profile.identity.firstName, lastName: profile.identity.lastName },
    professionalSummary: profile.professionalSummary,
    yearsOfExperience: profile.yearsOfExperience,
    experience: profile.experience.map((e) => ({
      jobTitle: e.jobTitle,
      company: e.company,
      description: e.description,
      isCurrent: e.isCurrent,
    })),
    education: profile.education.map((e) => ({ degree: e.degree, institution: e.institution, field: e.field })),
    skills: profile.skills.map((s) => s.name),
    certifications: profile.certifications.map((c) => c.name),
  };

  const userPrompt = JSON.stringify({
    job: { title: job.title, company: job.company, description: job.description },
    verifiedCandidateProfile,
    matchAnalysis: matchContext ?? null,
  });

  const result = await provider.generateText({
    systemPrompt: COVER_LETTER_SYSTEM_PROMPT,
    userPrompt,
    promptVersion: COVER_LETTER_PROMPT_VERSION,
    temperature: 0.4,
  });

  return { content: result.content, model: result.model, promptVersion: result.promptVersion };
}
