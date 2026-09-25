import { z } from "zod";
import {
  JOB_COUNTRY_FILTERS,
  JOB_DOMAINS,
  JOB_EMPLOYMENT_TYPES,
  JOB_EXPERIENCE_LEVELS,
  JOB_FIELDS,
  JOB_REMOTE_TYPES,
} from "../constants";

/**
 * GET /api/jobs query params. Shared between apps/web (form/filter state)
 * and apps/api (request validation) so filtering rules are defined once
 * (Cursor rule #19: never duplicate business logic between frontend and
 * backend).
 */
export const jobListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(250).default(20),
  search: z.string().trim().max(200).optional(),
  remoteType: z.enum(JOB_REMOTE_TYPES).optional(),
  employmentType: z.enum(JOB_EMPLOYMENT_TYPES).optional(),
  experienceLevel: z.enum(JOB_EXPERIENCE_LEVELS).optional(),
  country: z.enum(JOB_COUNTRY_FILTERS).or(z.string().trim().max(100)).optional(),
  field: z.enum(JOB_FIELDS).optional(),
  domain: z.enum(JOB_DOMAINS).optional(),
});
export type JobListQuery = z.infer<typeof jobListQuerySchema>;
