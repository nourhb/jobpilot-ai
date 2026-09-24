import type { QuestionCategory } from "@jobpilot/shared";

/** How the answer to a classified question is expected to be shaped -- drives factRetrieval.ts's lookup strategy. */
export type ResponseShape = "YES_NO" | "NUMERIC" | "VALUE" | "DESCRIPTIVE";

export interface QuestionClassification {
  category: QuestionCategory;
  responseShape: ResponseShape;
}

const HIGH_RISK_PATTERNS: RegExp[] = [
  /criminal|conviction|felony|arrested/i,
  /medical (condition|history|information)|health condition|disabilit(y|ies)/i,
  /\brace\b|ethnicity|national origin|religio/i,
  /gender identity|sexual orientation/i,
  /pregnan/i,
  /security clearance|clearance level/i,
  /marital status/i,
  /veteran status/i,
  // "legal declarations" (section 33) -- a formal attestation/affidavit,
  // distinct from a simple retrievable authorization fact (see LEGAL
  // below). Deliberately narrow to avoid catching ordinary authorization
  // questions.
  /sworn (statement|declaration)|under penalty of perjury/i,
];

// Retrievable directly from `profile.authorization` -- NEVER blocked
// outright and NEVER guessed by an AI (section 32's own example).
const LEGAL_PATTERNS: RegExp[] = [
  /legally (authorized|permitted|entitled) to work/i,
  /eligible to work/i,
  /work (authorization|permit)/i,
  /require.*(sponsorship|visa)/i,
  /visa status/i,
];

const EDUCATION_PATTERNS: RegExp[] = [/degree|diploma|education level|graduate(d)?|university|college/i];

const PREFERENCE_PATTERNS: RegExp[] = [
  /salary expectation|expected salary|compensation expectation/i,
  /notice period/i,
  /available to start|start date/i,
  /willing(ness)? to relocate|relocat/i,
  /remote|hybrid|on-?site/i,
];

const MOTIVATIONAL_PATTERNS: RegExp[] = [
  /why (do|are) you.*(want|interested)/i,
  /what interests you/i,
  /why should we hire you/i,
  /what makes you a good fit/i,
  /tell us about yourself/i,
  /why.*(this role|this position|this company|us)/i,
];

const PROFILE_FACT_PATTERNS: RegExp[] = [
  /first name|last name|full name/i,
  /email address/i,
  /phone number/i,
  /current (city|location)|where.*(located|based)/i,
];

const EXPERIENCE_KEYWORDS = /experience|worked with|have you used/i;
const NUMERIC_PHRASING = /how many years|number of years/i;
const YES_NO_PHRASING = /^\s*(do|does|did|are|is|have|has|can|will|would)\b/i;
const DESCRIPTIVE_PHRASING = /describe|tell (us|me) about|explain/i;

/**
 * Section 31 (Application Question Engine). Deterministic, keyword-based
 * classification -- deliberately NOT an AI call. HIGH_RISK blocking in
 * particular must be reliable, not probabilistic (section 33: "the user
 * can manually handle them"), and LEGAL questions must never be handed
 * to an LLM to guess (section 32).
 */
export function classifyQuestion(questionText: string): QuestionClassification {
  const text = questionText.trim();

  if (HIGH_RISK_PATTERNS.some((p) => p.test(text))) {
    return { category: "HIGH_RISK", responseShape: "DESCRIPTIVE" };
  }

  if (LEGAL_PATTERNS.some((p) => p.test(text))) {
    return { category: "LEGAL", responseShape: YES_NO_PHRASING.test(text) ? "YES_NO" : "VALUE" };
  }

  if (EXPERIENCE_KEYWORDS.test(text)) {
    if (NUMERIC_PHRASING.test(text)) return { category: "EXPERIENCE_FACT", responseShape: "NUMERIC" };
    if (DESCRIPTIVE_PHRASING.test(text)) return { category: "EXPERIENCE_FACT", responseShape: "DESCRIPTIVE" };
    return { category: "EXPERIENCE_FACT", responseShape: "YES_NO" };
  }

  if (EDUCATION_PATTERNS.some((p) => p.test(text))) {
    return { category: "EDUCATION_FACT", responseShape: YES_NO_PHRASING.test(text) ? "YES_NO" : "VALUE" };
  }

  if (PREFERENCE_PATTERNS.some((p) => p.test(text))) {
    return { category: "PREFERENCE", responseShape: YES_NO_PHRASING.test(text) ? "YES_NO" : "VALUE" };
  }

  if (MOTIVATIONAL_PATTERNS.some((p) => p.test(text))) {
    return { category: "MOTIVATIONAL", responseShape: "DESCRIPTIVE" };
  }

  if (PROFILE_FACT_PATTERNS.some((p) => p.test(text))) {
    return { category: "PROFILE_FACT", responseShape: "VALUE" };
  }

  if (YES_NO_PHRASING.test(text)) {
    return { category: "YES_NO_FACT", responseShape: "YES_NO" };
  }

  return { category: "UNKNOWN", responseShape: "DESCRIPTIVE" };
}
