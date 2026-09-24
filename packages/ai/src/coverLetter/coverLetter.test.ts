import { describe, expect, it } from "vitest";
import type { VerifiedCandidateProfile } from "@jobpilot/shared";
import { MockAIProvider } from "../providers/mock.provider";
import { generateCoverLetter } from "./coverLetter";

const job = {
  title: "Cloud Support Engineer",
  company: "Northwind Cloud",
  description: "Support customers running workloads on our managed Kubernetes platform.",
};

const profile: VerifiedCandidateProfile = {
  identity: { firstName: "Demo", lastName: "Candidate", email: "demo@jobpilot.ai", phone: null },
  authorization: { country: "Canada", status: "CANADIAN_CITIZEN", requiresSponsorship: false },
  professionalSummary: "Cloud support specialist with a focus on Kubernetes.",
  yearsOfExperience: 5,
  willingToRelocate: false,
  remotePreference: "REMOTE",
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
      description: "Operated Kubernetes clusters for enterprise customers.",
    },
  ],
  education: [],
  skills: [{ id: "skill-1", name: "Kubernetes", category: null, proficiency: null, yearsExperience: 3 }],
  certifications: [],
};

describe("generateCoverLetter", () => {
  it("seeds the MockAIProvider with a heuristic cover letter grounded in the verified profile", async () => {
    const provider = new MockAIProvider();
    const result = await generateCoverLetter(provider, job, profile);

    expect(result.promptVersion).toBe("cover-letter-v1");
    expect(result.model).toBe("mock-1");
    expect(result.content).toContain("Northwind Cloud");
    expect(result.content).toContain("Support Engineer");
    expect(result.content).toContain("Demo Candidate");
  });

  it("uses a provider's own queued text response when one is set", async () => {
    const provider = new MockAIProvider();
    provider.queueTextResponse("Custom cover letter text from a queued response.");

    const result = await generateCoverLetter(provider, job, profile);

    expect(result.content).toBe("Custom cover letter text from a queued response.");
  });

  it("never invents facts -- the prompt payload only contains verified profile data and the job", async () => {
    const provider = new MockAIProvider();
    let capturedUserPrompt = "";
    const originalGenerateText = provider.generateText.bind(provider);
    provider.generateText = async (request) => {
      capturedUserPrompt = request.userPrompt;
      return originalGenerateText(request);
    };

    await generateCoverLetter(provider, job, profile);

    const parsed = JSON.parse(capturedUserPrompt);
    expect(parsed.verifiedCandidateProfile.skills).toEqual(["Kubernetes"]);
    expect(parsed.verifiedCandidateProfile.experience[0].company).toBe("Acme Corp");
    expect(parsed.job).toEqual(job);
  });

  it("foregrounds matchContext.matchedSkills over the full skills list when provided", async () => {
    const provider = new MockAIProvider();
    const result = await generateCoverLetter(provider, job, profile, { matchedSkills: ["Kubernetes"] });

    expect(result.content).toContain("Kubernetes");
  });
});
