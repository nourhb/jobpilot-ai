import { apiRequest } from "./apiClient";

export interface NotificationRecord {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
}

export const notificationsService = {
  list() {
    return apiRequest<{ items: NotificationRecord[]; unreadCount: number }>("/api/notifications");
  },

  markRead(id: string) {
    return apiRequest<{ notification: NotificationRecord }>(`/api/notifications/${id}/read`, { method: "POST" });
  },

  markAllRead() {
    return apiRequest<{ ok: boolean }>("/api/notifications/read-all", { method: "POST" });
  },
};
