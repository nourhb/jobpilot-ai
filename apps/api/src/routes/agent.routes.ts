import { Router } from "express";
import { agentController } from "../controllers/agent.controller";
import { requireAuth } from "../middleware/requireAuth";
import { asyncHandler } from "../utils/asyncHandler";

export const agentRouter = Router();
agentRouter.use(requireAuth);
agentRouter.get("/", asyncHandler(agentController.getState));
agentRouter.get("/logs", asyncHandler(agentController.listLogs));
agentRouter.post("/:command", asyncHandler(agentController.command));
