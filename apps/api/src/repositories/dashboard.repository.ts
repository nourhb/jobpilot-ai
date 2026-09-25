import { prisma } from "../lib/prisma";

export const dashboardRepository = {
  countActiveJobs() {
    return prisma.job.count({ where: { status: "ACTIVE" } });
  },

  countMatches(userId: string) {
    return prisma.jobMatch.count({ where: { userId } });
  },

  countApplications(userId: string) {
    return prisma.application.count({ where: { userId } });
  },

  countApplicationsByStatus(userId: string, status: "MANUAL_REVIEW" | "SUBMITTED") {
    return prisma.application.count({ where: { userId, status } });
  },

  countSkippedMatches(userId: string) {
    return prisma.jobMatch.count({ where: { userId, decision: "SKIP" } });
  },

  groupApplicationsByStatus(userId: string) {
    return prisma.application.groupBy({ by: ["status"], where: { userId }, _count: { _all: true } });
  },

  groupMatchesByDecision(userId: string) {
    return prisma.jobMatch.groupBy({ by: ["decision"], where: { userId }, _count: { _all: true } });
  },

  listApplicationCreatedAtSince(userId: string, since: Date) {
    return prisma.application.findMany({ where: { userId, createdAt: { gte: since } }, select: { createdAt: true } });
  },

  listRecentApplicationEvents(userId: string, take = 50) {
    return prisma.applicationEvent.findMany({
      where: { application: { userId } },
      orderBy: { createdAt: "desc" },
      take,
      include: { application: { include: { job: { select: { title: true, company: true } } } } },
    });
  },
};
