import { Router } from "express";
import { authRouter } from "./auth.routes";
import { healthRouter } from "./health.routes";
import { profileRouter } from "./profile.routes";
import { env } from "../config/env";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/profile", profileRouter);

// Section 55: health/diagnostics endpoints are development-only.
if (env.NODE_ENV !== "production") {
  apiRouter.use("/health", healthRouter);
}
