import { Router } from "express";
import { jobPreferenceUpdateSchema } from "@jobpilot/shared";
import { preferencesController } from "../controllers/preferences.controller";
import { requireAuth } from "../middleware/requireAuth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";

export const preferencesRouter = Router();

preferencesRouter.use(requireAuth);

preferencesRouter.get("/", asyncHandler(preferencesController.getPreferences));
preferencesRouter.put("/", validateBody(jobPreferenceUpdateSchema), asyncHandler(preferencesController.updatePreferences));
