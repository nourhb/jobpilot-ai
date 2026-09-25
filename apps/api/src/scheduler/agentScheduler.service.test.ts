import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentQueue } from "./agentScheduler.service";

vi.mock("../repositories/jobPreference.repository", () => ({
  jobPreferenceRepository: {
    getOrCreateForUser: vi.fn(),
    listAutoApplyEnabled: vi.fn(),
    listRunnable: vi.fn(),
  },
}));
vi.mock("../repositories/job.repository", () => ({
  jobRepository: {
    listActiveIds: vi.fn(),
    findByIdWithSource: vi.fn(),
  },
}));
vi.mock("../repositories/jobMatch.repository", () => ({
  jobMatchRepository: {
    listJobIdsForUser: vi.fn(),
    listApplyJobIdsForUser: vi.fn(),
  },
}));
vi.mock("../repositories/application.repository", () => ({
  applicationRepository: {
    findByUserAndJob: vi.fn(),
    countCreatedSince: vi.fn(),
  },
}));

function fakeQueue(): AgentQueue & { discovery: number; matches: string[]; applications: string[] } {
  const recorded = { discovery: 0, matches: [] as string[], applications: [] as string[] };
  return {
    ...recorded,
    enqueueDiscovery: async () => {
      recorded.discovery += 1;
    },
    enqueueMatch: async (userId, jobId) => {
      recorded.matches.push(`${userId}:${jobId}`);
    },
    enqueueApplication: async (userId, jobId) => {
      recorded.applications.push(`${userId}:${jobId}`);
    },
  };
}

const autoApplyPrefs = {
  userId: "user-1",
  autoApplyEnabled: true,
  maxApplicationsPerDay: 20,
  maxApplicationsPerHour: 5,
  allowedSourceTypes: [],
};

