import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { applicationsService } from "@/services/applicationsService";

const APPLICATIONS_KEY = ["applications"] as const;

export function useApplications(status?: string) {
  return useQuery({
    queryKey: [...APPLICATIONS_KEY, status ?? "all"],
    queryFn: () => applicationsService.list(status),
  });
}

export function useApplication(id: string | undefined) {
  return useQuery({
    queryKey: [...APPLICATIONS_KEY, "detail", id],
    queryFn: async () => (await applicationsService.getById(id!)).application,
    enabled: Boolean(id),
  });
}

export function useApplicationActions(id: string) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: APPLICATIONS_KEY });
  };

  return {
    retry: useMutation({ mutationFn: () => applicationsService.retry(id), onSuccess: invalidate }),
    skip: useMutation({ mutationFn: () => applicationsService.skip(id), onSuccess: invalidate }),
    markSubmitted: useMutation({ mutationFn: () => applicationsService.markSubmitted(id), onSuccess: invalidate }),
  };
}
