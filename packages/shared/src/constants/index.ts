export const APP_NAME = "JobPilot AI";

/**
 * Application state machine (see docs/architecture.md).
 * Defined centrally now because both the API (Phase 6+) and the future
 * dashboard UI will need the exact same set of values. No business logic
 * lives here yet -- only the vocabulary.
 */
export const APPLICATION_STATES = [
  "DISCOVERED",
  "NORMALIZED",
  "MATCHED",
  "QUALIFIED",
  "PREPARING",
  "VALIDATING",
  "READY",
  "SUBMITTING",
  "SUBMITTED",
  "MANUAL_REVIEW",
  "BLOCKED",
  "FAILED",
  "SKIPPED",
  "DUPLICATE",
  "EXPIRED",
] as const;

export type ApplicationState = (typeof APPLICATION_STATES)[number];

/**
 * Single source of truth for the work-authorization options shown in the
 * UI (section 7 of the spec: "Do not hard-code these values" across the
 * frontend). The Prisma enum `WorkAuthorizationStatus` and the Zod schema
 * below are both kept in sync with this list by hand -- if you add a
 * value here, add it to prisma/schema.prisma too and run a migration.
 */
export const WORK_AUTHORIZATION_STATUSES = [
  "CANADIAN_CITIZEN",
  "PERMANENT_RESIDENT",
  "OPEN_WORK_PERMIT",
  "CLOSED_WORK_PERMIT",
  "STUDENT_PERMIT",
  "REQUIRES_SPONSORSHIP",
  "OTHER",
] as const;

export type WorkAuthorizationStatus = (typeof WORK_AUTHORIZATION_STATUSES)[number];

export const WORK_AUTHORIZATION_LABELS: Record<WorkAuthorizationStatus, string> = {
  CANADIAN_CITIZEN: "Canadian citizen",
  PERMANENT_RESIDENT: "Permanent resident",
  OPEN_WORK_PERMIT: "Open work permit",
  CLOSED_WORK_PERMIT: "Closed (employer-specific) work permit",
  STUDENT_PERMIT: "Study permit with work eligibility",
  REQUIRES_SPONSORSHIP: "Requires visa sponsorship",
  OTHER: "Other",
};

export const REMOTE_PREFERENCES = ["REMOTE", "HYBRID", "ONSITE", "ANY"] as const;
export type RemotePreference = (typeof REMOTE_PREFERENCES)[number];

/**
 * Suggested skill categories only -- never a restrictive whitelist. The
 * resume parser and manual entry both accept any free-text skill name;
 * this list just powers a helpful autocomplete/category dropdown.
 */
export const COMMON_SKILL_CATEGORIES = [
  "Programming Language",
  "Framework",
  "Cloud",
  "DevOps",
  "Database",
  "Operating System",
  "Tool",
  "Soft Skill",
  "Other",
] as const;
