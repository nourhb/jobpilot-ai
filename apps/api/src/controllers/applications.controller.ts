import type { Request, Response } from "express";
import type { ApplicationListQuery } from "@jobpilot/shared";
import { applicationService } from "../applications/application.service";
import { requireUserId } from "../utils/requireUserId";

export const applicationsController = {
  async createApplication(req: Request, res: Response): Promise<void> {
    const application = await applicationService.createAndProcess(requireUserId(req), req.body.jobId, { force: true });
    res.status(201).json({ success: true, data: { application } });
  },

  async listApplications(req: Request<unknown, unknown, unknown, ApplicationListQuery>, res: Response): Promise<void> {
    const result = await applicationService.list(requireUserId(req), {
      status: req.query.status,
      page: req.query.page,
      pageSize: req.query.pageSize,
    });
    res.status(200).json({ success: true, data: result });
  },

  async getApplication(req: Request<{ id: string }>, res: Response): Promise<void> {
    const application = await applicationService.getById(requireUserId(req), req.params.id);
    res.status(200).json({ success: true, data: { application } });
  },

  async retryApplication(req: Request<{ id: string }>, res: Response): Promise<void> {
    const application = await applicationService.retry(requireUserId(req), req.params.id);
    res.status(200).json({ success: true, data: { application } });
  },

  async skipApplication(req: Request<{ id: string }>, res: Response): Promise<void> {
    const application = await applicationService.skip(requireUserId(req), req.params.id);
    res.status(200).json({ success: true, data: { application } });
  },

  async markSubmitted(req: Request<{ id: string }>, res: Response): Promise<void> {
    const application = await applicationService.markSubmitted(requireUserId(req), req.params.id);
    res.status(200).json({ success: true, data: { application } });
  },
};
