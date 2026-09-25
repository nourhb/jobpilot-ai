import { z } from "zod";
import { APPLICATION_STATUSES } from "../constants";

/**
 * GET /api/applications query params (section 44's Applications Page
 * filters).
 */
export const applicationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(APPLICATION_STATUSES).optional(),
});
export type ApplicationListQuery = z.infer<typeof applicationListQuerySchema>;

export const createApplicationSchema = z.object({
  jobId: z.string().uuid(),
});
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
