import { Router } from "express";
import { notificationListQuerySchema } from "@jobpilot/shared";
import { notificationsController } from "../controllers/notifications.controller";
import { requireAuth } from "../middleware/requireAuth";
import { validateQuery } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);
notificationsRouter.get("/", validateQuery(notificationListQuerySchema), asyncHandler(notificationsController.list));
notificationsRouter.post("/read-all", asyncHandler(notificationsController.markAllRead));
notificationsRouter.post("/:id/read", asyncHandler(notificationsController.markRead));
