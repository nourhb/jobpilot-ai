import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VerifiedCandidateProfile } from "@jobpilot/shared";

vi.mock("../repositories/job.repository", () => ({
  jobRepository: { findById: vi.fn() },
}));
vi.mock("../repositories/jobPreference.repository", () => ({
  jobPreferenceRepository: { getOrCreateForUser: vi.fn() },
}));
vi.mock("../repositories/jobMatch.repository", () => ({
  jobMatchRepository: { upsert: vi.fn() },
}));
vi.mock("../profile/profile.service", () => ({
  profileService: { getVerifiedCandidateProfile: vi.fn() },
}));
vi.mock("../lib/aiProvider", () => ({
  getAIProvider: vi.fn(() => "fake-provider"),
}));
vi.mock("@jobpilot/ai", () => ({
  interpretJobMatch: vi.fn(),
}));

const baseJob = {
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
};

const basePreferences = {
  id: "pref-1",
  userId: "user-1",
  targetTitles: [] as string[],
  excludedTitles: [] as string[],
  countries: ["Canada"],
  provinces: [] as string[],
  cities: [] as string[],
  remote: true,
  hybrid: true,
  onsite: true,
  minSalary: null,
  maxSalary: null,
  employmentTypes: [] as string[],
  experienceLevels: [] as string[],
  maxDistanceKm: null,
  requireWorkAuthorization: true,
  requireNoSponsorship: true,
  minimumMatchScore: 70,
  autoApplyEnabled: false,
  autoCoverLetterEnabled: false,
  autoQuestionAnswerEnabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseProfile: VerifiedCandidateProfile = {
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

describe("jobMatchService.getOrComputeMatch", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws 404 when the job does not exist", async () => {
    const { jobRepository } = await import("../repositories/job.repository");
    const { jobMatchService } = await import("./jobMatch.service");
    vi.mocked(jobRepository.findById).mockResolvedValue(null);

    await expect(jobMatchService.getOrComputeMatch("user-1", "missing-job")).rejects.toThrow("Job not found.");
  });

  it("stores a SKIP match without calling the AI provider when a hard filter triggers", async () => {
    const { jobRepository } = await import("../repositories/job.repository");
    const { jobPreferenceRepository } = await import("../repositories/jobPreference.repository");
    const { jobMatchRepository } = await import("../repositories/jobMatch.repository");
    const { profileService } = await import("../profile/profile.service");
    const { interpretJobMatch } = await import("@jobpilot/ai");
    const { jobMatchService } = await import("./jobMatch.service");

    vi.mocked(jobRepository.findById).mockResolvedValue({ ...baseJob, status: "EXPIRED" } as never);
    vi.mocked(jobPreferenceRepository.getOrCreateForUser).mockResolvedValue(basePreferences as never);
    vi.mocked(profileService.getVerifiedCandidateProfile).mockResolvedValue(baseProfile);
    vi.mocked(jobMatchRepository.upsert).mockResolvedValue({ id: "match-1" } as never);

    await jobMatchService.getOrComputeMatch("user-1", "job-1");

    expect(interpretJobMatch).not.toHaveBeenCalled();
    expect(jobMatchRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ decision: "SKIP", score: 0, skippedReason: expect.stringMatching(/no longer active/) }),
    );
  });

  it("computes a hybrid score, calls the AI interpreter, and stores an APPLY decision above threshold", async () => {
    const { jobRepository } = await import("../repositories/job.repository");
    const { jobPreferenceRepository } = await import("../repositories/jobPreference.repository");
    const { jobMatchRepository } = await import("../repositories/jobMatch.repository");
    const { profileService } = await import("../profile/profile.service");
    const { interpretJobMatch } = await import("@jobpilot/ai");
    const { jobMatchService } = await import("./jobMatch.service");

    vi.mocked(jobRepository.findById).mockResolvedValue(baseJob as never);
    vi.mocked(jobPreferenceRepository.getOrCreateForUser).mockResolvedValue({ ...basePreferences, minimumMatchScore: 10 } as never);
    vi.mocked(profileService.getVerifiedCandidateProfile).mockResolvedValue(baseProfile);
    vi.mocked(jobMatchRepository.upsert).mockResolvedValue({ id: "match-1" } as never);
    vi.mocked(interpretJobMatch).mockResolvedValue({
      decision: "APPLY",
      reasons: ["Kubernetes skill matched."],
      missingRequirements: [],
      riskFlags: [],
      model: "mock-1",
      promptVersion: "job-match-v1",
    });

    await jobMatchService.getOrComputeMatch("user-1", "job-1");

    expect(interpretJobMatch).toHaveBeenCalledTimes(1);
    expect(jobMatchRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: "APPLY",
        skippedReason: null,
        aiSuggestedDecision: "APPLY",
        reasons: ["Kubernetes skill matched."],
      }),
    );
  });

  it("stores REVIEW when the score clears the fixed 70 floor but not the user's own threshold", async () => {
    const { jobRepository } = await import("../repositories/job.repository");
    const { jobPreferenceRepository } = await import("../repositories/jobPreference.repository");
    const { jobMatchRepository } = await import("../repositories/jobMatch.repository");
    const { profileService } = await import("../profile/profile.service");
    const { interpretJobMatch } = await import("@jobpilot/ai");
    const { jobMatchService } = await import("./jobMatch.service");

    vi.mocked(jobRepository.findById).mockResolvedValue(baseJob as never);
    vi.mocked(jobPreferenceRepository.getOrCreateForUser).mockResolvedValue({ ...basePreferences, minimumMatchScore: 100 } as never);
    vi.mocked(profileService.getVerifiedCandidateProfile).mockResolvedValue(baseProfile);
    vi.mocked(jobMatchRepository.upsert).mockResolvedValue({ id: "match-1" } as never);
    vi.mocked(interpretJobMatch).mockResolvedValue({
      decision: "REVIEW",
      reasons: [],
      missingRequirements: [],
      riskFlags: [],
      model: "mock-1",
      promptVersion: "job-match-v1",
    });

    await jobMatchService.getOrComputeMatch("user-1", "job-1");

    const call = vi.mocked(jobMatchRepository.upsert).mock.calls[0]![0];
    expect(call.score).toBeGreaterThanOrEqual(70);
    expect(call.score).toBeLessThan(100);
    expect(call.decision).toBe("REVIEW");
  });
});
