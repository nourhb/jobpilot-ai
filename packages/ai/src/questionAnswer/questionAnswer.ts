import type { VerifiedCandidateProfile } from "@jobpilot/shared";
import type { AIProvider } from "../providers/types";
import { MockAIProvider } from "../providers/mock.provider";
import { QUESTION_ANSWER_PROMPT_VERSION, QUESTION_ANSWER_SYSTEM_PROMPT } from "./questionAnswer.prompt";
import { heuristicMotivationalAnswer } from "./questionAnswer.heuristic";
import type { QuestionAnswerJob } from "./questionAnswer.types";

export interface MotivationalAnswerResult {
  content: string;
  model: string;
  promptVersion: string;
}

/**
 * Generates a grounded answer for a single MOTIVATIONAL question
 * (section 31/32). The caller (apps/api's answerGenerator) is
 * responsible for running the result through the Fact Checker (section
 * 37) before ever surfacing it -- this function only generates.
 */
export async function generateMotivationalAnswer(
  provider: AIProvider,
  question: string,
  job: QuestionAnswerJob,
  profile: VerifiedCandidateProfile,
): Promise<MotivationalAnswerResult> {
  if (provider instanceof MockAIProvider) {
    provider.queueTextResponse(heuristicMotivationalAnswer(question, job, profile));
  }

  const verifiedCandidateProfile = {
    professionalSummary: profile.professionalSummary,
    yearsOfExperience: profile.yearsOfExperience,
    experience: profile.experience.map((e) => ({ jobTitle: e.jobTitle, company: e.company, description: e.description, isCurrent: e.isCurrent })),
    skills: profile.skills.map((s) => s.name),
    education: profile.education.map((e) => ({ degree: e.degree, institution: e.institution, field: e.field })),
    certifications: profile.certifications.map((c) => c.name),
  };

  const userPrompt = JSON.stringify({
    question,
    job: { title: job.title, company: job.company, description: job.description },
    verifiedCandidateProfile,
  });

  const result = await provider.generateText({
    systemPrompt: QUESTION_ANSWER_SYSTEM_PROMPT,
    userPrompt,
    promptVersion: QUESTION_ANSWER_PROMPT_VERSION,
    temperature: 0.4,
  });

  return { content: result.content, model: result.model, promptVersion: result.promptVersion };
}
