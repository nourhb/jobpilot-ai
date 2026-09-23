import { Router } from "express";
import { healthController } from "../controllers/health.controller";
import { asyncHandler } from "../utils/asyncHandler";

/**
 * Section 55: development-only diagnostics. Mounted behind an
 * environment guard in app.ts so production never exposes internal
 * dependency status publicly.
 */
export const healthRouter = Router();

healthRouter.get("/", asyncHandler(healthController.liveness));
healthRouter.get("/database", asyncHandler(healthController.database));
healthRouter.get("/redis", asyncHandler(healthController.redisHealth));
healthRouter.get("/ai", asyncHandler(healthController.ai));
