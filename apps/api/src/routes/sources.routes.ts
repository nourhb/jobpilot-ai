import { Router } from "express";
import { sourcesController } from "../controllers/sources.controller";
import { asyncHandler } from "../utils/asyncHandler";

/** Mounted only in non-production environments, alongside /api/health/*. */
export const sourcesRouter = Router();

sourcesRouter.get("/", asyncHandler(sourcesController.listSources));
