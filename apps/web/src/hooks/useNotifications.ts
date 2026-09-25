import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsService } from "@/services/notificationsService";

const NOTIFICATIONS_KEY = ["notifications"] as const;

export function useNotifications() {
  return useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: () => notificationsService.list(),
    refetchInterval: 15_000,
  });
}

export function useNotificationActions() {
  const queryClient = useQueryClient();
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });

  return {
    markRead: useMutation({ mutationFn: (id: string) => notificationsService.markRead(id), onSuccess: invalidate }),
    markAllRead: useMutation({ mutationFn: () => notificationsService.markAllRead(), onSuccess: invalidate }),
  };
}
