import type { JobPreferenceUpdateInput } from "@jobpilot/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { preferencesService } from "@/services/preferencesService";

const PREFERENCES_QUERY_KEY = ["preferences"] as const;

export function usePreferences() {
  return useQuery({
    queryKey: PREFERENCES_QUERY_KEY,
    queryFn: async () => (await preferencesService.getPreferences()).preferences,
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: JobPreferenceUpdateInput) => preferencesService.updatePreferences(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: PREFERENCES_QUERY_KEY }),
  });
}
