import type { Request, Response } from "express";
import type { NotificationListQuery } from "@jobpilot/shared";
import { notificationService } from "../notifications/notification.service";
import { requireUserId } from "../utils/requireUserId";
import { AppError } from "../middleware/errorHandler";

export const notificationsController = {
  async list(req: Request<unknown, unknown, unknown, NotificationListQuery>, res: Response): Promise<void> {
    const result = await notificationService.list(requireUserId(req), req.query.unreadOnly === "true");
    res.status(200).json({ success: true, data: result });
  },

  async markRead(req: Request<{ id: string }>, res: Response): Promise<void> {
    const notification = await notificationService.markRead(requireUserId(req), req.params.id);
    if (!notification) throw new AppError(404, "NOTIFICATION_NOT_FOUND", "Notification not found.");
    res.status(200).json({ success: true, data: { notification } });
  },

  async markAllRead(req: Request, res: Response): Promise<void> {
    await notificationService.markAllRead(requireUserId(req));
    res.status(200).json({ success: true, data: { ok: true } });
  },
};
