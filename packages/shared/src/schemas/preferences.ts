import { z } from "zod";
import { JOB_EMPLOYMENT_TYPES, JOB_SOURCE_TYPES } from "../constants";

/**
 * Body for PUT /api/preferences (section 12: JobPreference). Every field
 * is optional so the endpoint behaves as a partial update -- the same
 * pattern as profileUpdateSchema -- rather than forcing the client to
 * resend the whole row on every change.
 */
export const jobPreferenceUpdateSchema = z.object({
  targetTitles: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
  excludedTitles: z.array(z.string().trim().min(1).max(200)).max(50).optional(),

  countries: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  provinces: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  cities: z.array(z.string().trim().min(1).max(100)).max(50).optional(),

  remote: z.boolean().optional(),
  hybrid: z.boolean().optional(),
  onsite: z.boolean().optional(),

  minSalary: z.number().int().min(0).max(10_000_000).nullish(),
  maxSalary: z.number().int().min(0).max(10_000_000).nullish(),

  employmentTypes: z.array(z.enum(JOB_EMPLOYMENT_TYPES)).max(10).optional(),
  experienceLevels: z.array(z.string().trim().min(1).max(50)).max(10).optional(),

  maxDistanceKm: z.number().int().min(0).max(20_000).nullish(),

  requireWorkAuthorization: z.boolean().optional(),
  requireNoSponsorship: z.boolean().optional(),

  minimumMatchScore: z.number().int().min(0).max(100).optional(),

  autoApplyEnabled: z.boolean().optional(),
  autoCoverLetterEnabled: z.boolean().optional(),
  autoQuestionAnswerEnabled: z.boolean().optional(),

  /** Phase 8 (section 39): AgentScheduler rate limits and source allowlist. */
  maxApplicationsPerDay: z.number().int().min(1).max(500).optional(),
  maxApplicationsPerHour: z.number().int().min(1).max(100).optional(),
  /** Empty = no restriction (every enabled source is eligible). */
  allowedSourceTypes: z.array(z.enum(JOB_SOURCE_TYPES)).max(JOB_SOURCE_TYPES.length).optional(),
});
export type JobPreferenceUpdateInput = z.infer<typeof jobPreferenceUpdateSchema>;
