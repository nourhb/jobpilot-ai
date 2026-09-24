import type { Request, Response } from "express";
import type { JobPreferenceUpdateInput } from "@jobpilot/shared";
import { preferencesService } from "../preferences/preferences.service";
import { requireUserId } from "../utils/requireUserId";

export const preferencesController = {
  async getPreferences(req: Request, res: Response): Promise<void> {
    const preferences = await preferencesService.getPreferences(requireUserId(req));
    res.status(200).json({ success: true, data: { preferences } });
  },

  async updatePreferences(req: Request<unknown, unknown, JobPreferenceUpdateInput>, res: Response): Promise<void> {
    const preferences = await preferencesService.updatePreferences(requireUserId(req), req.body);
    res.status(200).json({ success: true, data: { preferences } });
  },
};
