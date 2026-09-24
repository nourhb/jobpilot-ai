import { z } from "zod";

/**
 * Section 37 (Anti-Fabrication Validator). Matches the spec's own
 * example output shape exactly: `{ valid, unsupportedClaims, confidence }`.
 * `valid === false` must BLOCK the answer -- see factChecker.ts.
 */
export const factCheckResultSchema = z.object({
  valid: z.boolean(),
  unsupportedClaims: z.array(z.string().min(1)).default([]),
  confidence: z.number().min(0).max(1),
});
