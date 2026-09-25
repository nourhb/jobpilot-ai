import { Router } from "express";
import { authRouter } from "./auth.routes";
import { healthRouter } from "./health.routes";
import { accountRouter } from "./account.routes";
import { profileRouter } from "./profile.routes";
import { jobsRouter } from "./jobs.routes";
import { preferencesRouter } from "./preferences.routes";
import { sourcesRouter } from "./sources.routes";
import { applicationsRouter } from "./applications.routes";
import { dashboardRouter } from "./dashboard.routes";
import { agentRouter } from "./agent.routes";
import { notificationsRouter } from "./notifications.routes";
import { mockAtsRouter } from "../mockAts/mockAts.router";
import { healthController } from "../controllers/health.controller";
import { metricsController } from "../controllers/metrics.controller";
import { asyncHandler } from "../utils/asyncHandler";
import { env } from "../config/env";

export const apiRouter = Router();

apiRouter.get("/health", asyncHandler(healthController.liveness));
apiRouter.get("/ready", asyncHandler(healthController.readiness));
apiRouter.get("/metrics", metricsController.get);

apiRouter.use("/auth", authRouter);
apiRouter.use("/account", accountRouter);
apiRouter.use("/profile", profileRouter);
apiRouter.use("/jobs", jobsRouter);
apiRouter.use("/preferences", preferencesRouter);
apiRouter.use("/applications", applicationsRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/agent", agentRouter);
apiRouter.use("/notifications", notificationsRouter);

// Section 55: detailed dependency probes stay development-only.
// Process liveness (`GET /api/health`) and readiness (`GET /api/ready`)
// stay mounted above so production Docker/k8s can still probe.
if (env.NODE_ENV !== "production") {
  apiRouter.use("/health", healthRouter);
  apiRouter.use("/sources", sourcesRouter);
  // Section 60: must never be reachable once real ATS adapters (Phase 7)
  // exist -- this is a stand-in fake employer system, not a real one.
  apiRouter.use("/_mock-ats", mockAtsRouter);
}
