import type { Request, Response } from "express";
import { dashboardService } from "../dashboard/dashboard.service";
import { requireUserId } from "../utils/requireUserId";

export const dashboardController = {
  async getOverview(req: Request, res: Response): Promise<void> {
    const overview = await dashboardService.getOverview(requireUserId(req));
    res.status(200).json({ success: true, data: { overview } });
  },

  async getAnalytics(req: Request, res: Response): Promise<void> {
    const analytics = await dashboardService.getAnalytics(requireUserId(req));
    res.status(200).json({ success: true, data: { analytics } });
  },
};
