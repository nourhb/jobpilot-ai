import { describe, expect, it } from "vitest";
import type { VerifiedCandidateProfile } from "@jobpilot/shared";
import { MockAIProvider } from "@jobpilot/ai";
import { generateAnswerForQuestion } from "./answerGenerator";

const job = { title: "Cloud Support Engineer", company: "Northwind Cloud", description: "Support Kubernetes workloads." };

const profile: VerifiedCandidateProfile = {
  identity: { firstName: "Demo", lastName: "Candidate", email: "demo@jobpilot.ai", phone: null },
  authorization: { country: "Canada", status: "OPEN_WORK_PERMIT", requiresSponsorship: false },
  professionalSummary: null,
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
      description: null,
    },
  ],
  education: [],
  skills: [{ id: "skill-1", name: "Kubernetes", category: null, proficiency: null, yearsExperience: 2 }],
  certifications: [],
};

describe("generateAnswerForQuestion", () => {
  it("blocks HIGH_RISK questions without ever attempting retrieval or calling the AI", async () => {
    const provider = new MockAIProvider();
    const result = await generateAnswerForQuestion(provider, "Have you ever been convicted of a felony?", profile, job);

    expect(result.status).toBe("BLOCKED");
    expect(result.category).toBe("HIGH_RISK");
    expect(result.answer).toBeNull();
  });

  it("answers a LEGAL question directly from the verified profile, never via AI", async () => {
    const provider = new MockAIProvider();
    const result = await generateAnswerForQuestion(provider, "Are you legally authorized to work in Canada?", profile, job);

    expect(result).toMatchObject({ category: "LEGAL", status: "ANSWERED", answer: "Yes", source: "FACT" });
  });

  it("answers a yes/no experience question with NO when the skill is verified-absent", async () => {
    const provider = new MockAIProvider();
    const result = await generateAnswerForQuestion(provider, "Do you have AWS experience?", profile, job);

    expect(result).toMatchObject({ status: "ANSWERED", answer: "No", source: "FACT" });
  });

  it("answers a numeric experience question when known", async () => {
    const provider = new MockAIProvider();
    const result = await generateAnswerForQuestion(provider, "How many years of Kubernetes experience do you have?", profile, job);

    expect(result).toMatchObject({ status: "ANSWERED", answer: "2", source: "FACT" });
  });

  it("blocks a numeric experience question rather than guessing when the skill is absent", async () => {
    const provider = new MockAIProvider();
    const result = await generateAnswerForQuestion(provider, "How many years of Terraform experience do you have?", profile, job);

    expect(result.status).toBe("BLOCKED");
    expect(result.answer).toBeNull();
  });

  it("blocks a descriptive experience question when the skill is entirely absent", async () => {
    const provider = new MockAIProvider();
    const result = await generateAnswerForQuestion(provider, "Describe your Terraform experience.", profile, job);

    expect(result.status).toBe("BLOCKED");
  });

  it("generates and fact-checks a descriptive experience answer when the skill is present", async () => {
    const provider = new MockAIProvider();
    const result = await generateAnswerForQuestion(provider, "Describe your Kubernetes experience.", profile, job);

    expect(result.status).toBe("ANSWERED");
    expect(result.source).toBe("AI_GROUNDED");
    expect(result.factCheck?.valid).toBe(true);
  });

  it("generates and fact-checks a MOTIVATIONAL answer via AI", async () => {
    const provider = new MockAIProvider();
    const result = await generateAnswerForQuestion(provider, "Why do you want to work at our company?", profile, job);

    expect(result.category).toBe("MOTIVATIONAL");
    expect(result.status).toBe("ANSWERED");
    expect(result.source).toBe("AI_GROUNDED");
    expect(result.factCheck?.valid).toBe(true);
  });

  it("blocks a MOTIVATIONAL answer that fails the fact check instead of surfacing it", async () => {
    const provider = new MockAIProvider();
    // Queue a fabricated answer, then queue a failing fact-check result
    // for it (generateMotivationalAnswer consumes the text queue first,
    // checkFacts consumes the structured queue second).
    provider.queueTextResponse("I have 40 years of experience with Terraform.");
    provider.queueStructuredResponse({
      valid: false,
      unsupportedClaims: ["Claims 40 years of Terraform experience, not present in the verified profile."],
      confidence: 0.9,
    });

    const result = await generateAnswerForQuestion(provider, "Why do you want to work at our company?", profile, job);

    expect(result.status).toBe("BLOCKED");
    expect(result.answer).toBeNull();
    expect(result.blockedReason).toContain("Terraform");
  });

  it("blocks UNKNOWN questions rather than guessing", async () => {
    const provider = new MockAIProvider();
    const result = await generateAnswerForQuestion(provider, "Describe a challenge solved using quantum entanglement.", profile, job);

    expect(result.category).toBe("UNKNOWN");
    expect(result.status).toBe("BLOCKED");
  });
});
