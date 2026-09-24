import type { JobEmploymentType, JobPreferenceUpdateInput } from "@jobpilot/shared";
import { apiRequest } from "./apiClient";

export interface JobPreferenceRecord {
  id: string;
  userId: string;
  targetTitles: string[];
  excludedTitles: string[];
  countries: string[];
  provinces: string[];
  cities: string[];
  remote: boolean;
  hybrid: boolean;
  onsite: boolean;
  minSalary: number | null;
  maxSalary: number | null;
  employmentTypes: JobEmploymentType[];
  experienceLevels: string[];
  maxDistanceKm: number | null;
  requireWorkAuthorization: boolean;
  requireNoSponsorship: boolean;
  minimumMatchScore: number;
  autoApplyEnabled: boolean;
  autoCoverLetterEnabled: boolean;
  autoQuestionAnswerEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export const preferencesService = {
  getPreferences() {
    return apiRequest<{ preferences: JobPreferenceRecord }>("/api/preferences");
  },

  updatePreferences(input: JobPreferenceUpdateInput) {
    return apiRequest<{ preferences: JobPreferenceRecord }>("/api/preferences", { method: "PUT", body: input });
  },
};
