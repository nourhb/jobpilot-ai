import { describe, expect, it } from "vitest";
import type { VerifiedCandidateProfile } from "@jobpilot/shared";
import { MockAIProvider } from "../providers/mock.provider";
import { checkFacts } from "./factChecker";

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
  certifications: [],
};

describe("checkFacts", () => {
  it("seeds the MockAIProvider with a heuristic fact check and returns it", async () => {
    const provider = new MockAIProvider();
    const result = await checkFacts(provider, "I have 3 years of experience with Kubernetes.", profile);

    expect(result.promptVersion).toBe("fact-check-v1");
    expect(result.model).toBe("mock-1");
    expect(result.valid).toBe(true);
  });

  it("flags an unsupported claim via the heuristic", async () => {
    const provider = new MockAIProvider();
    const result = await checkFacts(provider, "I have 20 years of experience with Terraform.", profile);

    expect(result.valid).toBe(false);
    expect(result.unsupportedClaims.length).toBeGreaterThan(0);
  });

  it("uses a provider's own queued structured response when one is set", async () => {
    const provider = new MockAIProvider();
    provider.queueStructuredResponse({ valid: false, unsupportedClaims: ["Custom flagged claim."], confidence: 0.9 });

    const result = await checkFacts(provider, "Any answer text.", profile);

    expect(result.valid).toBe(false);
    expect(result.unsupportedClaims).toEqual(["Custom flagged claim."]);
    expect(result.confidence).toBe(0.9);
  });

  it("never sends anything beyond the answer and verified profile facts", async () => {
    const provider = new MockAIProvider();
    let capturedUserPrompt = "";
    const originalGenerateStructured = provider.generateStructured.bind(provider);
    provider.generateStructured = async (request) => {
      capturedUserPrompt = request.userPrompt;
      return originalGenerateStructured(request);
    };

    await checkFacts(provider, "I have 3 years of experience with Kubernetes.", profile);

    const parsed = JSON.parse(capturedUserPrompt);
    expect(parsed.answer).toBe("I have 3 years of experience with Kubernetes.");
    expect(parsed.verifiedProfile.skills).toEqual([{ name: "Kubernetes", yearsExperience: 3 }]);
  });
});
