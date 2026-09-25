import type { Request, Response } from "express";
import { renderMetrics } from "../lib/metrics";

export const metricsController = {
  get(_req: Request, res: Response): void {
    res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    res.status(200).send(renderMetrics());
  },
};
