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

/**
 * Phase 3 (section 19: Job Normalization) -- every job source returns a
 * different format; discovery normalizes everything down to these fixed
 * vocabularies before storage. Kept in sync by hand with the Prisma
 * enums `RemoteType` / `JobEmploymentType` / `JobApplicationType` /
 * `JobStatus` / `JobSourceType`.
 */
export const JOB_REMOTE_TYPES = ["REMOTE", "HYBRID", "ONSITE", "UNKNOWN"] as const;
export type JobRemoteType = (typeof JOB_REMOTE_TYPES)[number];

export const JOB_EMPLOYMENT_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "TEMPORARY",
  "INTERNSHIP",
  "UNKNOWN",
] as const;
export type JobEmploymentType = (typeof JOB_EMPLOYMENT_TYPES)[number];

export const JOB_APPLICATION_TYPES = ["API", "PUBLIC_FORM", "MANUAL", "UNKNOWN"] as const;
export type JobApplicationType = (typeof JOB_APPLICATION_TYPES)[number];

/** ACTIVE jobs are eligible for matching/application; see spec section 65. */
export const JOB_STATUSES = ["ACTIVE", "EXPIRED", "REMOVED"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/** See packages/source-adapters -- one JobSourceAdapter implementation per value. */
export const JOB_SOURCE_TYPES = ["GREENHOUSE", "LEVER", "ASHBY", "WORKABLE", "COMPANY", "MOCK"] as const;
export type JobSourceTypeName = (typeof JOB_SOURCE_TYPES)[number];

/**
 * Phase 4 (section 28: Match Categories) -- fixed system thresholds, not
 * user-configurable. Kept in sync by hand with the Prisma enum
 * `MatchCategory`. See apps/api/src/matching/scoring.ts for the score ->
 * category mapping (90-100 EXCELLENT, 80-89 STRONG, 70-79 POTENTIAL,
 * <70 LOW).
 */
export const MATCH_CATEGORIES = ["EXCELLENT", "STRONG", "POTENTIAL", "LOW"] as const;
export type MatchCategory = (typeof MATCH_CATEGORIES)[number];

/**
 * The system's own authoritative decision (score vs. the user's
 * JobPreference.minimumMatchScore, or SKIP from a hard filter) -- never
 * the AI provider's own advisory opinion. Kept in sync by hand with the
 * Prisma enum `MatchDecision`.
 */
export const MATCH_DECISIONS = ["APPLY", "REVIEW", "SKIP"] as const;
export type MatchDecision = (typeof MATCH_DECISIONS)[number];

/**
 * Phase 5 (section 31: Application Question Engine). Every application
 * question is classified into exactly one of these before any answer is
 * attempted. LEGAL and the *_FACT/YES_NO_FACT/PREFERENCE categories are
 * answered by direct retrieval from the verified profile (never the AI);
 * MOTIVATIONAL is the only category ever routed through the AI provider,
 * and even then only after the answer passes the Fact Checker (section
 * 37). HIGH_RISK is always blocked outright; UNKNOWN is blocked whenever
 * fact retrieval comes back empty, per section 32 ("do not guess").
 */
/**
 * Phase 6 (section 34 + the master prompt's own "APPLICATION STATES"
 * list, combined into a single enum). Kept in sync by hand with the
 * Prisma enum `ApplicationStatus`. An Application is only ever created
 * once a JobMatch already exists (decision APPLY or REVIEW) -- see
 * apps/api/src/applications/application.service.ts -- so in practice
 * every Application starts life at QUALIFIED; DISCOVERED/NORMALIZED/
 * MATCHED are kept in the enum for spec fidelity and to leave room for
 * a future worker that persists the whole pipeline from the start.
 */
export const APPLICATION_STATUSES = [
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
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const QUESTION_CATEGORIES = [
  "PROFILE_FACT",
  "EXPERIENCE_FACT",
  "EDUCATION_FACT",
  "YES_NO_FACT",
  "PREFERENCE",
  "MOTIVATIONAL",
  "UNKNOWN",
  "LEGAL",
  "HIGH_RISK",
] as const;
export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number];

/** Phase 9 (section 48). Kept in sync with the Prisma `AgentStatus` enum. */
export const AGENT_STATUSES = ["RUNNING", "PAUSED", "STOPPED", "ERROR"] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

/** Phase 9 (section 50). In-app notification types. */
export const NOTIFICATION_TYPES = [
  "APPLICATION_SUBMITTED",
  "APPLICATION_FAILED",
  "MANUAL_REVIEW_REQUIRED",
  "INTERVIEW_DETECTED",
  "JOB_REMOVED",
  "AGENT_STOPPED",
  "AI_PROVIDER_UNAVAILABLE",
  "SOURCE_UNAVAILABLE",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
