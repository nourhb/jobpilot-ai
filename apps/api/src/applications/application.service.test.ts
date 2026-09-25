import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VerifiedCandidateProfile } from "@jobpilot/shared";

vi.mock("../repositories/application.repository", () => ({
  applicationRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findByUserAndJob: vi.fn(),
    findOwnedById: vi.fn(),
    updateStatus: vi.fn(),
    list: vi.fn(),
  },
}));
vi.mock("../repositories/coverLetter.repository", () => ({
  coverLetterRepository: { upsert: vi.fn() },
}));
vi.mock("../repositories/applicationAnswer.repository", () => ({
  applicationAnswerRepository: { replaceAll: vi.fn() },
}));
vi.mock("../repositories/applicationEvent.repository", () => ({
  applicationEventRepository: { record: vi.fn() },
}));
vi.mock("../repositories/job.repository", () => ({
  jobRepository: { findByIdWithSource: vi.fn() },
}));
vi.mock("../repositories/jobPreference.repository", () => ({
  jobPreferenceRepository: { getOrCreateForUser: vi.fn() },
}));
vi.mock("../matching/jobMatch.service", () => ({
  jobMatchService: { getOrComputeMatch: vi.fn() },
}));
vi.mock("../profile/profile.service", () => ({
  profileService: { getVerifiedCandidateProfile: vi.fn(), listResumes: vi.fn() },
}));
vi.mock("../lib/aiProvider", () => ({
  getAIProvider: vi.fn(() => "fake-provider"),
}));
vi.mock("../questions/answerGenerator", () => ({
  generateAnswerForQuestion: vi.fn(),
}));
vi.mock("@jobpilot/ai", () => ({
  generateCoverLetter: vi.fn(),
}));
vi.mock("./adapters/applicationRouter", () => ({
  resolveApplicationAdapter: vi.fn(),
}));
vi.mock("../notifications/notification.service", () => ({
  notificationService: { notify: vi.fn() },
}));

const baseJob = {
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
  source: { id: "source-1", name: "Mock", type: "MOCK", config: {}, enabled: true, createdAt: new Date(), updatedAt: new Date() },
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
  identity: { firstName: "Demo", lastName: "Candidate", email: "demo@jobpilot.ai", phone: "555-1234" },
  authorization: { country: "Canada", status: "CANADIAN_CITIZEN", requiresSponsorship: false },
  professionalSummary: null,
  yearsOfExperience: 5,
  willingToRelocate: false,
  remotePreference: "REMOTE",
  salaryExpectation: { minimum: null, maximum: null },
  experience: [],
  education: [],
  skills: [{ id: "skill-1", name: "Kubernetes", category: null, proficiency: null, yearsExperience: 3 }],
  certifications: [],
};

