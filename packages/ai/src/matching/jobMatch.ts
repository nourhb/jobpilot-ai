import type { HybridScoreBreakdown, JobMatchInterpretation, VerifiedCandidateProfile } from "@jobpilot/shared";
import type { AIProvider } from "../providers/types";
import { MockAIProvider } from "../providers/mock.provider";
import { JOB_MATCH_PROMPT_VERSION, JOB_MATCH_SYSTEM_PROMPT } from "./jobMatch.prompt";
import { jobMatchInterpretationSchema } from "./jobMatch.schema";
import { heuristicJobMatchInterpretation } from "./jobMatch.heuristic";

export interface JobMatchInterpretationResult extends JobMatchInterpretation {
  model: string;
  promptVersion: string;
}

/**
 * Section 25 (AI Job Matcher). Only ever called AFTER the deterministic
 * hybrid score (section 26) has been computed -- `breakdown` is passed
 * in as context, not produced here. The AI's role is limited to
 * narrative interpretation grounded in `profile` (the verified truth
 * layer, section 24) and the job's own description; it never sees raw
 * resume text or unverified profile data.
 */
export async function interpretJobMatch(
  provider: AIProvider,
  job: { title: string; company: string; description: string },
  profile: VerifiedCandidateProfile,
  breakdown: HybridScoreBreakdown,
): Promise<JobMatchInterpretationResult> {
  if (provider instanceof MockAIProvider) {
    provider.queueStructuredResponse(heuristicJobMatchInterpretation(breakdown));
  }

  const verifiedCandidateFacts = {
    skills: profile.skills.map((s) => s.name),
    experience: profile.experience.map((e) => `${e.jobTitle} at ${e.company}`),
    education: profile.education.map((e) => `${e.degree} - ${e.institution}`),
    certifications: profile.certifications.map((c) => c.name),
    yearsOfExperience: profile.yearsOfExperience,
    authorization: profile.authorization,
  };

  const userPrompt = JSON.stringify({
    job,
    verifiedCandidateFacts,
    computedScore: breakdown,
  });

  const result = await provider.generateStructured({
    schema: jobMatchInterpretationSchema,
    systemPrompt: JOB_MATCH_SYSTEM_PROMPT,
    userPrompt,
    promptVersion: JOB_MATCH_PROMPT_VERSION,
    temperature: 0,
  });

  return {
    decision: result.data.decision ?? null,
    reasons: result.data.reasons,
    missingRequirements: result.data.missingRequirements,
    riskFlags: result.data.riskFlags,
    model: result.model,
    promptVersion: result.promptVersion,
  };
}
