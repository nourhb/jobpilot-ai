import { Router } from "express";
import { healthController } from "../controllers/health.controller";
import { asyncHandler } from "../utils/asyncHandler";

/**
 * Section 55: detailed dependency probes stay development-only.
 * Process liveness (`GET /api/health`) and readiness (`GET /api/ready`)
 * are mounted separately so Docker/k8s can probe production safely.
 */
export const healthRouter = Router();

healthRouter.get("/database", asyncHandler(healthController.database));
healthRouter.get("/redis", asyncHandler(healthController.redisHealth));
healthRouter.get("/ai", asyncHandler(healthController.ai));
