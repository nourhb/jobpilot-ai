import type { JobListQuery } from "@jobpilot/shared";
import { jobRepository } from "../repositories/job.repository";
import { AppError } from "../middleware/errorHandler";
import { withApplyUrl } from "./applyUrl";

export const jobService = {
  async listJobs(query: JobListQuery) {
    const { items, total } = await jobRepository.list({
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
      remoteType: query.remoteType,
      employmentType: query.employmentType,
      experienceLevel: query.experienceLevel,
      country: query.country,
      field: query.field,
      domain: query.domain,
    });

    return {
      items: items.map((job) => withApplyUrl(job)),
      pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) },
    };
  },

  async getJobById(id: string) {
    const job = await jobRepository.findById(id);
    if (!job) throw new AppError(404, "JOB_NOT_FOUND", "Job not found.");
    return withApplyUrl(job);
  },
};
