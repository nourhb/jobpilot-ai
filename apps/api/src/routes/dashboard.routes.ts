import { Router } from "express";
import { dashboardController } from "../controllers/dashboard.controller";
import { requireAuth } from "../middleware/requireAuth";
import { asyncHandler } from "../utils/asyncHandler";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);
dashboardRouter.get("/", asyncHandler(dashboardController.getOverview));
dashboardRouter.get("/analytics", asyncHandler(dashboardController.getAnalytics));
