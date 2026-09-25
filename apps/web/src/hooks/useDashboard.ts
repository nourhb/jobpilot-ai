import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboardService";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await dashboardService.getOverview()).overview,
  });
}

export function useAnalytics() {
  return useQuery({
    queryKey: ["analytics"],
    queryFn: async () => (await dashboardService.getAnalytics()).analytics,
  });
}