describe("agentSchedulerService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("canAutoApply", () => {
    it("rejects when auto-apply is disabled", async () => {
      const { agentSchedulerService } = await import("./agentScheduler.service");
      const decision = await agentSchedulerService.canAutoApply("user-1", "job-1", { ...autoApplyPrefs, autoApplyEnabled: false });
      expect(decision).toEqual({ allowed: false, reason: "auto-apply is disabled" });
    });

    it("rejects when an application already exists (section 42)", async () => {
      const { applicationRepository } = await import("../repositories/application.repository");
      const { agentSchedulerService } = await import("./agentScheduler.service");
      vi.mocked(applicationRepository.findByUserAndJob).mockResolvedValue({ id: "app-1" } as never);

      const decision = await agentSchedulerService.canAutoApply("user-1", "job-1", autoApplyPrefs);
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toMatch(/already exists/);
    });

    it("rejects when the hourly cap is reached", async () => {
      const { applicationRepository } = await import("../repositories/application.repository");
      const { agentSchedulerService } = await import("./agentScheduler.service");
      vi.mocked(applicationRepository.findByUserAndJob).mockResolvedValue(null);
      vi.mocked(applicationRepository.countCreatedSince).mockResolvedValueOnce(5).mockResolvedValueOnce(5);

      const decision = await agentSchedulerService.canAutoApply("user-1", "job-1", autoApplyPrefs);
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toMatch(/hourly cap/);
    });

    it("rejects when the job's source is not on the allowlist", async () => {
      const { applicationRepository } = await import("../repositories/application.repository");
      const { jobRepository } = await import("../repositories/job.repository");
      const { agentSchedulerService } = await import("./agentScheduler.service");
      vi.mocked(applicationRepository.findByUserAndJob).mockResolvedValue(null);
      vi.mocked(jobRepository.findByIdWithSource).mockResolvedValue({ source: { type: "GREENHOUSE" } } as never);

      const decision = await agentSchedulerService.canAutoApply("user-1", "job-1", {
        ...autoApplyPrefs,
        allowedSourceTypes: ["MOCK"] as never,
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toMatch(/not in the allowlist/);
    });

    it("allows an eligible first application", async () => {
      const { applicationRepository } = await import("../repositories/application.repository");
      const { agentSchedulerService } = await import("./agentScheduler.service");
      vi.mocked(applicationRepository.findByUserAndJob).mockResolvedValue(null);
      vi.mocked(applicationRepository.countCreatedSince).mockResolvedValue(0);

      const decision = await agentSchedulerService.canAutoApply("user-1", "job-1", autoApplyPrefs);
      expect(decision).toEqual({ allowed: true });
    });
  });

  describe("afterMatch", () => {
    it("never auto-applies a REVIEW or SKIP decision", async () => {
      const { agentSchedulerService } = await import("./agentScheduler.service");
      const queue = fakeQueue();

      await expect(agentSchedulerService.afterMatch(queue, "user-1", "job-1", "REVIEW")).resolves.toMatchObject({ allowed: false });
      await expect(agentSchedulerService.afterMatch(queue, "user-1", "job-1", "SKIP")).resolves.toMatchObject({ allowed: false });
      expect(queue.applications).toEqual([]);
    });

    it("enqueues an application for an APPLY decision when auto-apply is on", async () => {
      const { jobPreferenceRepository } = await import("../repositories/jobPreference.repository");
      const { applicationRepository } = await import("../repositories/application.repository");
      const { agentSchedulerService } = await import("./agentScheduler.service");
      vi.mocked(jobPreferenceRepository.getOrCreateForUser).mockResolvedValue(autoApplyPrefs as never);
      vi.mocked(applicationRepository.findByUserAndJob).mockResolvedValue(null);
      vi.mocked(applicationRepository.countCreatedSince).mockResolvedValue(0);

      const queue = fakeQueue();
      const decision = await agentSchedulerService.afterMatch(queue, "user-1", "job-1", "APPLY");

      expect(decision.allowed).toBe(true);
      expect(queue.applications).toEqual(["user-1:job-1"]);
    });
  });

  describe("tick", () => {
    it("enqueues matching only for unmatched active jobs, then auto-applies existing APPLY matches", async () => {
      const { jobPreferenceRepository } = await import("../repositories/jobPreference.repository");
      const { jobRepository } = await import("../repositories/job.repository");
      const { jobMatchRepository } = await import("../repositories/jobMatch.repository");
      const { applicationRepository } = await import("../repositories/application.repository");
      const { agentSchedulerService } = await import("./agentScheduler.service");

      vi.mocked(jobPreferenceRepository.listRunnable).mockResolvedValue([autoApplyPrefs] as never);
      vi.mocked(jobRepository.listActiveIds).mockResolvedValue([{ id: "job-new" }, { id: "job-old" }] as never);
      vi.mocked(jobMatchRepository.listJobIdsForUser).mockResolvedValue([{ jobId: "job-old" }] as never);
      vi.mocked(jobMatchRepository.listApplyJobIdsForUser).mockResolvedValue([{ jobId: "job-old" }] as never);
      vi.mocked(applicationRepository.findByUserAndJob).mockResolvedValue(null);
      vi.mocked(applicationRepository.countCreatedSince).mockResolvedValue(0);

      const queue = fakeQueue();
      const result = await agentSchedulerService.tick(queue);

      expect(result).toEqual({ usersConsidered: 1, matchesEnqueued: 1, applicationsEnqueued: 1, applicationsSkipped: 0 });
      expect(queue.matches).toEqual(["user-1:job-new"]);
      expect(queue.applications).toEqual(["user-1:job-old"]);
    });

    it("does nothing when no user has auto-apply enabled", async () => {
      const { jobPreferenceRepository } = await import("../repositories/jobPreference.repository");
      const { agentSchedulerService } = await import("./agentScheduler.service");
      vi.mocked(jobPreferenceRepository.listRunnable).mockResolvedValue([]);

      const queue = fakeQueue();
      const result = await agentSchedulerService.tick(queue);

      expect(result.usersConsidered).toBe(0);
      expect(queue.matches).toEqual([]);
    });
  });
});
