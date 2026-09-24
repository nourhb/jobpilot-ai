import { Router } from "express";
import { jobListQuerySchema } from "@jobpilot/shared";
import { jobsController } from "../controllers/jobs.controller";
import { requireAuth } from "../middleware/requireAuth";
import { validateQuery } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";

export const jobsRouter = Router();

jobsRouter.use(requireAuth);

jobsRouter.get("/", validateQuery(jobListQuerySchema), asyncHandler(jobsController.listJobs));
jobsRouter.get("/:id", asyncHandler(jobsController.getJob));
jobsRouter.get("/:id/match", asyncHandler(jobsController.getJobMatch));
