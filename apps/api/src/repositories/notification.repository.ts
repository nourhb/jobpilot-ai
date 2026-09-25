import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export const notificationRepository = {
  create(input: { userId: string; type: NotificationType; title: string; body: string; entityType?: string; entityId?: string }) {
    return prisma.notification.create({ data: input });
  },

  async list(userId: string, unreadOnly: boolean) {
    const where: Prisma.NotificationWhereInput = { userId, ...(unreadOnly ? { read: false } : {}) };
    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.notification.count({ where: { userId, read: false } }),
    ]);
    return { items, unreadCount };
  },

  async markRead(userId: string, id: string) {
    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) return null;
    return prisma.notification.update({ where: { id }, data: { read: true } });
  },

  markAllRead(userId: string) {
    return prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  },
};
