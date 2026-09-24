import { describe, expect, it } from "vitest";
import type { VerifiedCandidateProfile } from "@jobpilot/shared";
import { heuristicCoverLetter } from "./coverLetter.heuristic";

const job = { title: "Cloud Support Engineer", company: "Northwind Cloud", description: "Support Kubernetes workloads." };

const baseProfile: VerifiedCandidateProfile = {
  identity: { firstName: "Demo", lastName: "Candidate", email: "demo@jobpilot.ai", phone: null },
  authorization: { country: "Canada", status: "CANADIAN_CITIZEN", requiresSponsorship: false },
  professionalSummary: null,
  yearsOfExperience: null,
  willingToRelocate: false,
  remotePreference: null,
  salaryExpectation: { minimum: null, maximum: null },
  experience: [],
  education: [],
  skills: [],
  certifications: [],
};

describe("heuristicCoverLetter", () => {
  it("signs off with the candidate's real name and mentions the job/company", () => {
    const letter = heuristicCoverLetter(job, baseProfile);
    expect(letter).toContain("Demo Candidate");
    expect(letter).toContain("Cloud Support Engineer");
    expect(letter).toContain("Northwind Cloud");
  });

  it("never fabricates experience when the profile has none", () => {
    const letter = heuristicCoverLetter(job, baseProfile);
    expect(letter).not.toMatch(/years? of/i);
  });

  it("mentions verified experience and years of experience when present", () => {
    const profile: VerifiedCandidateProfile = {
      ...baseProfile,
      yearsOfExperience: 4,
      experience: [
        {
          id: "exp-1",
          company: "Acme Corp",
          jobTitle: "Support Engineer",
          location: null,
          startDate: "2020-01-01",
          endDate: null,
          isCurrent: true,
          description: null,
        },
      ],
    };

    const letter = heuristicCoverLetter(job, profile);
    expect(letter).toContain("Support Engineer");
    expect(letter).toContain("Acme Corp");
    expect(letter).toContain("4 years");
  });

  it("foregrounds matchContext.matchedSkills over the full skills list", () => {
    const profile: VerifiedCandidateProfile = {
      ...baseProfile,
      skills: [
        { id: "s1", name: "Python", category: null, proficiency: null, yearsExperience: null },
        { id: "s2", name: "Kubernetes", category: null, proficiency: null, yearsExperience: null },
      ],
    };

    const letter = heuristicCoverLetter(job, profile, { matchedSkills: ["Kubernetes"] });
    expect(letter).toContain("Kubernetes");
    expect(letter).not.toContain("Python");
  });
});
