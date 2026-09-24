import type {
  CertificationInput,
  EducationInput,
  ProfileUpdateInput,
  RemotePreference,
  SkillInput,
  VerifiedCandidateProfile,
  VerifyProfileItemsInput,
  WorkAuthorizationStatus,
  WorkExperienceInput,
} from "@jobpilot/shared";
import { apiRequest } from "./apiClient";

// The API's Prisma models serialize Date fields as ISO strings over the
// wire -- these types describe what actually arrives in the browser
// rather than reusing the server-side Prisma types.
export interface ProfileRecord {
  id: string;
  userId: string;
  professionalSummary: string | null;
  yearsOfExperience: number | null;
  workAuthorization: WorkAuthorizationStatus | null;
  requiresSponsorship: boolean;
  willingToRelocate: boolean;
  remotePreference: RemotePreference | null;
  desiredJobTitles: string[];
  minimumSalary: number | null;
  maximumSalary: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkExperienceRecord {
  id: string;
  company: string;
  jobTitle: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
  source: "MANUAL" | "RESUME_PARSED";
  verified: boolean;
}

export interface EducationRecord {
  id: string;
  institution: string;
  degree: string;
  field: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  source: "MANUAL" | "RESUME_PARSED";
  verified: boolean;
}

export interface SkillRecord {
  id: string;
  name: string;
  category: string | null;
  proficiency: string | null;
  yearsExperience: number | null;
  source: "MANUAL" | "RESUME_PARSED";
  verified: boolean;
}

export interface CertificationRecord {
  id: string;
  name: string;
  issuer: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  source: "MANUAL" | "RESUME_PARSED";
  verified: boolean;
}

export interface ResumeRecord {
  id: string;
  originalFilename: string;
  version: number;
  isActive: boolean;
  confidenceScore: number;
  reviewRequired: boolean;
  createdAt: string;
}

/** The API returns the Profile scalar fields alongside its relations, flattened. */
export interface FullProfile extends ProfileRecord {
  resumes: ResumeRecord[];
  workExperiences: WorkExperienceRecord[];
  educations: EducationRecord[];
  skills: SkillRecord[];
  certifications: CertificationRecord[];
}

export const profileService = {
  getProfile(): Promise<{ profile: FullProfile }> {
    return apiRequest<{ profile: FullProfile }>("/api/profile");
  },

  updateProfile(input: ProfileUpdateInput): Promise<{ profile: ProfileRecord }> {
    return apiRequest<{ profile: ProfileRecord }>("/api/profile", { method: "PUT", body: input });
  },

  getVerifiedCandidateProfile(): Promise<{ verifiedCandidateProfile: VerifiedCandidateProfile }> {
    return apiRequest<{ verifiedCandidateProfile: VerifiedCandidateProfile }>("/api/profile/verified");
  },

  verifyItems(input: VerifyProfileItemsInput): Promise<{ message: string }> {
    return apiRequest<{ message: string }>("/api/profile/verify", { method: "POST", body: input });
  },

  listResumes(): Promise<{ resumes: ResumeRecord[] }> {
    return apiRequest<{ resumes: ResumeRecord[] }>("/api/profile/resume");
  },

  uploadResume(file: File): Promise<{ resume: ResumeRecord }> {
    const formData = new FormData();
    formData.append("file", file);
    return apiRequest<{ resume: ResumeRecord }>("/api/profile/resume", { method: "POST", body: formData });
  },

  deleteResume(id: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/api/profile/resume/${id}`, { method: "DELETE" });
  },

  addExperience(input: WorkExperienceInput): Promise<{ experience: WorkExperienceRecord }> {
    return apiRequest<{ experience: WorkExperienceRecord }>("/api/profile/experience", {
      method: "POST",
      body: input,
    });
  },

  updateExperience(id: string, input: WorkExperienceInput): Promise<{ experience: WorkExperienceRecord }> {
    return apiRequest<{ experience: WorkExperienceRecord }>(`/api/profile/experience/${id}`, {
      method: "PUT",
      body: input,
    });
  },

  deleteExperience(id: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/api/profile/experience/${id}`, { method: "DELETE" });
  },

  addEducation(input: EducationInput): Promise<{ education: EducationRecord }> {
    return apiRequest<{ education: EducationRecord }>("/api/profile/education", { method: "POST", body: input });
  },

  updateEducation(id: string, input: EducationInput): Promise<{ education: EducationRecord }> {
    return apiRequest<{ education: EducationRecord }>(`/api/profile/education/${id}`, {
      method: "PUT",
      body: input,
    });
  },

  deleteEducation(id: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/api/profile/education/${id}`, { method: "DELETE" });
  },

  addSkill(input: SkillInput): Promise<{ skill: SkillRecord }> {
    return apiRequest<{ skill: SkillRecord }>("/api/profile/skills", { method: "POST", body: input });
  },

  updateSkill(id: string, input: SkillInput): Promise<{ skill: SkillRecord }> {
    return apiRequest<{ skill: SkillRecord }>(`/api/profile/skills/${id}`, { method: "PUT", body: input });
  },

  deleteSkill(id: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/api/profile/skills/${id}`, { method: "DELETE" });
  },

  addCertification(input: CertificationInput): Promise<{ certification: CertificationRecord }> {
    return apiRequest<{ certification: CertificationRecord }>("/api/profile/certifications", {
      method: "POST",
      body: input,
    });
  },

  updateCertification(id: string, input: CertificationInput): Promise<{ certification: CertificationRecord }> {
    return apiRequest<{ certification: CertificationRecord }>(`/api/profile/certifications/${id}`, {
      method: "PUT",
      body: input,
    });
  },

  deleteCertification(id: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/api/profile/certifications/${id}`, { method: "DELETE" });
  },
};
