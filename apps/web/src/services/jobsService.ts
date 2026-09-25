import type {
  JobApplicationType,
  JobEmploymentType,
  JobExperienceLevel,
  JobRemoteType,
  JobStatus,
  MatchCategory,
  MatchDecision,
} from "@jobpilot/shared";
import { apiRequest } from "./apiClient";

// Mirrors the Job Prisma model's over-the-wire shape (Dates serialize to
// ISO strings; see profileService.ts for the same convention).
export interface JobRecord {
  id: string;
  sourceId: string;
  externalId: string;
  title: string;
  company: string;
  description: string;
  descriptionHtml: string | null;
  locationRaw: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  remoteType: JobRemoteType;
  employmentType: JobEmploymentType;
  experienceLevel: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  jobUrl: string | null;
  applicationType: JobApplicationType;
  applicationUrl: string | null;
  postedAt: string | null;
  expiresAt: string | null;
  lastSeenAt: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  source?: { name: string; type: string } | null;
}

export interface JobListResult {
  items: JobRecord[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface JobListQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  remoteType?: JobRemoteType;
  employmentType?: JobEmploymentType;
  experienceLevel?: JobExperienceLevel;
  country?: string;
}

export interface JobMatchListItem {
  job: JobRecord;
  score: number;
  matchCategory: MatchCategory;
  decision: MatchDecision;
  matchedSkills: string[];
  skillsScore: number;
  titleScore: number;
}

export interface JobMatchListResult {
  profileReady: boolean;
  scanned: number;
  items: JobMatchListItem[];
}

export interface JobMatchRecord {
  id: string;
  userId: string;
  jobId: string;
  score: number;
  matchCategory: MatchCategory;
  decision: MatchDecision;
  skillsScore: number;
  experienceScore: number;
  titleScore: number;
  locationScore: number;
  authorizationScore: number;
  salaryScore: number;
  employmentTypeScore: number;
  preferencesScore: number;
  skippedReason: string | null;
  aiSuggestedDecision: string | null;
  reasons: string[];
  missingRequirements: string[];
  riskFlags: string[];
  aiModel: string | null;
  aiPromptVersion: string | null;
  createdAt: string;
  updatedAt: string;
}

function buildQueryString(params: JobListQueryParams): string {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.search) search.set("search", params.search);
  if (params.remoteType) search.set("remoteType", params.remoteType);
  if (params.employmentType) search.set("employmentType", params.employmentType);
  if (params.experienceLevel) search.set("experienceLevel", params.experienceLevel);
  if (params.country) search.set("country", params.country);
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const jobsService = {
  listJobs(params: JobListQueryParams = {}) {
    return apiRequest<JobListResult>(`/api/jobs${buildQueryString(params)}`);
  },

  getJob(id: string) {
    return apiRequest<{ job: JobRecord }>(`/api/jobs/${id}`);
  },

  getJobMatch(id: string) {
    return apiRequest<{ match: JobMatchRecord }>(`/api/jobs/${id}/match`);
  },

  listMatches() {
    return apiRequest<JobMatchListResult>("/api/jobs/matches");
  },
};