const baseApplication = {
  id: "app-1",
  userId: "user-1",
  jobId: "job-1",
  status: "QUALIFIED",
  idempotencyKey: "key",
  jobSnapshot: {},
  candidateSnapshot: {},
  matchScore: 85,
  matchCategory: "STRONG",
  manualReviewReason: null,
  blockedReason: null,
  failureReason: null,
  submittedAt: null,
  externalApplicationId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const answeredFact = { category: "LEGAL", status: "ANSWERED", answer: "Yes", source: "FACT" };

async function importAll() {
  const { applicationRepository } = await import("../repositories/application.repository");
  const { coverLetterRepository } = await import("../repositories/coverLetter.repository");
  const { applicationAnswerRepository } = await import("../repositories/applicationAnswer.repository");
  const { applicationEventRepository } = await import("../repositories/applicationEvent.repository");
  const { jobRepository } = await import("../repositories/job.repository");
  const { jobPreferenceRepository } = await import("../repositories/jobPreference.repository");
  const { jobMatchService } = await import("../matching/jobMatch.service");
  const { profileService } = await import("../profile/profile.service");
  const { generateAnswerForQuestion } = await import("../questions/answerGenerator");
  const { generateCoverLetter } = await import("@jobpilot/ai");
  const { resolveApplicationAdapter } = await import("./adapters/applicationRouter");
  const { applicationService } = await import("./application.service");

  return {
    applicationRepository,
    coverLetterRepository,
    applicationAnswerRepository,
    applicationEventRepository,
    jobRepository,
    jobPreferenceRepository,
    jobMatchService,
    profileService,
    generateAnswerForQuestion,
    generateCoverLetter,
    resolveApplicationAdapter,
    applicationService,
  };
}

function stubCommonDeps(mods: Awaited<ReturnType<typeof importAll>>) {
  vi.mocked(mods.jobRepository.findByIdWithSource).mockResolvedValue(baseJob as never);
  vi.mocked(mods.jobPreferenceRepository.getOrCreateForUser).mockResolvedValue(basePreferences as never);
  vi.mocked(mods.profileService.getVerifiedCandidateProfile).mockResolvedValue(baseProfile);
  vi.mocked(mods.profileService.listResumes).mockResolvedValue([{ id: "resume-1" }] as never);
  vi.mocked(mods.generateCoverLetter).mockResolvedValue({
    content: "A great cover letter.",
    model: "mock-1",
    promptVersion: "cover-letter-v1",
  });
  vi.mocked(mods.coverLetterRepository.upsert).mockResolvedValue({} as never);
  vi.mocked(mods.applicationAnswerRepository.replaceAll).mockResolvedValue(undefined);
  vi.mocked(mods.applicationEventRepository.record).mockResolvedValue({} as never);
  vi.mocked(mods.applicationRepository.updateStatus).mockResolvedValue({} as never);
  vi.mocked(mods.applicationRepository.findById).mockResolvedValue(baseApplication as never);
  vi.mocked(mods.applicationRepository.findOwnedById).mockResolvedValue(baseApplication as never);
}

describe("applicationService.createAndProcess", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws 404 when the job does not exist", async () => {
    const mods = await importAll();
    vi.mocked(mods.jobRepository.findByIdWithSource).mockResolvedValue(null);

    await expect(mods.applicationService.createAndProcess("user-1", "missing-job")).rejects.toThrow("Job not found.");
  });

  it("returns the existing application instead of creating a duplicate (RULE-006)", async () => {
    const mods = await importAll();
    vi.mocked(mods.jobRepository.findByIdWithSource).mockResolvedValue(baseJob as never);
    vi.mocked(mods.applicationRepository.findByUserAndJob).mockResolvedValue(baseApplication as never);
    vi.mocked(mods.applicationRepository.findById).mockResolvedValue(baseApplication as never);

    const result = await mods.applicationService.createAndProcess("user-1", "job-1");

    expect(result).toEqual(baseApplication);
    expect(mods.applicationRepository.create).not.toHaveBeenCalled();
  });

  it("refuses to create an application for a SKIP-decision match", async () => {
    const mods = await importAll();
    vi.mocked(mods.jobRepository.findByIdWithSource).mockResolvedValue(baseJob as never);
    vi.mocked(mods.applicationRepository.findByUserAndJob).mockResolvedValue(null);
    vi.mocked(mods.jobMatchService.getOrComputeMatch).mockResolvedValue({ decision: "SKIP", score: 20 } as never);

    await expect(mods.applicationService.createAndProcess("user-1", "job-1")).rejects.toThrow(/skipped by matching/);
  });

  it("runs the full pipeline through to SUBMITTED on the happy path", async () => {
    const mods = await importAll();
    stubCommonDeps(mods);
    vi.mocked(mods.jobRepository.findByIdWithSource).mockResolvedValue(baseJob as never);
    vi.mocked(mods.applicationRepository.findByUserAndJob).mockResolvedValue(null);
    vi.mocked(mods.jobMatchService.getOrComputeMatch).mockResolvedValue({ decision: "APPLY", score: 90, matchCategory: "EXCELLENT" } as never);
    vi.mocked(mods.applicationRepository.create).mockResolvedValue(baseApplication as never);
    vi.mocked(mods.generateAnswerForQuestion).mockResolvedValue(answeredFact as never);

    const fakeAdapter = {
      name: "mock-ats",
      isJobStillActive: vi.fn().mockResolvedValue(true),
      getQuestions: vi.fn().mockResolvedValue([{ id: "q1", text: "Are you legally authorized to work in Canada?" }]),
      submit: vi.fn().mockResolvedValue({ externalApplicationId: "mock-app-1" }),
    };
    vi.mocked(mods.resolveApplicationAdapter).mockReturnValue(fakeAdapter as never);

    await mods.applicationService.createAndProcess("user-1", "job-1");

    expect(fakeAdapter.submit).toHaveBeenCalledTimes(1);
    const statusCalls = vi.mocked(mods.applicationRepository.updateStatus).mock.calls.map((c) => c[1].status);
    expect(statusCalls).toContain("SUBMITTED");
    expect(statusCalls).not.toContain("BLOCKED");
    expect(statusCalls).not.toContain("MANUAL_REVIEW");
  });

  it("routes to MANUAL_REVIEW when the job's source has no supporting adapter", async () => {
    const mods = await importAll();
    stubCommonDeps(mods);
    vi.mocked(mods.applicationRepository.findByUserAndJob).mockResolvedValue(null);
    vi.mocked(mods.jobMatchService.getOrComputeMatch).mockResolvedValue({ decision: "APPLY", score: 90, matchCategory: "EXCELLENT" } as never);
    vi.mocked(mods.applicationRepository.create).mockResolvedValue(baseApplication as never);
    vi.mocked(mods.resolveApplicationAdapter).mockReturnValue(null);

    await mods.applicationService.createAndProcess("user-1", "job-1");

    const statusCalls = vi.mocked(mods.applicationRepository.updateStatus).mock.calls.map((c) => c[1].status);
    expect(statusCalls).toContain("MANUAL_REVIEW");
  });

  it("routes to MANUAL_REVIEW when a required question cannot be answered", async () => {
    const mods = await importAll();
    stubCommonDeps(mods);
    vi.mocked(mods.applicationRepository.findByUserAndJob).mockResolvedValue(null);
    vi.mocked(mods.jobMatchService.getOrComputeMatch).mockResolvedValue({ decision: "APPLY", score: 90, matchCategory: "EXCELLENT" } as never);
    vi.mocked(mods.applicationRepository.create).mockResolvedValue(baseApplication as never);
    vi.mocked(mods.generateAnswerForQuestion).mockResolvedValue({
      category: "UNKNOWN",
      status: "BLOCKED",
      answer: null,
      source: null,
      blockedReason: "not found",
    } as never);

    const fakeAdapter = {
      name: "mock-ats",
      isJobStillActive: vi.fn().mockResolvedValue(true),
      getQuestions: vi.fn().mockResolvedValue([{ id: "q1", text: "Some unanswerable question?" }]),
      submit: vi.fn(),
    };
    vi.mocked(mods.resolveApplicationAdapter).mockReturnValue(fakeAdapter as never);

    await mods.applicationService.createAndProcess("user-1", "job-1");

    expect(fakeAdapter.submit).not.toHaveBeenCalled();
    const statusCalls = vi.mocked(mods.applicationRepository.updateStatus).mock.calls.map((c) => c[1].status);
    expect(statusCalls).toContain("MANUAL_REVIEW");
  });

  it("hard-stops to BLOCKED (never MANUAL_REVIEW) when the job is outside configured countries", async () => {
    const mods = await importAll();
    stubCommonDeps(mods);
    vi.mocked(mods.jobPreferenceRepository.getOrCreateForUser).mockResolvedValue({ ...basePreferences, countries: ["United States"] } as never);
    vi.mocked(mods.applicationRepository.findByUserAndJob).mockResolvedValue(null);
    vi.mocked(mods.jobMatchService.getOrComputeMatch).mockResolvedValue({ decision: "APPLY", score: 90, matchCategory: "EXCELLENT" } as never);
    vi.mocked(mods.applicationRepository.create).mockResolvedValue(baseApplication as never);
    vi.mocked(mods.generateAnswerForQuestion).mockResolvedValue(answeredFact as never);

    const fakeAdapter = {
      name: "mock-ats",
      isJobStillActive: vi.fn().mockResolvedValue(true),
      getQuestions: vi.fn().mockResolvedValue([]),
      submit: vi.fn(),
    };
    vi.mocked(mods.resolveApplicationAdapter).mockReturnValue(fakeAdapter as never);

    await mods.applicationService.createAndProcess("user-1", "job-1");

    expect(fakeAdapter.submit).not.toHaveBeenCalled();
    const statusCalls = vi.mocked(mods.applicationRepository.updateStatus).mock.calls.map((c) => c[1].status);
    expect(statusCalls).toContain("BLOCKED");
    expect(statusCalls).not.toContain("MANUAL_REVIEW");
  });

  it("routes to MANUAL_REVIEW when the adapter reports a CAPTCHA during submission", async () => {
    const mods = await importAll();
    stubCommonDeps(mods);
    vi.mocked(mods.applicationRepository.findByUserAndJob).mockResolvedValue(null);
    vi.mocked(mods.jobMatchService.getOrComputeMatch).mockResolvedValue({ decision: "APPLY", score: 90, matchCategory: "EXCELLENT" } as never);
    vi.mocked(mods.applicationRepository.create).mockResolvedValue(baseApplication as never);
    vi.mocked(mods.generateAnswerForQuestion).mockResolvedValue(answeredFact as never);

    const { CaptchaDetectedError } = await import("./adapters/applicationAdapter.types");
    const fakeAdapter = {
      name: "mock-ats",
      isJobStillActive: vi.fn().mockResolvedValue(true),
      getQuestions: vi.fn().mockResolvedValue([]),
      submit: vi.fn().mockRejectedValue(new CaptchaDetectedError("captcha")),
    };
    vi.mocked(mods.resolveApplicationAdapter).mockReturnValue(fakeAdapter as never);

    await mods.applicationService.createAndProcess("user-1", "job-1");

    const statusCalls = vi.mocked(mods.applicationRepository.updateStatus).mock.calls.map((c) => c[1].status);
    expect(statusCalls).toContain("MANUAL_REVIEW");
  });
});

