/**
 * Spec section 40 (BullMQ Queues). These names are the public contract
 * between the API process (which may enqueue) and the worker process
 * (which consumes). Keep them stable -- existing repeatable jobs in
 * Redis are keyed by queue name.
 *
 * Not every named queue has its own worker. Discovery already includes
 * normalization (Phase 3); the Application Engine (Phase 6) already
 * runs cover-letter -> questions -> validation -> policy -> submit as
 * one structural pipeline so there is never an `LLM -> Submit` hop.
 * Splitting that pipeline across queues would re-introduce the exact
 * risk section 77 exists to prevent. Those finer-grained names still
 * exist here so dashboards/metrics can refer to the spec's vocabulary.
 */
export const QUEUE_NAMES = {
  JOB_DISCOVERY: "job-discovery",
  JOB_NORMALIZATION: "job-normalization",
  JOB_MATCHING: "job-matching",
  COVER_LETTER_GENERATION: "cover-letter-generation",
  APPLICATION_PREPARATION: "application-preparation",
  APPLICATION_VALIDATION: "application-validation",
  APPLICATION_SUBMISSION: "application-submission",
  APPLICATION_VERIFICATION: "application-verification",
  NOTIFICATIONS: "notifications",
  AGENT_TICK: "agent-tick",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const BULLMQ_PREFIX = "jobpilot";
