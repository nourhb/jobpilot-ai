import type { ApplicationForm, ApplicationFormField, JobSourceAdapter, RawJob } from "../../base/types";
import { fetchGreenhouseJobDetail, fetchGreenhouseJobs } from "./greenhouse.client";
import type { GreenhouseJobDetail, GreenhouseJobSummary, GreenhouseQuestion, GreenhouseRawJobData } from "./greenhouse.types";

export interface GreenhouseAdapterConfig {
  /** Greenhouse's own per-employer board identifier, e.g. "acmeco". */
  boardToken: string;
  /** Human-readable company name for storage; falls back to `boardToken`. */
  companyName?: string;
}

function toRawJob(config: GreenhouseAdapterConfig, data: GreenhouseJobSummary | GreenhouseJobDetail): RawJob {
  const payload: GreenhouseRawJobData = { ...data, companyName: config.companyName ?? config.boardToken };
  return {
    sourceName: `greenhouse:${config.boardToken}`,
    externalId: String(data.id),
    raw: payload,
    fetchedAt: new Date().toISOString(),
  };
}

const FIELD_TYPE_MAP: Record<string, ApplicationFormField["type"]> = {
  input_text: "TEXT",
  textarea: "TEXTAREA",
  multi_value_single_select: "SELECT",
  multi_value_multi_select: "MULTI_SELECT",
  yes_no: "BOOLEAN",
  attachment: "FILE",
};

function toFormField(question: GreenhouseQuestion): ApplicationFormField {
  const field = question.fields[0];
  return {
    id: field?.name ?? question.label,
    label: question.label,
    type: FIELD_TYPE_MAP[field?.type ?? ""] ?? "TEXT",
    required: question.required,
    options: field?.values?.map((value) => value.label),
  };
}

/**
 * Spec section 16 (Greenhouse) implementing the section 14
 * `JobSourceAdapter` contract.
 *
 * `discoverJobs`/`getJobDetails`/`getApplicationForm` are all backed by
 * Greenhouse's real public Job Board API (greenhouse.client.ts).
 *
 * `submitApplication` is deliberately NOT implemented (left undefined).
 * The public Job Board API is read-only; actually submitting a
 * Greenhouse application requires a private, employer-issued Harvest
 * API key this project does not (and should not) have. A
 * Greenhouse-sourced job therefore always has no submission adapter,
 * which `application.service.ts` / `resolveApplicationAdapter` (Phase 6)
 * correctly turns into MANUAL_REVIEW -- "if an application cannot
 * safely or legitimately be automated, create a MANUAL_REVIEW task."
 */
export function createGreenhouseAdapter(config: GreenhouseAdapterConfig): JobSourceAdapter {
  return {
    sourceName: `greenhouse:${config.boardToken}`,

    async discoverJobs(): Promise<RawJob[]> {
      const { jobs } = await fetchGreenhouseJobs(config.boardToken);
      return jobs.map((job) => toRawJob(config, job));
    },

    async getJobDetails(externalId: string): Promise<RawJob> {
      const detail = await fetchGreenhouseJobDetail(config.boardToken, externalId);
      return toRawJob(config, detail);
    },

    async getApplicationForm(externalId: string): Promise<ApplicationForm> {
      const detail = await fetchGreenhouseJobDetail(config.boardToken, externalId);
      return {
        sourceName: `greenhouse:${config.boardToken}`,
        externalId,
        fields: (detail.questions ?? []).map(toFormField),
      };
    },
  };
}
