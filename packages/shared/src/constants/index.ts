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
