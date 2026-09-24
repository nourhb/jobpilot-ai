import type { ApplicationForm, ApplicationResult, JobSourceAdapter } from "@jobpilot/source-adapters";
import { ApplicationSourceError, CaptchaDetectedError } from "./applicationAdapter.types";
import type { AdapterJob, ApplicationAdapter, ApplicationQuestionDescriptor, SubmitApplicationPayload, SubmitApplicationResult } from "./applicationAdapter.types";

/** Same conventional form-field ids the Mock ATS / mock adapter use for candidate identity (Phase 3/6), reused here so every real adapter's `submitApplication` is driven the same way. */
const FULL_NAME_FIELD_ID = "fullName";
const EMAIL_FIELD_ID = "email";

function toApplicationResult(result: ApplicationResult): SubmitApplicationResult {
  if (result.status === "MANUAL_REVIEW_REQUIRED") {
    // Section 38: "If CAPTCHA appears -> MANUAL_REVIEW" -- this is also
    // where a real adapter's own anti-bot/CAPTCHA signal (see
    // lever.client.ts / ashby.client.ts) surfaces, since neither
    // platform's public API distinguishes "CAPTCHA" from "any other
    // reason we can't safely submit right now".
    throw new CaptchaDetectedError(result.message ?? `${result.status}: submission requires manual review.`);
  }
  if (result.status === "FAILED" || !result.externalApplicationId) {
    throw new ApplicationSourceError(result.message ?? "The source rejected the application.");
  }
  return { externalApplicationId: result.externalApplicationId };
}

function toApplicationForm(form: ApplicationForm): ApplicationQuestionDescriptor[] {
  return form.fields
    .filter((field) => field.id !== FULL_NAME_FIELD_ID && field.id !== EMAIL_FIELD_ID)
    .map((field) => ({ id: field.id, text: field.label }));
}

/**
 * Wraps any `packages/source-adapters` `JobSourceAdapter` (Phase 7:
 * Lever, Ashby) that implements the optional `getApplicationForm`/
 * `submitApplication` methods, exposing it through the
 * `ApplicationAdapter` interface `application.service.ts` (Phase 6)
 * already knows how to drive -- so the Application Engine never needs a
 * second code path for "real ATS" vs. "Mock ATS".
 *
 * Only ever constructed for a `JobSourceAdapter` that actually has both
 * optional methods (see `resolveApplicationAdapter`); Greenhouse, which
 * doesn't implement `submitApplication`, is never wrapped here and
 * instead resolves to `null` (automatic MANUAL_REVIEW), same as before
 * Phase 7.
 */
export function createSourceAdapterBridge(
  name: string,
  adapter: JobSourceAdapter & Required<Pick<JobSourceAdapter, "getApplicationForm" | "submitApplication">>,
): ApplicationAdapter {
  return {
    name,

    async isJobStillActive(job: AdapterJob): Promise<boolean> {
      try {
        await adapter.getJobDetails(job.externalId);
        return true;
      } catch {
        return false;
      }
    },

    async getQuestions(job: AdapterJob): Promise<ApplicationQuestionDescriptor[]> {
      try {
        const form = await adapter.getApplicationForm(job.externalId);
        return toApplicationForm(form);
      } catch (error) {
        throw new ApplicationSourceError(error instanceof Error ? error.message : "Could not retrieve the application form.");
      }
    },

    async submit(job: AdapterJob, payload: SubmitApplicationPayload): Promise<SubmitApplicationResult> {
      const answers: Record<string, string> = {
        [FULL_NAME_FIELD_ID]: payload.candidateName,
        [EMAIL_FIELD_ID]: payload.candidateEmail,
      };
      for (const answer of payload.answers) {
        answers[answer.questionId] = answer.answer;
      }

      const result = await adapter.submitApplication({
        sourceName: name,
        externalId: job.externalId,
        answers,
        // Neither this bridge nor the Mock ATS (Phase 6) actually
        // threads a real resume file through the submission payload
        // yet -- an accepted, documented gap, not new to Phase 7.
        resumeStorageKey: "",
        coverLetter: payload.coverLetter,
        idempotencyKey: `${job.externalId}:${payload.candidateEmail}`,
      });

      return toApplicationResult(result);
    },
  };
}
