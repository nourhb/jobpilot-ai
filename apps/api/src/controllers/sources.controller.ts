import type { Request, Response } from "express";
import { jobSourceRepository } from "../repositories/jobSource.repository";

/** Section 55: development-only diagnostic listing of configured job sources. */
export const sourcesController = {
  async listSources(_req: Request, res: Response): Promise<void> {
    const sources = await jobSourceRepository.list();
    res.status(200).json({ success: true, data: { sources } });
  },
};
