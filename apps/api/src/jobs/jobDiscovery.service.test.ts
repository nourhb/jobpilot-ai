import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../adapters/registry", () => ({
  getAdapterForSource: vi.fn(),
}));
vi.mock("../repositories/job.repository", () => ({
  jobRepository: {
    findBySourceAndExternalId: vi.fn(),
    findFingerprintBySecondaryKey: vi.fn(),
    upsertBySourceAndExternalId: vi.fn(),
  },
}));
vi.mock("../repositories/jobSource.repository", () => ({
  jobSourceRepository: {
    listEnabled: vi.fn(),
  },
}));
vi.mock("../audit/audit.service", () => ({
  auditService: { log: vi.fn() },
}));

const mockSource = { id: "source-1", name: "mock", type: "MOCK", config: {} };

function makeRawJob(externalId: string) {
  return {
    sourceName: "mock",
    externalId,
    raw: {
      externalId,
      title: "Cloud Engineer",
      company: "Acme Inc.",
      description: "Build cloud infrastructure.",
      location: "Toronto, Ontario, Canada",
      remote: true,
      employmentType: "FULL_TIME",
      postedAt: "2026-01-01T00:00:00.000Z",
    },
    fetchedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("jobDiscoveryService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("runForSource", () => {
    it("stores newly discovered jobs and reports counts", async () => {
      const { getAdapterForSource } = await import("../adapters/registry");
      const { jobRepository } = await import("../repositories/job.repository");
      const { jobDiscoveryService } = await import("./jobDiscovery.service");

      vi.mocked(getAdapterForSource).mockReturnValue({
        sourceName: "mock",
        discoverJobs: vi.fn().mockResolvedValue([makeRawJob("ext-1")]),
        getJobDetails: vi.fn(),
      });
      vi.mocked(jobRepository.findBySourceAndExternalId).mockResolvedValue(null);
      vi.mocked(jobRepository.findFingerprintBySecondaryKey).mockResolvedValue(null);
      vi.mocked(jobRepository.upsertBySourceAndExternalId).mockResolvedValue({ id: "job-1" } as never);

      const result = await jobDiscoveryService.runForSource(mockSource);

      expect(result).toEqual({ sourceName: "mock", fetched: 1, stored: 1, skippedDuplicates: 0, errors: 0 });
      expect(jobRepository.upsertBySourceAndExternalId).toHaveBeenCalledWith(
        expect.objectContaining({ sourceId: "source-1", externalId: "ext-1", title: "Cloud Engineer" }),
      );
    });

    it("skips a job whose secondary dedupe key already exists under a different sourceId/externalId", async () => {
      const { getAdapterForSource } = await import("../adapters/registry");
      const { jobRepository } = await import("../repositories/job.repository");
      const { jobDiscoveryService } = await import("./jobDiscovery.service");

      vi.mocked(getAdapterForSource).mockReturnValue({
        sourceName: "mock",
        discoverJobs: vi.fn().mockResolvedValue([makeRawJob("ext-2")]),
        getJobDetails: vi.fn(),
      });
      vi.mocked(jobRepository.findBySourceAndExternalId).mockResolvedValue(null);
      vi.mocked(jobRepository.findFingerprintBySecondaryKey).mockResolvedValue({ id: "existing-job" } as never);

      const result = await jobDiscoveryService.runForSource(mockSource);

      expect(result).toEqual({ sourceName: "mock", fetched: 1, stored: 0, skippedDuplicates: 1, errors: 0 });
      expect(jobRepository.upsertBySourceAndExternalId).not.toHaveBeenCalled();
    });

    it("re-upserts a job already stored under the same sourceId/externalId without re-checking the secondary key", async () => {
      const { getAdapterForSource } = await import("../adapters/registry");
      const { jobRepository } = await import("../repositories/job.repository");
      const { jobDiscoveryService } = await import("./jobDiscovery.service");

      vi.mocked(getAdapterForSource).mockReturnValue({
        sourceName: "mock",
        discoverJobs: vi.fn().mockResolvedValue([makeRawJob("ext-3")]),
        getJobDetails: vi.fn(),
      });
      vi.mocked(jobRepository.findBySourceAndExternalId).mockResolvedValue({ id: "job-3" } as never);
      vi.mocked(jobRepository.upsertBySourceAndExternalId).mockResolvedValue({ id: "job-3" } as never);

      const result = await jobDiscoveryService.runForSource(mockSource);

      expect(result.stored).toBe(1);
      expect(result.skippedDuplicates).toBe(0);
      // The already-stored branch must never call the secondary-key
      // lookup -- otherwise a job would match its own fingerprint and
      // never be updated again on subsequent discovery runs.
      expect(jobRepository.findFingerprintBySecondaryKey).not.toHaveBeenCalled();
    });

    it("counts a failure for one bad job without aborting the whole run", async () => {
      const { getAdapterForSource } = await import("../adapters/registry");
      const { jobRepository } = await import("../repositories/job.repository");
      const { jobDiscoveryService } = await import("./jobDiscovery.service");

      vi.mocked(getAdapterForSource).mockReturnValue({
        sourceName: "mock",
        discoverJobs: vi.fn().mockResolvedValue([makeRawJob("ext-4"), makeRawJob("ext-5")]),
        getJobDetails: vi.fn(),
      });
      vi.mocked(jobRepository.findBySourceAndExternalId).mockResolvedValue(null);
      vi.mocked(jobRepository.findFingerprintBySecondaryKey).mockResolvedValue(null);
      vi.mocked(jobRepository.upsertBySourceAndExternalId)
        .mockRejectedValueOnce(new Error("db exploded"))
        .mockResolvedValueOnce({ id: "job-5" } as never);

      const result = await jobDiscoveryService.runForSource(mockSource);

      expect(result.errors).toBe(1);
      expect(result.stored).toBe(1);
    });

    it("records a source-level error (not a crash) when the adapter itself is disabled/unavailable", async () => {
      const { getAdapterForSource } = await import("../adapters/registry");
      const { jobDiscoveryService } = await import("./jobDiscovery.service");

      vi.mocked(getAdapterForSource).mockImplementation(() => {
        throw new Error('Source type "GREENHOUSE" is disabled by its environment flag.');
      });

      const result = await jobDiscoveryService.runForSource({ id: "source-2", name: "greenhouse-acme", type: "GREENHOUSE", config: {} });

      expect(result).toEqual({ sourceName: "greenhouse-acme", fetched: 0, stored: 0, skippedDuplicates: 0, errors: 1 });
    });

    it("records a source-level error (not a crash) when discoverJobs itself throws", async () => {
      const { getAdapterForSource } = await import("../adapters/registry");
      const { jobDiscoveryService } = await import("./jobDiscovery.service");

      vi.mocked(getAdapterForSource).mockReturnValue({
        sourceName: "greenhouse-acme",
        discoverJobs: vi.fn().mockRejectedValue(new Error("network error")),
        getJobDetails: vi.fn(),
      });

      const result = await jobDiscoveryService.runForSource({ id: "source-2", name: "greenhouse-acme", type: "GREENHOUSE", config: {} });

      expect(result).toEqual({ sourceName: "greenhouse-acme", fetched: 0, stored: 0, skippedDuplicates: 0, errors: 1 });
    });
  });

  describe("runForAllEnabledSources", () => {
    it("runs discovery for every enabled source and writes one audit log entry", async () => {
      const { getAdapterForSource } = await import("../adapters/registry");
      const { jobRepository } = await import("../repositories/job.repository");
      const { jobSourceRepository } = await import("../repositories/jobSource.repository");
      const { auditService } = await import("../audit/audit.service");
      const { jobDiscoveryService } = await import("./jobDiscovery.service");

      vi.mocked(jobSourceRepository.listEnabled).mockResolvedValue([mockSource] as never);
      vi.mocked(getAdapterForSource).mockReturnValue({
        sourceName: "mock",
        discoverJobs: vi.fn().mockResolvedValue([makeRawJob("ext-6")]),
        getJobDetails: vi.fn(),
      });
      vi.mocked(jobRepository.findBySourceAndExternalId).mockResolvedValue(null);
      vi.mocked(jobRepository.findFingerprintBySecondaryKey).mockResolvedValue(null);
      vi.mocked(jobRepository.upsertBySourceAndExternalId).mockResolvedValue({ id: "job-6" } as never);

      const results = await jobDiscoveryService.runForAllEnabledSources();

      expect(results).toHaveLength(1);
      expect(auditService.log).toHaveBeenCalledWith("JOB_DISCOVERY_RUN", expect.anything());
    });
  });
});
