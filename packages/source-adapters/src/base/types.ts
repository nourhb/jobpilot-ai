/**
 * Contract every job source (Greenhouse, Lever, Ashby, Workable, a bespoke
 * company API) must implement identically, so the discovery/application
 * engine never needs to know which source it is talking to.
 *
 * NOTE: This file defines the shared contract only. Concrete adapters
 * (GreenhouseAdapter, LeverAdapter, AshbyAdapter, WorkableAdapter,
 * CompanyAdapter) are implemented in Phase 7, once job discovery,
 * normalization and the application engine exist to consume them.
 */

export interface RawJob {
  sourceName: string;
  externalId: string;
  /** Unmodified payload as received from the source, kept for audit/debugging. */
  raw: unknown;
  fetchedAt: string;
}

export type ApplicationFieldType =
  | "TEXT"
  | "TEXTAREA"
  | "EMAIL"
  | "PHONE"
  | "SELECT"
  | "MULTI_SELECT"
  | "BOOLEAN"
  | "FILE"
  | "DATE";

export interface ApplicationFormField {
  id: string;
  label: string;
  type: ApplicationFieldType;
  required: boolean;
  options?: string[];
}

export interface ApplicationForm {
  sourceName: string;
  externalId: string;
  fields: ApplicationFormField[];
}

export interface ApplicationPayload {
  sourceName: string;
  externalId: string;
  answers: Record<string, string | string[] | boolean>;
  resumeStorageKey: string;
  coverLetter?: string;
  idempotencyKey: string;
}

export type ApplicationSubmitStatus = "SUBMITTED" | "FAILED" | "MANUAL_REVIEW_REQUIRED";

export interface ApplicationResult {
  status: ApplicationSubmitStatus;
  externalApplicationId?: string;
  message?: string;
  rawResponse?: unknown;
}

/**
 * Every adapter implements discovery + detail retrieval. `getApplicationForm`
 * and `submitApplication` are optional because some sources only support
 * MANUAL_REVIEW (see docs/architecture.md, "Application Router").
 */
export interface JobSourceAdapter {
  readonly sourceName: string;

  discoverJobs(): Promise<RawJob[]>;

  getJobDetails(externalId: string): Promise<RawJob>;

  getApplicationForm?(externalId: string): Promise<ApplicationForm>;

  submitApplication?(application: ApplicationPayload): Promise<ApplicationResult>;
}

export interface SourceRateLimit {
  requestsPerMinute: number;
  concurrency: number;
}
