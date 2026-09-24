import type { Job, JobPreference } from "@prisma/client";

export interface PolicyResult {
  allowed: boolean;
  reasons: string[];
  requiresManualReview: boolean;
}

export interface PolicyContext {
  job: Job;
  preferences: JobPreference;
  isDuplicate: boolean;
  hasBlockedAnswer: boolean;
  hasFailedFactCheck: boolean;
  adapterSupported: boolean;
}

/**
 * Section 78 (`ApplicationPolicyEngine.evaluateApplication`) enforcing
 * section 76's hard-coded safety rules. Distinguishes two very
 * different kinds of "don't submit":
 *   - a hard/terminal stop (duplicate, expired, outside configured
 *     scope) -- `allowed: false`, `requiresManualReview: false`. No
 *     human needs to look at this; the caller should move the
 *     Application straight to a terminal failure status.
 *   - a soft stop that needs a human (an unanswerable/unsupported
 *     question, an unsupported source) -- `allowed: false`,
 *     `requiresManualReview: true`, exactly matching the spec's own
 *     worked example.
 * `allowed: true` means every rule passed and the caller may proceed to
 * submission -- this function never submits anything itself.
 */
export function evaluateApplication(context: PolicyContext): PolicyResult {
  const reasons: string[] = [];

  // RULE-006: never submit duplicate applications.
  if (context.isDuplicate) {
    return { allowed: false, requiresManualReview: false, reasons: ["An application to this job already exists."] };
  }

  // RULE-007: never submit if job is expired.
  const jobIsActive = context.job.status === "ACTIVE" && (!context.job.expiresAt || context.job.expiresAt.getTime() > Date.now());
  if (!jobIsActive) {
    return { allowed: false, requiresManualReview: false, reasons: ["Job posting is no longer active."] };
  }

  // RULE-008: never submit outside configured locations.
  if (context.job.country && context.preferences.countries.length > 0) {
    const allowedCountry = context.preferences.countries.some((c) => c.toLowerCase() === context.job.country?.toLowerCase());
    if (!allowedCountry) {
      return { allowed: false, requiresManualReview: false, reasons: [`Job is located in ${context.job.country}, outside your configured countries.`] };
    }
  }

  // RULE-009: never submit outside configured job types.
  if (context.preferences.employmentTypes.length > 0 && !context.preferences.employmentTypes.includes(context.job.employmentType)) {
    return { allowed: false, requiresManualReview: false, reasons: [`Job's employment type (${context.job.employmentType}) is outside your configured types.`] };
  }

  let requiresManualReview = false;

  // RULE-005: never submit when required information cannot be verified.
  if (context.hasBlockedAnswer) {
    reasons.push("Required question cannot be answered from verified profile");
    requiresManualReview = true;
  }

  // RULE-001 (defense in depth on top of the Fact Checker, section 37).
  if (context.hasFailedFactCheck) {
    reasons.push("An AI-generated answer failed the fact check.");
    requiresManualReview = true;
  }

  // "external source is unsupported" -> MANUAL_REVIEW (master prompt).
  if (!context.adapterSupported) {
    reasons.push("This job's source does not support automated submission yet.");
    requiresManualReview = true;
  }

  return { allowed: reasons.length === 0, requiresManualReview, reasons };
}
