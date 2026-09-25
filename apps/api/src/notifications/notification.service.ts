import type { NotificationType } from "@prisma/client";
import { notificationRepository } from "../repositories/notification.repository";
import { logger } from "../lib/logger";

/**
 * Phase 9 (section 50). In-app notifications only -- no email/SMS
 * provider, consistent with `local_only`. Failures here must never
 * break the Application Engine.
 */
export const notificationService = {
  async notify(input: { userId: string; type: NotificationType; title: string; body: string; entityType?: string; entityId?: string }) {
    try {
      return await notificationRepository.create(input);
    } catch (error) {
      logger.error({ err: error, type: input.type, userId: input.userId }, "Failed to create notification");
      return null;
    }
  },

  list(userId: string, unreadOnly: boolean) {
    return notificationRepository.list(userId, unreadOnly);
  },

  async markRead(userId: string, id: string) {
    return notificationRepository.markRead(userId, id);
  },

  markAllRead(userId: string) {
    return notificationRepository.markAllRead(userId);
  },
};
