import type { FactCheckResult, VerifiedCandidateProfile } from "@jobpilot/shared";
import type { AIProvider } from "../providers/types";
import { MockAIProvider } from "../providers/mock.provider";
import { FACT_CHECK_PROMPT_VERSION, FACT_CHECK_SYSTEM_PROMPT } from "./factChecker.prompt";
import { factCheckResultSchema } from "./factChecker.schema";
import { heuristicFactCheck } from "./factChecker.heuristic";

export interface FactCheckResultWithMeta extends FactCheckResult {
  model: string;
  promptVersion: string;
}

/**
 * Section 37 (Anti-Fabrication Validator / FactCheckerService). Every
 * AI-generated answer (cover letters, motivational question answers)
 * must be run through this before it is ever surfaced to the user or an
 * application. Input is exactly the spec's example: `answer` +
 * `verifiedProfile`. Output matches the spec's example JSON shape.
 */
export async function checkFacts(
  provider: AIProvider,
  answer: string,
  profile: VerifiedCandidateProfile,
): Promise<FactCheckResultWithMeta> {
  if (provider instanceof MockAIProvider) {
    provider.queueStructuredResponse(heuristicFactCheck(answer, profile));
  }

  const verifiedProfile = {
    yearsOfExperience: profile.yearsOfExperience,
    experience: profile.experience.map((e) => ({ jobTitle: e.jobTitle, company: e.company, startDate: e.startDate, endDate: e.endDate })),
    education: profile.education.map((e) => ({ degree: e.degree, institution: e.institution, field: e.field })),
    skills: profile.skills.map((s) => ({ name: s.name, yearsExperience: s.yearsExperience })),
    certifications: profile.certifications.map((c) => c.name),
    authorization: profile.authorization,
  };

  const userPrompt = JSON.stringify({ answer, verifiedProfile });

  const result = await provider.generateStructured({
    schema: factCheckResultSchema,
    systemPrompt: FACT_CHECK_SYSTEM_PROMPT,
    userPrompt,
    promptVersion: FACT_CHECK_PROMPT_VERSION,
    temperature: 0,
  });

  return {
    valid: result.data.valid,
    unsupportedClaims: result.data.unsupportedClaims,
    confidence: result.data.confidence,
    model: result.model,
    promptVersion: result.promptVersion,
  };
}
