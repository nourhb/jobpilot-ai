import { jobPreferenceRepository } from "../repositories/jobPreference.repository";
import { dashboardRepository } from "../repositories/dashboard.repository";

/**
 * Phase 9 (sections 43 + analytics). Aggregates already-persisted
 * Job / JobMatch / Application rows -- never asks the LLM for a count.
 */
export const dashboardService = {
  async getOverview(userId: string) {
    const [preferences, jobsScanned, matching, applications, manualReview, rejectedMatches, submitted] = await Promise.all([
      jobPreferenceRepository.getOrCreateForUser(userId),
      dashboardRepository.countActiveJobs(),
      dashboardRepository.countMatches(userId),
      dashboardRepository.countApplications(userId),
      dashboardRepository.countApplicationsByStatus(userId, "MANUAL_REVIEW"),
      dashboardRepository.countSkippedMatches(userId),
      dashboardRepository.countApplicationsByStatus(userId, "SUBMITTED"),
    ]);

    return {
      agentStatus: preferences.agentStatus,
      autoApplyEnabled: preferences.autoApplyEnabled,
      jobsScanned,
      matching,
      applications,
      submitted,
      manualReview,
      rejected: rejectedMatches,
    };
  },

  async getAnalytics(userId: string) {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [applications, matches, recent] = await Promise.all([
      dashboardRepository.groupApplicationsByStatus(userId),
      dashboardRepository.groupMatchesByDecision(userId),
      dashboardRepository.listApplicationCreatedAtSince(userId, since),
    ]);

    const byDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i -= 1) {
      const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      byDay[day] = 0;
    }
    for (const row of recent) {
      const day = row.createdAt.toISOString().slice(0, 10);
      if (day in byDay) byDay[day] = (byDay[day] ?? 0) + 1;
    }

    return {
      applicationsByStatus: Object.fromEntries(applications.map((row) => [row.status, row._count._all])),
      matchesByDecision: Object.fromEntries(matches.map((row) => [row.decision, row._count._all])),
      applicationsLast7Days: Object.entries(byDay).map(([date, count]) => ({ date, count })),
    };
  },
};
