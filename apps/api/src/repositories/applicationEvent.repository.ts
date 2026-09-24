import type { ApplicationStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";

export const applicationEventRepository = {
  /** Section 45's "TIMELINE" -- append-only, never updated or deleted. */
  record(applicationId: string, status: ApplicationStatus, message?: string) {
    return prisma.applicationEvent.create({ data: { applicationId, status, message } });
  },

  listByApplicationId(applicationId: string) {
    return prisma.applicationEvent.findMany({ where: { applicationId }, orderBy: { createdAt: "asc" } });
  },
};
