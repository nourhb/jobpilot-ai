import { describe, expect, it } from "vitest";
import type { VerifiedCandidateProfile } from "@jobpilot/shared";
import { MockAIProvider } from "../providers/mock.provider";
import { generateMotivationalAnswer } from "./questionAnswer";

const job = { title: "Cloud Support Engineer", company: "Northwind Cloud", description: "Support Kubernetes workloads." };

const profile: VerifiedCandidateProfile = {
  identity: { firstName: "Demo", lastName: "Candidate", email: "demo@jobpilot.ai", phone: null },
  authorization: { country: "Canada", status: "CANADIAN_CITIZEN", requiresSponsorship: false },
  professionalSummary: null,
  yearsOfExperience: 5,
  willingToRelocate: false,
  remotePreference: null,
  salaryExpectation: { minimum: null, maximum: null },
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
  education: [],
  skills: [{ id: "skill-1", name: "Kubernetes", category: null, proficiency: null, yearsExperience: 3 }],
  certifications: [],
};

describe("generateMotivationalAnswer", () => {
  it("seeds the MockAIProvider with a heuristic answer grounded in the verified profile", async () => {
    const provider = new MockAIProvider();
    const result = await generateMotivationalAnswer(provider, "Why do you want to work here?", job, profile);

    expect(result.promptVersion).toBe("question-answer-v1");
    expect(result.content).toContain("Northwind Cloud");
  });

  it("uses a provider's own queued text response when one is set", async () => {
    const provider = new MockAIProvider();
    provider.queueTextResponse("Custom motivational answer.");

    const result = await generateMotivationalAnswer(provider, "Why do you want to work here?", job, profile);

    expect(result.content).toBe("Custom motivational answer.");
  });

  it("never sends anything beyond the question, job, and verified profile facts", async () => {
    const provider = new MockAIProvider();
    let capturedUserPrompt = "";
    const originalGenerateText = provider.generateText.bind(provider);
    provider.generateText = async (request) => {
      capturedUserPrompt = request.userPrompt;
      return originalGenerateText(request);
    };

    await generateMotivationalAnswer(provider, "Why do you want to work here?", job, profile);

    const parsed = JSON.parse(capturedUserPrompt);
    expect(parsed.question).toBe("Why do you want to work here?");
    expect(parsed.job).toEqual(job);
    expect(parsed.verifiedCandidateProfile.skills).toEqual(["Kubernetes"]);
  });
});
