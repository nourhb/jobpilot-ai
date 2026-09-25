import { z } from "zod";

export const notificationListQuerySchema = z.object({
  unreadOnly: z.enum(["true", "false"]).optional(),
});
export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;
