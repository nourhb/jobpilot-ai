import type { ApplicationForm, ApplicationFormField, ApplicationPayload, ApplicationResult, JobSourceAdapter, RawJob } from "../../base/types";
import { fetchLeverApplyForm, fetchLeverPosting, fetchLeverPostings, submitLeverApplication } from "./lever.client";
import type { LeverApplyField, LeverPosting, LeverRawJobData } from "./lever.types";

export interface LeverAdapterConfig {
  /** Lever's own URL slug for the employer, e.g. "netflix" in hire.lever.co/netflix. */
  company: string;
  /** Human-readable company name for storage; falls back to `company`. */
  companyName?: string;
}

function toRawJob(config: LeverAdapterConfig, posting: LeverPosting): RawJob {
  const payload: LeverRawJobData = { ...posting, companyName: config.companyName ?? config.company };
  return {
    sourceName: `lever:${config.company}`,
    externalId: posting.id,
    raw: payload,
    fetchedAt: new Date().toISOString(),
  };
}

const FIELD_TYPE_MAP: Record<string, ApplicationFormField["type"]> = {
  text: "TEXT",
  textarea: "TEXTAREA",
  select: "SELECT",
  "multiple-choice": "MULTI_SELECT",
  "yes-no": "BOOLEAN",
  attachment: "FILE",
};

function toFormField(field: LeverApplyField): ApplicationFormField {
  return {
    id: field.id,
    label: field.text,
    type: FIELD_TYPE_MAP[field.type] ?? "TEXT",
    required: field.required,
    options: field.options,
  };
}

/**
 * Same conventional form-field ids the Mock ATS / mock adapter already
 * use (Phase 3/6) for candidate identity, so every adapter's
 * `submitApplication` can be driven off the same `ApplicationPayload.answers`
 * map regardless of source.
 */
const FULL_NAME_FIELD_ID = "fullName";
const EMAIL_FIELD_ID = "email";

/**
 * Spec section 17 (Lever), implementing the section 14 `JobSourceAdapter`
 * contract in full -- Lever is the one source the spec explicitly says
 * supports real, documented, programmatic submission ("retrieve
 * postings", "retrieve application questions", "submit an application
 * to a published/internal posting").
 *
 * Internally organized as four responsibilities (LeverDiscoveryService /
 * LeverJobDetailsService / LeverApplicationFormService /
 * LeverApplicationService per the spec's own naming in section 17)
 * composed into one adapter object.
 *
 * The return type is deliberately narrower than plain `JobSourceAdapter`
 * (it guarantees `getApplicationForm`/`submitApplication` are present)
 * so `apps/api`'s `sourceAdapterBridge.ts` can wrap this adapter for
 * real application submission without an unsafe cast.
 */
export function createLeverAdapter(
  config: LeverAdapterConfig,
): JobSourceAdapter & Required<Pick<JobSourceAdapter, "getApplicationForm" | "submitApplication">> {
  return {
    sourceName: `lever:${config.company}`,

    // LeverDiscoveryService
    async discoverJobs(): Promise<RawJob[]> {
      const postings = await fetchLeverPostings(config.company);
      return postings.map((posting) => toRawJob(config, posting));
    },

    // LeverJobDetailsService
    async getJobDetails(externalId: string): Promise<RawJob> {
      const posting = await fetchLeverPosting(config.company, externalId);
      return toRawJob(config, posting);
    },

    // LeverApplicationFormService
    async getApplicationForm(externalId: string): Promise<ApplicationForm> {
      const form = await fetchLeverApplyForm(config.company, externalId);
      return {
        sourceName: `lever:${config.company}`,
        externalId,
        fields: form.fields.map(toFormField),
      };
    },

    // LeverApplicationService
    async submitApplication(application: ApplicationPayload): Promise<ApplicationResult> {
      const { [FULL_NAME_FIELD_ID]: fullName, [EMAIL_FIELD_ID]: email, ...customAnswers } = application.answers;

      const result = await submitLeverApplication(config.company, application.externalId, {
        name: typeof fullName === "string" ? fullName : "",
        email: typeof email === "string" ? email : "",
        comments: application.coverLetter ?? "",
        answers: Object.entries(customAnswers).map(([id, value]) => ({ id, answer: String(value) })),
      });

      if (!result.ok) {
        // Never an attempted CAPTCHA bypass -- surfaced as a status the
        // Application Engine (Phase 6) turns into MANUAL_REVIEW.
        return { status: "MANUAL_REVIEW_REQUIRED", message: result.reason ?? "Lever declined the submission.", rawResponse: result };
      }
      return { status: "SUBMITTED", externalApplicationId: result.applicationId, rawResponse: result };
    },
  };
}
