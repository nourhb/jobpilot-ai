import type { QuestionAnswerResult, VerifiedCandidateProfile } from "@jobpilot/shared";

export interface ValidationCheck {
  name: string;
  passed: boolean;
  reason?: string;
}

export interface ValidationResult {
  passed: boolean;
  checks: ValidationCheck[];
}

export interface ValidationContext {
  profile: VerifiedCandidateProfile;
  hasResume: boolean;
  coverLetter: string | null;
  answers: QuestionAnswerResult[];
  jobIsActive: boolean;
  isDuplicate: boolean;
  adapterSupported: boolean;
}

/**
 * Section 36 (Application Validator) -- reproduces the spec's own
 * checklist exactly, one PASS/FAIL per item. This runs AFTER the
 * Question Engine + Fact Checker (Phase 5) have already produced
 * `answers`, and its job is to look at the *results* holistically, not
 * to re-derive them. `passed` is only true when every single check
 * passes; a caller must never submit otherwise.
 */
export function validateApplication(context: ValidationContext): ValidationResult {
  const checks: ValidationCheck[] = [];

  checks.push({
    name: "Candidate identity",
    passed: Boolean(context.profile.identity.firstName && context.profile.identity.lastName),
  });

  checks.push({ name: "Email", passed: Boolean(context.profile.identity.email) });

  // The spec's own checklist (section 36) lists Phone as its own PASS
  // item alongside Email -- many ATS application forms require a phone
  // number, so treat it as required here too rather than optional.
  checks.push({
    name: "Phone",
    passed: Boolean(context.profile.identity.phone),
    reason: context.profile.identity.phone ? undefined : "No phone number is on file.",
  });

  checks.push({ name: "CV", passed: context.hasResume, reason: context.hasResume ? undefined : "No resume has been uploaded." });

  checks.push({
    name: "Cover letter",
    passed: Boolean(context.coverLetter && context.coverLetter.trim().length > 0),
  });

  checks.push({
    name: "Required fields",
    passed: Boolean(context.profile.identity.email && context.profile.identity.firstName && context.profile.identity.lastName),
  });

  checks.push({
    name: "Work authorization",
    passed: context.profile.authorization.status !== null,
    reason: context.profile.authorization.status !== null ? undefined : "Work authorization status is not set.",
  });

  const blockedAnswers = context.answers.filter((a) => a.status === "BLOCKED");
  checks.push({
    name: "Application questions",
    passed: blockedAnswers.length === 0,
    reason: blockedAnswers.length > 0 ? `${blockedAnswers.length} question(s) could not be answered from your verified profile.` : undefined,
  });

  // Section 37: even an ANSWERED question must have passed its fact
  // check -- answerGenerator.ts already blocks anything that fails, so
  // this is defense in depth, not the primary enforcement point.
  const failedFactChecks = context.answers.filter((a) => a.factCheck && a.factCheck.valid === false);
  checks.push({ name: "No fabricated data", passed: failedFactChecks.length === 0 });

  checks.push({ name: "Duplicate check", passed: !context.isDuplicate });

  checks.push({ name: "Job still active", passed: context.jobIsActive });

  checks.push({ name: "Source supports submission", passed: context.adapterSupported });

  return { passed: checks.every((c) => c.passed), checks };
}
