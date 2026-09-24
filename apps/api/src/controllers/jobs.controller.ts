import type { Request, Response } from "express";
import type { JobListQuery } from "@jobpilot/shared";
import { jobService } from "../jobs/job.service";

export const jobsController = {
  async listJobs(req: Request<unknown, unknown, unknown, JobListQuery>, res: Response): Promise<void> {
    const result = await jobService.listJobs(req.query);
    res.status(200).json({ success: true, data: result });
  },

  async getJob(req: Request<{ id: string }>, res: Response): Promise<void> {
    const job = await jobService.getJobById(req.params.id);
    res.status(200).json({ success: true, data: { job } });
  },
};
