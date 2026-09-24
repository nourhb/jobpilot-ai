import { describe, expect, it } from "vitest";
import type { Job, JobPreference } from "@prisma/client";
import type { VerifiedCandidateProfile } from "@jobpilot/shared";
import { computeHybridScore } from "./scoring";

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "job-1",
    sourceId: "source-1",
    externalId: "ext-1",
    title: "Cloud Support Engineer",
    company: "Northwind Cloud",
    description: "Support customers running workloads on our managed Kubernetes platform. Requires Docker, Kubernetes and Linux experience.",
    descriptionHtml: null,
    locationRaw: "Toronto, Ontario, Canada",
    city: "Toronto",
    province: "Ontario",
    country: "Canada",
    remoteType: "REMOTE",
    employmentType: "FULL_TIME",
    experienceLevel: null,
    salaryMin: 75000,
    salaryMax: 95000,
    salaryCurrency: "CAD",
    salaryPeriod: "YEAR",
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
    salaryExpectation: { minimum: 80000, maximum: 100000 },
    experience: [
      {
        id: "exp-1",
        company: "Acme Inc.",
        jobTitle: "Cloud Support Engineer",
        location: "Toronto",
        startDate: "2020-01-01",
        endDate: null,
        isCurrent: true,
        description: null,
      },
    ],
    education: [],
    skills: [
      { id: "skill-1", name: "Kubernetes", category: null, proficiency: null, yearsExperience: null },
      { id: "skill-2", name: "Docker", category: null, proficiency: null, yearsExperience: null },
      { id: "skill-3", name: "Linux", category: null, proficiency: null, yearsExperience: null },
    ],
    certifications: [],
    ...overrides,
  };
}

describe("computeHybridScore", () => {
  it("scores a strongly matching job highly", () => {
    const breakdown = computeHybridScore(makeJob(), makeProfile(), makePreferences());

    expect(breakdown.matchedSkills.sort()).toEqual(["Docker", "Kubernetes", "Linux"]);
    expect(breakdown.skillsScore).toBeGreaterThan(80);
    expect(breakdown.locationScore).toBe(100); // remote job, candidate prefers remote
    expect(breakdown.authorizationScore).toBe(100); // candidate doesn't require sponsorship
    expect(breakdown.score).toBeGreaterThanOrEqual(70);
    expect(breakdown.matchCategory).not.toBe("LOW");
  });

  it("scores a job with no relevant skills lower", () => {
    const job = makeJob({ title: "Marketing Manager", description: "Own our brand marketing campaigns and social media." });
    const breakdown = computeHybridScore(job, makeProfile(), makePreferences());

    expect(breakdown.matchedSkills).toEqual([]);
    expect(breakdown.skillsScore).toBe(0);
  });

  it("penalizes a candidate whose salary expectation exceeds the job's range", () => {
    const job = makeJob({ salaryMin: 40000, salaryMax: 50000 });
    const breakdown = computeHybridScore(job, makeProfile(), makePreferences());

    expect(breakdown.salaryScore).toBeLessThan(100);
  });

  it("gives a neutral, unpenalized salary score when neither side discloses salary", () => {
    const job = makeJob({ salaryMin: null, salaryMax: null });
    const profile = makeProfile({ salaryExpectation: { minimum: null, maximum: null } });
    const breakdown = computeHybridScore(job, profile, makePreferences());

    expect(breakdown.salaryScore).toBeGreaterThanOrEqual(60);
  });

  it("scores authorization poorly when sponsorship is required and the posting rules it out", () => {
    const job = makeJob({ description: "We are unable to sponsor work visas for this role." });
    const profile = makeProfile({ authorization: { country: "Canada", status: "OPEN_WORK_PERMIT", requiresSponsorship: true } });
    const breakdown = computeHybridScore(job, profile, makePreferences());

    expect(breakdown.authorizationScore).toBeLessThan(50);
  });

  it("scores authorization moderately when the candidate's status is undeclared", () => {
    const job = makeJob();
    const profile = makeProfile({ authorization: { country: "Canada", status: null, requiresSponsorship: false } });
    const breakdown = computeHybridScore(job, profile, makePreferences());

    expect(breakdown.authorizationScore).toBeLessThan(70);
  });

  it("prefers target-title matches for the title-similarity component", () => {
    const job = makeJob({ title: "Cloud Support Engineer" });
    const preferences = makePreferences({ targetTitles: ["Cloud Support Engineer"] });
    const breakdown = computeHybridScore(job, makeProfile(), preferences);

    expect(breakdown.titleScore).toBe(100);
    expect(breakdown.preferencesScore).toBe(100);
  });
});
