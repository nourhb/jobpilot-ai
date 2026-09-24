import { describe, expect, it } from "vitest";
import type { Job, JobPreference } from "@prisma/client";
import { evaluateApplication } from "./policyEngine";

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "job-1",
    sourceId: "source-1",
    externalId: "ext-1",
    title: "Cloud Support Engineer",
    company: "Northwind Cloud",
    description: "Support Kubernetes workloads.",
    descriptionHtml: null,
    locationRaw: "Toronto, Ontario, Canada",
    city: "Toronto",
    province: "Ontario",
    country: "Canada",
    remoteType: "REMOTE",
    employmentType: "FULL_TIME",
    experienceLevel: null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryPeriod: null,
    jobUrl: null,
    applicationType: "API",
    applicationUrl: null,
    postedAt: new Date("2026-09-01"),
    expiresAt: null,
    lastSeenAt: new Date(),
    rawData: {},
    contentHash: "hash",
    secondaryDedupeKey: "key",
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Job;
}

function makePreferences(overrides: Partial<JobPreference> = {}): JobPreference {
  return {
    id: "pref-1",
    userId: "user-1",
    targetTitles: [],
    excludedTitles: [],
    countries: ["Canada"],
    provinces: [],
    cities: [],
    remote: true,
    hybrid: true,
    onsite: true,
    minSalary: null,
    maxSalary: null,
    employmentTypes: [],
    experienceLevels: [],
    maxDistanceKm: null,
    requireWorkAuthorization: true,
    requireNoSponsorship: true,
    minimumMatchScore: 70,
    autoApplyEnabled: false,
    autoCoverLetterEnabled: false,
    autoQuestionAnswerEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as JobPreference;
}

function baseContext(overrides: Partial<Parameters<typeof evaluateApplication>[0]> = {}) {
  return {
    job: makeJob(),
    preferences: makePreferences(),
    isDuplicate: false,
    hasBlockedAnswer: false,
    hasFailedFactCheck: false,
    adapterSupported: true,
    ...overrides,
  };
}

describe("evaluateApplication (Policy Engine)", () => {
  it("allows a clean application", () => {
    const result = evaluateApplication(baseContext());
    expect(result).toEqual({ allowed: true, requiresManualReview: false, reasons: [] });
  });

  it("RULE-006: hard-stops (no manual review) on a duplicate application", () => {
    const result = evaluateApplication(baseContext({ isDuplicate: true }));
    expect(result.allowed).toBe(false);
    expect(result.requiresManualReview).toBe(false);
  });

  it("RULE-007: hard-stops on an expired/inactive job", () => {
    const result = evaluateApplication(baseContext({ job: makeJob({ status: "EXPIRED" }) }));
    expect(result.allowed).toBe(false);
    expect(result.requiresManualReview).toBe(false);
  });

  it("RULE-008: hard-stops on a job outside configured countries", () => {
    const result = evaluateApplication(
      baseContext({ job: makeJob({ country: "United States" }), preferences: makePreferences({ countries: ["Canada"] }) }),
    );
    expect(result.allowed).toBe(false);
    expect(result.requiresManualReview).toBe(false);
  });

  it("RULE-009: hard-stops on a job outside configured employment types", () => {
    const result = evaluateApplication(
      baseContext({ job: makeJob({ employmentType: "CONTRACT" }), preferences: makePreferences({ employmentTypes: ["FULL_TIME"] }) }),
    );
    expect(result.allowed).toBe(false);
    expect(result.requiresManualReview).toBe(false);
  });

  it("RULE-005: routes to manual review (not a hard stop) when a required question is unanswerable", () => {
    const result = evaluateApplication(baseContext({ hasBlockedAnswer: true }));
    expect(result).toEqual({
      allowed: false,
      requiresManualReview: true,
      reasons: ["Required question cannot be answered from verified profile"],
    });
  });

  it("routes to manual review when a fact check failed", () => {
    const result = evaluateApplication(baseContext({ hasFailedFactCheck: true }));
    expect(result.allowed).toBe(false);
    expect(result.requiresManualReview).toBe(true);
  });

  it("routes to manual review when the job's source has no supporting adapter", () => {
    const result = evaluateApplication(baseContext({ adapterSupported: false }));
    expect(result.allowed).toBe(false);
    expect(result.requiresManualReview).toBe(true);
  });
});
