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

// ---------------------------------------------------------------------
// PHASE 3: Job normalization (spec section 19).
//
// Every source's RawJob.raw payload is source-specific. The discovery
// pipeline (apps/api/src/jobs/jobDiscovery.service.ts) converts each one
// to this single shape via `normalizeRawJob` (../normalize) before
// deduplication/storage, so nothing downstream needs to know which
// source a job came from.
// ---------------------------------------------------------------------

/**
 * Mirrors the Prisma `JobSourceType` enum (prisma/schema.prisma) as a
 * plain string union, deliberately duplicated rather than imported so
 * this package never depends on `@prisma/client` (adapters must stay
 * usable outside the API process, e.g. from a worker or a script).
 */
export type JobSourceTypeName = "GREENHOUSE" | "LEVER" | "ASHBY" | "WORKABLE" | "COMPANY" | "MOCK";

export type NormalizedRemoteType = "REMOTE" | "HYBRID" | "ONSITE" | "UNKNOWN";
export type NormalizedEmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "TEMPORARY" | "INTERNSHIP" | "UNKNOWN";
export type NormalizedApplicationType = "API" | "PUBLIC_FORM" | "MANUAL" | "UNKNOWN";

export interface NormalizedJob {
  externalId: string;

  title: string;
  company: string;
  description: string;
  descriptionHtml?: string;

  location: {
    raw?: string;
    city?: string;
    province?: string;
    country?: string;
  };

  remoteType: NormalizedRemoteType;
  employmentType: NormalizedEmploymentType;
  experienceLevel?: string;

  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: string;
  };

  jobUrl?: string;
  application: {
    type: NormalizedApplicationType;
    url?: string;
  };

  postedAt?: string;
  expiresAt?: string;

  /** Unmodified payload, carried through from RawJob for audit/re-normalization. */
  raw: unknown;
}
