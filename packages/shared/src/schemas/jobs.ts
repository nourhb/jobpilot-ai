import { z } from "zod";
import { JOB_EMPLOYMENT_TYPES, JOB_REMOTE_TYPES } from "../constants";

/**
 * GET /api/jobs query params. Shared between apps/web (form/filter state)
 * and apps/api (request validation) so filtering rules are defined once
 * (Cursor rule #19: never duplicate business logic between frontend and
 * backend).
 */
export const jobListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  remoteType: z.enum(JOB_REMOTE_TYPES).optional(),
  employmentType: z.enum(JOB_EMPLOYMENT_TYPES).optional(),
  country: z.string().trim().max(100).optional(),
});
export type JobListQuery = z.infer<typeof jobListQuerySchema>;
