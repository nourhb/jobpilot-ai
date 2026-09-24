import type { ResumeExtraction } from "@jobpilot/shared";
import type { AIProvider } from "../providers/types";
import { MockAIProvider } from "../providers/mock.provider";
import { RESUME_PARSER_PROMPT_VERSION, RESUME_PARSER_SYSTEM_PROMPT } from "../prompts/resume-parser";
import { resumeExtractionSchema } from "./resume.schema";
import { heuristicExtractResume } from "./resume.heuristic";
import { scoreResumeExtraction, RESUME_REVIEW_THRESHOLD } from "./resume.confidence";

export interface ParsedResume {
  data: ResumeExtraction;
  confidence: number;
  reviewRequired: boolean;
  model: string;
  promptVersion: string;
  raw: string;
}

/**
 * Extracts structured candidate data from raw resume text (section 22).
 *
 * The MockAIProvider has no real understanding of arbitrary resume text,
 * so when it is the active provider we seed it with the offline
 * heuristic extraction (see resume.heuristic.ts) rather than letting it
 * return `{}` (which would fail schema validation for every upload).
 * This keeps mock behaviour honest: it is clearly a limited heuristic,
 * and the resulting (usually low) confidence score correctly drives
 * "CV REVIEW REQUIRED" for most real-world resumes -- the same
 * confidence-scoring code path a real provider's output goes through.
 */
export async function parseResume(provider: AIProvider, rawText: string): Promise<ParsedResume> {
  if (provider instanceof MockAIProvider) {
    provider.queueStructuredResponse(heuristicExtractResume(rawText));
  }

  const result = await provider.generateStructured<ResumeExtraction>({
    schema: resumeExtractionSchema,
    systemPrompt: RESUME_PARSER_SYSTEM_PROMPT,
    userPrompt: rawText,
    promptVersion: RESUME_PARSER_PROMPT_VERSION,
    temperature: 0,
  });

  const { score } = scoreResumeExtraction(result.data);

  return {
    data: result.data,
    confidence: score,
    reviewRequired: score < RESUME_REVIEW_THRESHOLD,
    model: result.model,
    promptVersion: result.promptVersion,
    raw: result.raw,
  };
}
