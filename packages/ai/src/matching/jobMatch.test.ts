import { describe, expect, it } from "vitest";
import type { HybridScoreBreakdown, VerifiedCandidateProfile } from "@jobpilot/shared";
import { MockAIProvider } from "../providers/mock.provider";
import { interpretJobMatch } from "./jobMatch";

const job = {
  title: "Cloud Support Engineer",
  company: "Northwind Cloud",
  description: "Support customers running workloads on our managed Kubernetes platform.",
};

const profile: VerifiedCandidateProfile = {
  identity: { firstName: "Demo", lastName: "Candidate", email: "demo@jobpilot.ai", phone: null },
  authorization: { country: "Canada", status: "CANADIAN_CITIZEN", requiresSponsorship: false },
  professionalSummary: null,
  yearsOfExperience: 5,
  willingToRelocate: false,
  remotePreference: "REMOTE",
  salaryExpectation: { minimum: null, maximum: null },
  experience: [],
  education: [],
  skills: [{ id: "skill-1", name: "Kubernetes", category: null, proficiency: null, yearsExperience: null }],
  certifications: [],
};

const breakdown: HybridScoreBreakdown = {
  score: 85,
  matchCategory: "STRONG",
  skillsScore: 100,
  experienceScore: 70,
  titleScore: 100,
  locationScore: 100,
  authorizationScore: 100,
  salaryScore: 60,
  employmentTypeScore: 70,
  preferencesScore: 60,
  matchedSkills: ["Kubernetes"],
};

describe("interpretJobMatch", () => {
  it("seeds the MockAIProvider with a heuristic interpretation grounded in the breakdown", async () => {
    const provider = new MockAIProvider();
    const result = await interpretJobMatch(provider, job, profile, breakdown);

    expect(result.promptVersion).toBe("job-match-v1");
    expect(result.model).toBe("mock-1");
    expect(result.reasons.some((r) => r.includes("Kubernetes"))).toBe(true);
    expect(result.decision).toBe("APPLY");
  });

  it("uses a provider's own queued structured response when one is set", async () => {
    const provider = new MockAIProvider();
    provider.queueStructuredResponse({
      decision: "REVIEW",
      reasons: ["Custom reason from a queued provider response."],
      missingRequirements: [],
      riskFlags: [],
    });

    const result = await interpretJobMatch(provider, job, profile, breakdown);

    expect(result.decision).toBe("REVIEW");
    expect(result.reasons).toEqual(["Custom reason from a queued provider response."]);
  });

  it("never invents facts -- the prompt payload only contains verified profile data and the job description", async () => {
    const provider = new MockAIProvider();
    let capturedUserPrompt = "";
    const originalGenerateStructured = provider.generateStructured.bind(provider);
    provider.generateStructured = async (request) => {
      capturedUserPrompt = request.userPrompt;
      return originalGenerateStructured(request);
    };

    await interpretJobMatch(provider, job, profile, breakdown);

    const parsed = JSON.parse(capturedUserPrompt);
    expect(parsed.verifiedCandidateFacts.skills).toEqual(["Kubernetes"]);
    expect(parsed.job).toEqual(job);
    expect(parsed.computedScore).toEqual(breakdown);
  });
});
