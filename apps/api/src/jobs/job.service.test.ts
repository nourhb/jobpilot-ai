import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../middleware/errorHandler";

vi.mock("../repositories/job.repository", () => ({
  jobRepository: {
    list: vi.fn(),
    findById: vi.fn(),
  },
}));

describe("jobService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("lists jobs with pagination metadata", async () => {
    const { jobRepository } = await import("../repositories/job.repository");
    const { jobService } = await import("./job.service");

    vi.mocked(jobRepository.list).mockResolvedValue({ items: [{ id: "job-1" }], total: 42 } as never);

    const result = await jobService.listJobs({ page: 2, pageSize: 20 });

    expect(jobRepository.list).toHaveBeenCalledWith(expect.objectContaining({ page: 2, pageSize: 20 }));
    expect(result.pagination).toEqual({ page: 2, pageSize: 20, total: 42, totalPages: 3 });
  });

  it("throws a 404 when the job does not exist", async () => {
    const { jobRepository } = await import("../repositories/job.repository");
    const { jobService } = await import("./job.service");

    vi.mocked(jobRepository.findById).mockResolvedValue(null);

    await expect(jobService.getJobById("missing")).rejects.toBeInstanceOf(AppError);
  });

  it("forwards field and domain filters to the repository", async () => {
    const { jobRepository } = await import("../repositories/job.repository");
    const { jobService } = await import("./job.service");

    vi.mocked(jobRepository.list).mockResolvedValue({ items: [], total: 0 } as never);

    await jobService.listJobs({ page: 1, pageSize: 20, field: "SOFTWARE", domain: "CLOUD" });

    expect(jobRepository.list).toHaveBeenCalledWith(expect.objectContaining({ field: "SOFTWARE", domain: "CLOUD" }));
  });
});
