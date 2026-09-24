import { describe, expect, it } from "vitest";
import type { QuestionAnswerResult, VerifiedCandidateProfile } from "@jobpilot/shared";
import { validateApplication } from "./applicationValidator";

const profile: VerifiedCandidateProfile = {
  identity: { firstName: "Demo", lastName: "Candidate", email: "demo@jobpilot.ai", phone: "555-1234" },
  authorization: { country: "Canada", status: "CANADIAN_CITIZEN", requiresSponsorship: false },
  professionalSummary: null,
  yearsOfExperience: 5,
  willingToRelocate: false,
  remotePreference: "REMOTE",
  salaryExpectation: { minimum: null, maximum: null },
  experience: [],
  education: [],
  skills: [],
  certifications: [],
};

const answeredFact: QuestionAnswerResult = { category: "LEGAL", status: "ANSWERED", answer: "Yes", source: "FACT" };

function context(overrides: Partial<Parameters<typeof validateApplication>[0]> = {}) {
  return {
    profile,
    hasResume: true,
    coverLetter: "A great cover letter.",
    answers: [answeredFact],
    jobIsActive: true,
    isDuplicate: false,
    adapterSupported: true,
    ...overrides,
  };
}

describe("validateApplication", () => {
  it("passes when every check is satisfied", () => {
    const result = validateApplication(context());
    expect(result.passed).toBe(true);
    expect(result.checks.every((c) => c.passed)).toBe(true);
  });

  it("fails when the profile has no phone number", () => {
    const result = validateApplication(context({ profile: { ...profile, identity: { ...profile.identity, phone: null } } }));
    expect(result.passed).toBe(false);
    expect(result.checks.find((c) => c.name === "Phone")?.passed).toBe(false);
  });

  it("fails when no resume has been uploaded", () => {
    const result = validateApplication(context({ hasResume: false }));
    expect(result.passed).toBe(false);
    expect(result.checks.find((c) => c.name === "CV")?.passed).toBe(false);
  });

  it("fails when work authorization is not set", () => {
    const result = validateApplication(context({ profile: { ...profile, authorization: { ...profile.authorization, status: null } } }));
    expect(result.checks.find((c) => c.name === "Work authorization")?.passed).toBe(false);
  });

  it("fails when any answer is BLOCKED", () => {
    const blocked: QuestionAnswerResult = { category: "UNKNOWN", status: "BLOCKED", answer: null, source: null, blockedReason: "n/a" };
    const result = validateApplication(context({ answers: [answeredFact, blocked] }));
    expect(result.checks.find((c) => c.name === "Application questions")?.passed).toBe(false);
  });

  it("fails when an answer failed its fact check, even if marked ANSWERED", () => {
    const suspicious: QuestionAnswerResult = {
      category: "MOTIVATIONAL",
      status: "ANSWERED",
      answer: "some answer",
      source: "AI_GROUNDED",
      factCheck: { valid: false, unsupportedClaims: ["x"], confidence: 0.9 },
    };
    const result = validateApplication(context({ answers: [suspicious] }));
    expect(result.checks.find((c) => c.name === "No fabricated data")?.passed).toBe(false);
  });

  it("fails when the job is a duplicate, inactive, or the source is unsupported", () => {
    expect(validateApplication(context({ isDuplicate: true })).passed).toBe(false);
    expect(validateApplication(context({ jobIsActive: false })).passed).toBe(false);
    expect(validateApplication(context({ adapterSupported: false })).passed).toBe(false);
  });
});
