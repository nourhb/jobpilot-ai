import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export const jobPreferenceRepository = {
  /** Every user gets exactly one JobPreference row, created lazily on first access -- same pattern as Profile. */
  async getOrCreateForUser(userId: string) {
    const existing = await prisma.jobPreference.findUnique({ where: { userId } });
    if (existing) return existing;
    return prisma.jobPreference.create({ data: { userId } });
  },

  update(userId: string, data: Prisma.JobPreferenceUpdateInput) {
    return prisma.jobPreference.update({ where: { userId }, data });
  },

  /** Phase 8: AgentScheduler only auto-enqueues applications for users who opted in. */
  listAutoApplyEnabled() {
    return prisma.jobPreference.findMany({ where: { autoApplyEnabled: true } });
  },
};
