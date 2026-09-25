import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../jobs/jobDiscovery.service", () => ({
  jobDiscoveryService: { runForAllEnabledSources: vi.fn() },
}));
vi.mock("../matching/jobMatch.service", () => ({
  jobMatchService: { getOrComputeMatch: vi.fn() },
}));
vi.mock("../applications/application.service", () => ({
  applicationService: { createAndProcess: vi.fn() },
}));
vi.mock("../scheduler/agentScheduler.service", () => ({
  agentSchedulerService: { tick: vi.fn(), afterMatch: vi.fn() },
}));

describe("createProcessors", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("runs discovery then a scheduler tick", async () => {
    const { jobDiscoveryService } = await import("../jobs/jobDiscovery.service");
    const { agentSchedulerService } = await import("../scheduler/agentScheduler.service");
    const { createProcessors } = await import("./processors");
    vi.mocked(jobDiscoveryService.runForAllEnabledSources).mockResolvedValue([]);
    vi.mocked(agentSchedulerService.tick).mockResolvedValue({ usersConsidered: 0, matchesEnqueued: 0, applicationsEnqueued: 0, applicationsSkipped: 0 });

    const queue = { enqueueDiscovery: vi.fn(), enqueueMatch: vi.fn(), enqueueApplication: vi.fn() };
    await createProcessors(queue).processDiscovery();

    expect(jobDiscoveryService.runForAllEnabledSources).toHaveBeenCalledOnce();
    expect(agentSchedulerService.tick).toHaveBeenCalledWith(queue);
  });

  it("computes a match then asks the scheduler whether to auto-apply", async () => {
    const { jobMatchService } = await import("../matching/jobMatch.service");
    const { agentSchedulerService } = await import("../scheduler/agentScheduler.service");
    const { createProcessors } = await import("./processors");
    vi.mocked(jobMatchService.getOrComputeMatch).mockResolvedValue({ decision: "APPLY" } as never);

    const queue = { enqueueDiscovery: vi.fn(), enqueueMatch: vi.fn(), enqueueApplication: vi.fn() };
    await createProcessors(queue).processMatch({ userId: "user-1", jobId: "job-1" });

    expect(jobMatchService.getOrComputeMatch).toHaveBeenCalledWith("user-1", "job-1");
    expect(agentSchedulerService.afterMatch).toHaveBeenCalledWith(queue, "user-1", "job-1", "APPLY");
  });

  it("delegates application jobs to createAndProcess (Zero Mistake pipeline)", async () => {
    const { applicationService } = await import("../applications/application.service");
    const { createProcessors } = await import("./processors");
    vi.mocked(applicationService.createAndProcess).mockResolvedValue({ id: "app-1" } as never);

    const queue = { enqueueDiscovery: vi.fn(), enqueueMatch: vi.fn(), enqueueApplication: vi.fn() };
    await createProcessors(queue).processApplication({ userId: "user-1", jobId: "job-1" });

    expect(applicationService.createAndProcess).toHaveBeenCalledWith("user-1", "job-1");
  });
});
