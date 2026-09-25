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

  /** Phase 8: users who opted into auto-apply. */
  listAutoApplyEnabled() {
    return prisma.jobPreference.findMany({ where: { autoApplyEnabled: true } });
  },

  /** Phase 9: scheduler only runs for opted-in users whose agent is RUNNING. */
  listRunnable() {
    return prisma.jobPreference.findMany({ where: { autoApplyEnabled: true, agentStatus: "RUNNING" } });
  },
};
