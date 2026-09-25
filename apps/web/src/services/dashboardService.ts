import { apiRequest } from "./apiClient";

export interface DashboardOverview {
  agentStatus: string;
  autoApplyEnabled: boolean;
  jobsScanned: number;
  matching: number;
  applications: number;
  submitted: number;
  manualReview: number;
  rejected: number;
}

export interface AnalyticsPayload {
  applicationsByStatus: Record<string, number>;
  matchesByDecision: Record<string, number>;
  applicationsLast7Days: Array<{ date: string; count: number }>;
}

export const dashboardService = {
  getOverview() {
    return apiRequest<{ overview: DashboardOverview }>("/api/dashboard");
  },

  getAnalytics() {
    return apiRequest<{ analytics: AnalyticsPayload }>("/api/dashboard/analytics");
  },
};
