import { z } from "zod";
import { MATCH_DECISIONS } from "@jobpilot/shared";

/**
 * Schema passed to `AIProvider.generateStructured` for the job-match
 * interpretation call (section 25). Deliberately narrow: only narrative
 * fields, never numeric scores -- those are computed deterministically
 * (see @jobpilot/shared's `HybridScoreBreakdown`) and must never be
 * overwritten by an AI response.
 */
export const jobMatchInterpretationSchema = z.object({
  /** The AI's own advisory opinion -- informational only, see JobMatchInterpretation. */
  decision: z.enum(MATCH_DECISIONS).optional(),
  reasons: z.array(z.string().min(1)).default([]),
  missingRequirements: z.array(z.string().min(1)).default([]),
  riskFlags: z.array(z.string().min(1)).default([]),
});
