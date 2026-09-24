import type { QuestionCategory } from "../constants";

/**
 * Section 37 (Anti-Fabrication Validator). Every AI-generated answer is
 * checked against the verified profile before it is ever surfaced to the
 * user or an application. `valid === false` must BLOCK the answer, never
 * just lower a confidence number silently.
 */
export interface FactCheckResult {
  valid: boolean;
  unsupportedClaims: string[];
  confidence: number;
}

/**
 * Output of the Application Question Engine (sections 31-33) for a
 * single application question. `answer` is only non-null when
 * `status === "ANSWERED"`. `source` distinguishes a direct retrieval
 * from the verified profile (no AI involved at all) from an
 * AI-generated, fact-checked narrative answer.
 */
export interface QuestionAnswerResult {
  category: QuestionCategory;
  status: "ANSWERED" | "BLOCKED";
  answer: string | null;
  source: "FACT" | "AI_GROUNDED" | null;
  blockedReason?: string;
  factCheck?: FactCheckResult;
  aiModel?: string;
  aiPromptVersion?: string;
}
