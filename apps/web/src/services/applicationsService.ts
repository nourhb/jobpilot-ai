import { apiRequest } from "./apiClient";

export interface ApplicationJob {
  id: string;
  title: string;
  company: string;
  city: string | null;
  province: string | null;
  country: string | null;
  remoteType: string;
  jobUrl?: string | null;
  applicationUrl?: string | null;
}

export interface ApplicationListItem {
  id: string;
  status: string;
  matchScore: number;
  matchCategory: string;
  submittedAt: string | null;
  createdAt: string;
  job: ApplicationJob;
}

export interface ApplicationAnswer {
  id: string;
  questionText: string;
  category: string;
  status: string;
  answer: string | null;
  source: string | null;
  blockedReason: string | null;
}

export interface ApplicationEvent {
  id: string;
  status: string;
  message: string | null;
  createdAt: string;
}

export interface ApplicationDetail extends ApplicationListItem {
  manualReviewReason: string | null;
  blockedReason: string | null;
  failureReason: string | null;
  jobSnapshot: Record<string, unknown>;
  candidateSnapshot: Record<string, unknown>;
  coverLetter: { content: string; model: string; promptVersion: string } | null;
  answers: ApplicationAnswer[];
  events: ApplicationEvent[];
}

export const applicationsService = {
  list(status?: string) {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return apiRequest<{ items: ApplicationListItem[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>(
      `/api/applications${query}`,
    );
  },

  getById(id: string) {
    return apiRequest<{ application: ApplicationDetail }>(`/api/applications/${id}`);
  },

  create(jobId: string) {
    return apiRequest<{ application: ApplicationDetail }>("/api/applications", { method: "POST", body: { jobId } });
  },

  retry(id: string) {
    return apiRequest<{ application: ApplicationDetail }>(`/api/applications/${id}/retry`, { method: "POST" });
  },

  skip(id: string) {
    return apiRequest<{ application: ApplicationDetail }>(`/api/applications/${id}/skip`, { method: "POST" });
  },

  markSubmitted(id: string) {
    return apiRequest<{ application: ApplicationDetail }>(`/api/applications/${id}/mark-submitted`, { method: "POST" });
  },
};
