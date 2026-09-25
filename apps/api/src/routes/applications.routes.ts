import { Router } from "express";
import { applicationListQuerySchema } from "@jobpilot/shared";
import { applicationsController } from "../controllers/applications.controller";
import { requireAuth } from "../middleware/requireAuth";
import { validateQuery } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";

export const applicationsRouter = Router();

applicationsRouter.use(requireAuth);

applicationsRouter.get("/", validateQuery(applicationListQuerySchema), asyncHandler(applicationsController.listApplications));
applicationsRouter.get("/:id", asyncHandler(applicationsController.getApplication));
applicationsRouter.post("/:id/retry", asyncHandler(applicationsController.retryApplication));
applicationsRouter.post("/:id/skip", asyncHandler(applicationsController.skipApplication));
applicationsRouter.post("/:id/mark-submitted", asyncHandler(applicationsController.markSubmitted));
