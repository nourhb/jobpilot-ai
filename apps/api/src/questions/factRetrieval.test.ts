import { describe, expect, it } from "vitest";
import type { VerifiedCandidateProfile } from "@jobpilot/shared";
import { retrieveFact } from "./factRetrieval";

const baseProfile: VerifiedCandidateProfile = {
  identity: { firstName: "Demo", lastName: "Candidate", email: "demo@jobpilot.ai", phone: "555-1234" },
  authorization: { country: "Canada", status: null, requiresSponsorship: false },
  professionalSummary: null,
  yearsOfExperience: 5,
  willingToRelocate: true,
  remotePreference: "REMOTE",
  salaryExpectation: { minimum: 90000, maximum: 110000 },
  experience: [],
  education: [{ id: "edu-1", institution: "Uni", degree: "Bachelor of Science", field: "Computer Science", startDate: null, endDate: null, description: null }],
  skills: [{ id: "skill-1", name: "Kubernetes", category: null, proficiency: null, yearsExperience: 2 }],
  certifications: [],
};

describe("retrieveFact -- LEGAL", () => {
  it("blocks (not found) when authorization status is unset", () => {
    expect(retrieveFact("LEGAL", "YES_NO", "Are you legally authorized to work in Canada?", baseProfile).found).toBe(false);
  });

  it("answers YES when status confers authorization (section 61: Open Work Permit -> YES)", () => {
    const profile = { ...baseProfile, authorization: { ...baseProfile.authorization, status: "OPEN_WORK_PERMIT" as const } };
    expect(retrieveFact("LEGAL", "YES_NO", "Are you legally authorized to work in Canada?", profile)).toEqual({ found: true, value: "Yes" });
  });

  it("answers NO when status is REQUIRES_SPONSORSHIP", () => {
    const profile = { ...baseProfile, authorization: { ...baseProfile.authorization, status: "REQUIRES_SPONSORSHIP" as const } };
    expect(retrieveFact("LEGAL", "YES_NO", "Are you legally authorized to work in Canada?", profile)).toEqual({ found: true, value: "No" });
  });

  it("uses requiresSponsorship directly for the sponsorship-specific question, regardless of status", () => {
    const profile = { ...baseProfile, authorization: { ...baseProfile.authorization, status: "CANADIAN_CITIZEN" as const, requiresSponsorship: true } };
    expect(retrieveFact("LEGAL", "YES_NO", "Will you require visa sponsorship?", profile)).toEqual({ found: true, value: "Yes" });
  });

  it("never guesses when status is OTHER", () => {
    const profile = { ...baseProfile, authorization: { ...baseProfile.authorization, status: "OTHER" as const } };
    expect(retrieveFact("LEGAL", "YES_NO", "Are you legally authorized to work in Canada?", profile).found).toBe(false);
  });
});

describe("retrieveFact -- EXPERIENCE_FACT", () => {
  it("answers NO for a yes/no skill question when the skill is absent (section 61: AWS = 0 -> NO)", () => {
    expect(retrieveFact("EXPERIENCE_FACT", "YES_NO", "Do you have AWS experience?", baseProfile)).toEqual({ found: true, value: "No" });
  });

  it("answers YES for a yes/no skill question when the skill is present", () => {
    expect(retrieveFact("EXPERIENCE_FACT", "YES_NO", "Do you have Kubernetes experience?", baseProfile)).toEqual({
      found: true,
      value: "Yes",
    });
  });

  it("answers with the exact years for a numeric skill question when known", () => {
    expect(retrieveFact("EXPERIENCE_FACT", "NUMERIC", "How many years of Kubernetes experience do you have?", baseProfile)).toEqual({
      found: true,
      value: "2",
    });
  });

  it("blocks a numeric skill question when the skill isn't present at all", () => {
    expect(retrieveFact("EXPERIENCE_FACT", "NUMERIC", "How many years of Terraform experience do you have?", baseProfile).found).toBe(
      false,
    );
  });

  it("blocks a descriptive skill question when the skill is entirely absent (section 61: Terraform absent -> BLOCK)", () => {
    expect(retrieveFact("EXPERIENCE_FACT", "DESCRIPTIVE", "Describe your Terraform experience.", baseProfile).found).toBe(false);
  });

  it("finds a descriptive skill question when the skill is present", () => {
    expect(retrieveFact("EXPERIENCE_FACT", "DESCRIPTIVE", "Describe your Kubernetes experience.", baseProfile).found).toBe(true);
  });
});

describe("retrieveFact -- EDUCATION_FACT", () => {
  it("returns the matching degree", () => {
    expect(retrieveFact("EDUCATION_FACT", "VALUE", "Do you have a Computer Science degree?", baseProfile)).toEqual({
      found: true,
      value: "Bachelor of Science in Computer Science",
    });
  });

  it("returns the highest education for a generic question", () => {
    expect(retrieveFact("EDUCATION_FACT", "VALUE", "What is your highest level of education?", baseProfile).found).toBe(true);
  });

  it("blocks when there is no education on file", () => {
    expect(retrieveFact("EDUCATION_FACT", "VALUE", "What is your highest level of education?", { ...baseProfile, education: [] }).found).toBe(
      false,
    );
  });
});

describe("retrieveFact -- PREFERENCE", () => {
  it("returns relocation willingness", () => {
    expect(retrieveFact("PREFERENCE", "YES_NO", "Are you willing to relocate?", baseProfile)).toEqual({ found: true, value: "Yes" });
  });

  it("returns salary expectation as a range", () => {
    expect(retrieveFact("PREFERENCE", "VALUE", "What is your expected salary?", baseProfile)).toEqual({
      found: true,
      value: "90000-110000",
    });
  });

  it("blocks a notice-period question -- not modeled in the verified profile", () => {
    expect(retrieveFact("PREFERENCE", "VALUE", "What is your notice period?", baseProfile).found).toBe(false);
  });
});

describe("retrieveFact -- PROFILE_FACT", () => {
  it("returns the candidate's full name", () => {
    expect(retrieveFact("PROFILE_FACT", "VALUE", "What is your full name?", baseProfile)).toEqual({
      found: true,
      value: "Demo Candidate",
    });
  });
});

describe("retrieveFact -- YES_NO_FACT", () => {
  it("always blocks -- no dedicated generic fact store", () => {
    expect(retrieveFact("YES_NO_FACT", "YES_NO", "Are you currently employed?", baseProfile).found).toBe(false);
  });
});
