import type { RemotePreference, WorkAuthorizationStatus } from "../constants";

/**
 * Section 24 of the spec: "This is the only object allowed to feed
 * application answers." Built exclusively from rows where
 * `verified === true` (see apps/api/src/profile/truthLayer.ts). Never
 * constructed directly from resume-parser output.
 */
export interface VerifiedCandidateProfile {
  identity: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };

  authorization: {
    country: string;
    status: WorkAuthorizationStatus | null;
    requiresSponsorship: boolean;
  };

  professionalSummary: string | null;
  yearsOfExperience: number | null;
  willingToRelocate: boolean;
  remotePreference: RemotePreference | null;
  salaryExpectation: { minimum: number | null; maximum: number | null };

  experience: Array<{
    id: string;
    company: string;
    jobTitle: string;
    location: string | null;
    startDate: string;
    endDate: string | null;
    isCurrent: boolean;
    description: string | null;
  }>;

  education: Array<{
    id: string;
    institution: string;
    degree: string;
    field: string | null;
    startDate: string | null;
    endDate: string | null;
    description: string | null;
  }>;

  skills: Array<{
    id: string;
    name: string;
    category: string | null;
    proficiency: string | null;
    yearsExperience: number | null;
  }>;

  certifications: Array<{
    id: string;
    name: string;
    issuer: string | null;
    issuedAt: string | null;
    expiresAt: string | null;
  }>;
}

/**
 * Structured output shape requested from the AI provider when parsing an
 * uploaded resume (section 22). Deliberately permissive/optional --
 * partial extraction is expected and is exactly what drives the
 * confidence score down (see apps/api/src/profile/resumeConfidence.ts)
 * rather than the parser inventing plausible-looking values to fill
 * gaps.
 */
export interface ResumeExtraction {
  personal: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    city?: string;
    province?: string;
    country?: string;
    linkedinUrl?: string;
    githubUrl?: string;
    portfolioUrl?: string;
  };
  summary?: string;
  /** Only set when the resume states a specific Canadian status in so many words. */
  workAuthorization?: WorkAuthorizationStatus;
  yearsOfExperience?: number;
  skills: Array<{
    name: string;
    category?: string;
    yearsExperience?: number;
  }>;
  experience: Array<{
    company: string;
    jobTitle: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
    description?: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  certifications: Array<{
    name: string;
    issuer?: string;
    issuedAt?: string;
    expiresAt?: string;
  }>;
  languages: string[];
  projects: Array<{ name: string; description?: string }>;
}