describe("applicationService.retry", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects retrying an application that is not in a retryable status", async () => {
    const mods = await importAll();
    vi.mocked(mods.applicationRepository.findOwnedById).mockResolvedValue({ ...baseApplication, status: "SUBMITTED" } as never);

    await expect(mods.applicationService.retry("user-1", "app-1")).rejects.toThrow(/cannot be retried/);
  });

  it("unskips a SKIPPED application and re-runs the pipeline", async () => {
    const mods = await importAll();
    stubCommonDeps(mods);
    vi.mocked(mods.applicationRepository.findOwnedById).mockResolvedValue({ ...baseApplication, status: "SKIPPED" } as never);
    vi.mocked(mods.generateAnswerForQuestion).mockResolvedValue(answeredFact as never);
    const fakeAdapter = {
      name: "mock-ats",
      isJobStillActive: vi.fn().mockResolvedValue(true),
      getQuestions: vi.fn().mockResolvedValue([]),
      submit: vi.fn().mockResolvedValue({ externalApplicationId: "mock-app-unskip" }),
    };
    vi.mocked(mods.resolveApplicationAdapter).mockReturnValue(fakeAdapter as never);

    await mods.applicationService.retry("user-1", "app-1");

    expect(mods.applicationEventRepository.record).toHaveBeenCalledWith("app-1", "QUALIFIED", "Unskipped by the user.");
    expect(fakeAdapter.submit).toHaveBeenCalledTimes(1);
  });

  it("resets status to QUALIFIED and re-runs the pipeline for a FAILED application", async () => {
    const mods = await importAll();
    stubCommonDeps(mods);
    vi.mocked(mods.applicationRepository.findOwnedById).mockResolvedValue({ ...baseApplication, status: "FAILED" } as never);
    vi.mocked(mods.generateAnswerForQuestion).mockResolvedValue(answeredFact as never);
    const fakeAdapter = {
      name: "mock-ats",
      isJobStillActive: vi.fn().mockResolvedValue(true),
      getQuestions: vi.fn().mockResolvedValue([]),
      submit: vi.fn().mockResolvedValue({ externalApplicationId: "mock-app-2" }),
    };
    vi.mocked(mods.resolveApplicationAdapter).mockReturnValue(fakeAdapter as never);

    await mods.applicationService.retry("user-1", "app-1");

    expect(fakeAdapter.submit).toHaveBeenCalledTimes(1);
  });
});

describe("applicationService.skip", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects skipping an already-submitted application", async () => {
    const mods = await importAll();
    vi.mocked(mods.applicationRepository.findOwnedById).mockResolvedValue({ ...baseApplication, status: "SUBMITTED" } as never);

    await expect(mods.applicationService.skip("user-1", "app-1")).rejects.toThrow(/already been submitted/);
  });

  it("sets status to SKIPPED otherwise", async () => {
    const mods = await importAll();
    vi.mocked(mods.applicationRepository.findOwnedById).mockResolvedValue(baseApplication as never);
    vi.mocked(mods.applicationEventRepository.record).mockResolvedValue({} as never);
    vi.mocked(mods.applicationRepository.updateStatus).mockResolvedValue({ ...baseApplication, status: "SKIPPED" } as never);

    const result = await mods.applicationService.skip("user-1", "app-1");

    expect(mods.applicationRepository.updateStatus).toHaveBeenCalledWith("app-1", { status: "SKIPPED" });
    expect(result.status).toBe("SKIPPED");
  });
});
