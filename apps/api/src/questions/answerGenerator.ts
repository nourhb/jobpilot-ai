import type { QuestionAnswerResult, VerifiedCandidateProfile } from "@jobpilot/shared";
import { checkFacts, generateMotivationalAnswer, type QuestionAnswerJob } from "@jobpilot/ai";
import type { AIProvider } from "@jobpilot/ai";
import { classifyQuestion } from "./questionClassifier";
import { retrieveFact } from "./factRetrieval";

/**
 * Section 31/32/33/37 orchestration -- the Application Question Engine.
 *
 * Every question flows through:
 *   1. classify (deterministic, never AI)
 *   2. HIGH_RISK -> BLOCK immediately, no retrieval attempted
 *   3. every other category except MOTIVATIONAL -> direct fact retrieval
 *      from the verified profile; not found -> BLOCK (never guessed)
 *   4. MOTIVATIONAL -> the only category ever sent to the AI provider,
 *      and even then the generated answer is run through the Fact
 *      Checker (section 37) before ever being returned; a failed check
 *      BLOCKs the answer rather than surfacing a fabricated claim
 *
 * This mirrors, at question-answer granularity, the same
 * Proposal -> Validator pattern the full "Zero Mistake" application
 * pipeline uses at the whole-application level (Phase 6).
 */
export async function generateAnswerForQuestion(
  provider: AIProvider,
  questionText: string,
  profile: VerifiedCandidateProfile,
  job: QuestionAnswerJob,
): Promise<QuestionAnswerResult> {
  const { category, responseShape } = classifyQuestion(questionText);

  if (category === "HIGH_RISK") {
    return {
      category,
      status: "BLOCKED",
      answer: null,
      source: null,
      blockedReason:
        "This question falls into a high-risk category (e.g. medical, criminal history, or other protected/legally sensitive information) and requires manual review.",
    };
  }

  if (category === "MOTIVATIONAL") {
    const generated = await generateMotivationalAnswer(provider, questionText, job, profile);
    const factCheck = await checkFacts(provider, generated.content, profile);

    if (!factCheck.valid) {
      return {
        category,
        status: "BLOCKED",
        answer: null,
        source: null,
        blockedReason: `The AI-generated answer made claims that could not be confirmed against your verified profile: ${factCheck.unsupportedClaims.join("; ")}`,
        factCheck: { valid: factCheck.valid, unsupportedClaims: factCheck.unsupportedClaims, confidence: factCheck.confidence },
      };
    }

    return {
      category,
      status: "ANSWERED",
      answer: generated.content,
      source: "AI_GROUNDED",
      factCheck: { valid: factCheck.valid, unsupportedClaims: factCheck.unsupportedClaims, confidence: factCheck.confidence },
      aiModel: generated.model,
      aiPromptVersion: generated.promptVersion,
    };
  }

  const fact = retrieveFact(category, responseShape, questionText, profile);
  if (!fact.found) {
    return {
      category,
      status: "BLOCKED",
      answer: null,
      source: null,
      blockedReason: "Required information was not found in your verified profile. Please answer this question manually.",
    };
  }

  // DESCRIPTIVE experience facts (e.g. "Describe your Kubernetes
  // experience.") have a verified skill to ground on but still benefit
  // from an AI-written sentence rather than returning a bare skill name
  // -- generate it, then fact-check it just like MOTIVATIONAL answers.
  if (category === "EXPERIENCE_FACT" && responseShape === "DESCRIPTIVE") {
    const generated = await generateMotivationalAnswer(provider, questionText, job, profile);
    const factCheck = await checkFacts(provider, generated.content, profile);

    if (!factCheck.valid) {
      return {
        category,
        status: "BLOCKED",
        answer: null,
        source: null,
        blockedReason: `The AI-generated answer made claims that could not be confirmed against your verified profile: ${factCheck.unsupportedClaims.join("; ")}`,
        factCheck,
      };
    }

    return {
      category,
      status: "ANSWERED",
      answer: generated.content,
      source: "AI_GROUNDED",
      factCheck,
      aiModel: generated.model,
      aiPromptVersion: generated.promptVersion,
    };
  }

  return {
    category,
    status: "ANSWERED",
    answer: fact.value ?? null,
    source: "FACT",
  };
}
