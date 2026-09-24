import { describe, expect, it } from "vitest";
import type { VerifiedCandidateProfile } from "@jobpilot/shared";
import { heuristicFactCheck } from "./factChecker.heuristic";

const profile: VerifiedCandidateProfile = {
  identity: { firstName: "Demo", lastName: "Candidate", email: "demo@jobpilot.ai", phone: null },
  authorization: { country: "Canada", status: "CANADIAN_CITIZEN", requiresSponsorship: false },
  professionalSummary: null,
  yearsOfExperience: 5,
  willingToRelocate: false,
  remotePreference: null,
  salaryExpectation: { minimum: null, maximum: null },
  experience: [],
  education: [],
  skills: [{ id: "skill-1", name: "Kubernetes", category: null, proficiency: null, yearsExperience: 3 }],
  certifications: [{ id: "cert-1", name: "Certified Kubernetes Administrator", issuer: null, issuedAt: null, expiresAt: null }],
};

describe("heuristicFactCheck", () => {
  it("passes an answer whose year claims match the verified profile", () => {
    const result = heuristicFactCheck("I have 3 years of experience with Kubernetes and 5 years overall.", profile);
    expect(result.valid).toBe(true);
    expect(result.unsupportedClaims).toEqual([]);
  });

  it("flags a year claim that does not match anything in the verified profile", () => {
    const result = heuristicFactCheck("I have 10 years of experience with Terraform.", profile);
    expect(result.valid).toBe(false);
    expect(result.unsupportedClaims.length).toBeGreaterThan(0);
  });

  it("tolerates rounding within 1 year of a verified fact", () => {
    const result = heuristicFactCheck("I have 4 years of experience with Kubernetes.", profile);
    expect(result.valid).toBe(true);
  });

  it("passes answers with no numeric claims at all", () => {
    const result = heuristicFactCheck("I'm excited about this opportunity and believe I'd be a strong fit.", profile);
    expect(result.valid).toBe(true);
  });

  it("flags certification language when no verified certification is named", () => {
    const result = heuristicFactCheck("I am certified in AWS Solutions Architecture.", profile);
    expect(result.valid).toBe(false);
    expect(result.unsupportedClaims.some((c) => c.includes("certification"))).toBe(true);
  });

  it("passes certification language when the verified certification is named", () => {
    const result = heuristicFactCheck("I hold the Certified Kubernetes Administrator certification.", profile);
    expect(result.valid).toBe(true);
  });

  it("never reports high confidence, reflecting its limited scope", () => {
    const validResult = heuristicFactCheck("No numeric claims here.", profile);
    const invalidResult = heuristicFactCheck("I have 99 years of experience.", profile);
    expect(validResult.confidence).toBeLessThanOrEqual(0.6);
    expect(invalidResult.confidence).toBeLessThanOrEqual(0.75);
  });
});
