import { useQuery } from "@tanstack/react-query";
import { jobsService, type JobListQueryParams } from "@/services/jobsService";

export function useJobs(params: JobListQueryParams = {}) {
  return useQuery({
    queryKey: ["jobs", params],
    queryFn: () => jobsService.listJobs(params),
  });
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: ["jobs", id],
    queryFn: async () => (await jobsService.getJob(id!)).job,
    enabled: Boolean(id),
  });
}

/**
 * Deliberately NOT auto-fetched on job-detail page load: computing a
 * match calls the AI provider (section 25), so it's triggered by an
 * explicit "Check match" action instead of happening silently every
 * time a job is viewed.
 */
export function useJobMatch(id: string | undefined) {
  return useQuery({
    queryKey: ["jobs", id, "match"],
    queryFn: async () => (await jobsService.getJobMatch(id!)).match,
    enabled: false,
  });
}

export function useRecommendedJobs() {
  return useQuery({
    queryKey: ["jobs", "matches"],
    queryFn: () => jobsService.listMatches(),
  });
}
