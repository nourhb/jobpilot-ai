import { describe, expect, it } from "vitest";
import type { Job, JobPreference } from "@prisma/client";
import type { VerifiedCandidateProfile } from "@jobpilot/shared";
import { applyHardFilters } from "./hardFilters";

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "job-1",
    sourceId: "source-1",
    externalId: "ext-1",
    title: "Cloud Support Engineer",
    company: "Northwind Cloud",
    description: "Support customers running workloads on our managed Kubernetes platform.",
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

function makeProfile(overrides: Partial<VerifiedCandidateProfile> = {}): VerifiedCandidateProfile {
  return {
    identity: { firstName: "Demo", lastName: "Candidate", email: "demo@jobpilot.ai", phone: null },
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
    ...overrides,
  };
}

describe("applyHardFilters", () => {
  it("passes a normal active job with no configured restrictions", () => {
    const result = applyHardFilters(makeJob(), makeProfile(), makePreferences());
    expect(result.skip).toBe(false);
  });

  it("skips a job that is no longer ACTIVE", () => {
    const result = applyHardFilters(makeJob({ status: "EXPIRED" }), makeProfile(), makePreferences());
    expect(result.skip).toBe(true);
    expect(result.reason).toMatch(/no longer active/);
  });

  it("skips a job whose expiresAt is in the past", () => {
    const result = applyHardFilters(makeJob({ expiresAt: new Date("2000-01-01") }), makeProfile(), makePreferences());
    expect(result.skip).toBe(true);
    expect(result.reason).toMatch(/expired/);
  });

  it("skips a job outside the configured countries", () => {
    const result = applyHardFilters(makeJob({ country: "United States" }), makeProfile(), makePreferences());
    expect(result.skip).toBe(true);
    expect(result.reason).toMatch(/countries/);
  });

  it("skips a remote job when the user has disabled remote in preferences", () => {
    const result = applyHardFilters(makeJob({ remoteType: "REMOTE" }), makeProfile(), makePreferences({ remote: false }));
    expect(result.skip).toBe(true);
    expect(result.reason).toMatch(/Remote/);
  });

  it("skips when work authorization is required but not declared on the profile", () => {
    const profile = makeProfile({ authorization: { country: "Canada", status: null, requiresSponsorship: false } });
    const result = applyHardFilters(makeJob(), profile, makePreferences({ requireWorkAuthorization: true }));
    expect(result.skip).toBe(true);
    expect(result.reason).toMatch(/work authorization/);
  });

  it("does not skip for undeclared authorization when requireWorkAuthorization is false", () => {
    const profile = makeProfile({ authorization: { country: "Canada", status: null, requiresSponsorship: false } });
    const result = applyHardFilters(makeJob(), profile, makePreferences({ requireWorkAuthorization: false }));
    expect(result.skip).toBe(false);
  });

  it("skips when the candidate requires sponsorship and the posting rules it out", () => {
    const job = makeJob({ description: "We are unable to sponsor work visas for this role." });
    const profile = makeProfile({ authorization: { country: "Canada", status: "OPEN_WORK_PERMIT", requiresSponsorship: true } });
    const result = applyHardFilters(job, profile, makePreferences());
    expect(result.skip).toBe(true);
    expect(result.reason).toMatch(/sponsorship/);
  });

  it("does not skip for sponsorship language when the candidate does not require sponsorship", () => {
    const job = makeJob({ description: "We are unable to sponsor work visas for this role." });
    const result = applyHardFilters(job, makeProfile(), makePreferences());
    expect(result.skip).toBe(false);
  });

  it("skips a job whose experience level is outside the configured levels", () => {
    const job = makeJob({ experienceLevel: "senior" });
    const result = applyHardFilters(job, makeProfile(), makePreferences({ experienceLevels: ["entry", "mid"] }));
    expect(result.skip).toBe(true);
    expect(result.reason).toMatch(/experience level/);
  });

  it("skips a job whose title matches an excluded title", () => {
    const job = makeJob({ title: "Senior Sales Manager" });
    const result = applyHardFilters(job, makeProfile(), makePreferences({ excludedTitles: ["Sales Manager"] }));
    expect(result.skip).toBe(true);
    expect(result.reason).toMatch(/excluded/);
  });
});
