import { Router } from "express";
import { authRouter } from "./auth.routes";
import { healthRouter } from "./health.routes";
import { profileRouter } from "./profile.routes";
import { jobsRouter } from "./jobs.routes";
import { preferencesRouter } from "./preferences.routes";
import { sourcesRouter } from "./sources.routes";
import { applicationsRouter } from "./applications.routes";
import { mockAtsRouter } from "../mockAts/mockAts.router";
import { env } from "../config/env";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/profile", profileRouter);
apiRouter.use("/jobs", jobsRouter);
apiRouter.use("/preferences", preferencesRouter);
apiRouter.use("/applications", applicationsRouter);

// Section 55: health/diagnostics endpoints are development-only.
if (env.NODE_ENV !== "production") {
  apiRouter.use("/health", healthRouter);
  apiRouter.use("/sources", sourcesRouter);
  // Section 60: must never be reachable once real ATS adapters (Phase 7)
  // exist -- this is a stand-in fake employer system, not a real one.
  apiRouter.use("/_mock-ats", mockAtsRouter);
}
