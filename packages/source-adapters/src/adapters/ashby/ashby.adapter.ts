import type { ApplicationForm, ApplicationFormField, ApplicationPayload, ApplicationResult, JobSourceAdapter, RawJob } from "../../base/types";
import { fetchAshbyApplicationForm, fetchAshbyJobBoard, submitAshbyApplication } from "./ashby.client";
import type { AshbyApplicationField, AshbyJobPosting, AshbyRawJobData } from "./ashby.types";

export interface AshbyAdapterConfig {
  /** Ashby's own public job-board identifier, e.g. "acmeco". */
  jobBoardName: string;
}

function toRawJob(config: AshbyAdapterConfig, organizationName: string, job: AshbyJobPosting): RawJob {
  const payload: AshbyRawJobData = { ...job, organizationName };
  return {
    sourceName: `ashby:${config.jobBoardName}`,
    externalId: job.id,
    raw: payload,
    fetchedAt: new Date().toISOString(),
  };
}

const FIELD_TYPE_MAP: Record<string, ApplicationFormField["type"]> = {
  Text: "TEXT",
  LongText: "TEXTAREA",
  Email: "EMAIL",
  Phone: "PHONE",
  SingleSelect: "SELECT",
  MultiSelect: "MULTI_SELECT",
  Boolean: "BOOLEAN",
  File: "FILE",
};

function toFormField(field: AshbyApplicationField): ApplicationFormField {
  return {
    id: field.id,
    label: field.label,
    type: FIELD_TYPE_MAP[field.type] ?? "TEXT",
    required: field.isRequired,
    options: field.options,
  };
}

const FULL_NAME_FIELD_ID = "fullName";
const EMAIL_FIELD_ID = "email";

/**
 * Spec section 18 (Ashby), implementing the section 14 `JobSourceAdapter`
 * contract in full -- like Lever, the spec explicitly describes Ashby's
 * public API as supporting form retrieval and submission ("retrieving
 * the application form specification, and using the form to submit
 * applications").
 *
 * Internally organized as four responsibilities (AshbyDiscoveryService /
 * AshbyJobDetailsService / AshbyApplicationFormService /
 * AshbyApplicationService per the spec's own naming in section 18)
 * composed into one adapter object. `getJobDetails` re-fetches the
 * whole board since Ashby's public API has no per-job detail endpoint.
 *
 * The return type is deliberately narrower than plain `JobSourceAdapter`
 * (it guarantees `getApplicationForm`/`submitApplication` are present)
 * so `apps/api`'s `sourceAdapterBridge.ts` can wrap this adapter for
 * real application submission without an unsafe cast.
 */
export function createAshbyAdapter(
  config: AshbyAdapterConfig,
): JobSourceAdapter & Required<Pick<JobSourceAdapter, "getApplicationForm" | "submitApplication">> {
  return {
    sourceName: `ashby:${config.jobBoardName}`,
    rateLimit: { requestsPerMinute: 30, concurrency: 2 },

    // AshbyDiscoveryService
    async discoverJobs(): Promise<RawJob[]> {
      const board = await fetchAshbyJobBoard(config.jobBoardName);
      return board.jobs.map((job) => toRawJob(config, board.organizationName, job));
    },

    // AshbyJobDetailsService
    async getJobDetails(externalId: string): Promise<RawJob> {
      const board = await fetchAshbyJobBoard(config.jobBoardName);
      const job = board.jobs.find((j) => j.id === externalId);
      if (!job) {
        throw new Error(`Ashby job "${externalId}" was not found on board "${config.jobBoardName}".`);
      }
      return toRawJob(config, board.organizationName, job);
    },

    // AshbyApplicationFormService
    async getApplicationForm(externalId: string): Promise<ApplicationForm> {
      const form = await fetchAshbyApplicationForm(config.jobBoardName, externalId);
      return {
        sourceName: `ashby:${config.jobBoardName}`,
        externalId,
        fields: form.fields.map(toFormField),
      };
    },

    // AshbyApplicationService
    async submitApplication(application: ApplicationPayload): Promise<ApplicationResult> {
      const { [FULL_NAME_FIELD_ID]: fullName, [EMAIL_FIELD_ID]: email, ...customAnswers } = application.answers;

      const result = await submitAshbyApplication(config.jobBoardName, application.externalId, {
        name: typeof fullName === "string" ? fullName : "",
        email: typeof email === "string" ? email : "",
        coverLetter: application.coverLetter ?? "",
        answers: Object.entries(customAnswers).map(([fieldId, value]) => ({ fieldId, value: String(value) })),
      });

      if (!result.success) {
        return { status: "MANUAL_REVIEW_REQUIRED", message: result.errorCode ?? "Ashby declined the submission.", rawResponse: result };
      }
      return { status: "SUBMITTED", externalApplicationId: result.applicationId, rawResponse: result };
    },
  };
}
