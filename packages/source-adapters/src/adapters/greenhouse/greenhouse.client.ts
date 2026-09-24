import type { GreenhouseJobDetail, GreenhouseJobsResponse } from "./greenhouse.types";

const BASE_URL = "https://boards-api.greenhouse.io/v1/boards";

/**
 * Spec section 16 (Greenhouse): "Implement a dedicated adapter around
 * the public job-board functionality where permitted... Do not build an
 * unofficial scraper." This is exactly that -- a plain `fetch` against
 * Greenhouse's own public, unauthenticated, documented Job Board API.
 * No API key, no login, no bypass of any access control.
 *
 * Per the `unit_fixtures` project decision, this client is exercised
 * only against recorded fixture responses in tests -- never against a
 * real employer's board.
 */
export async function fetchGreenhouseJobs(boardToken: string): Promise<GreenhouseJobsResponse> {
  const response = await fetch(`${BASE_URL}/${encodeURIComponent(boardToken)}/jobs?content=true`);
  if (!response.ok) {
    throw new Error(`Greenhouse job board API returned ${response.status} for board "${boardToken}".`);
  }
  return (await response.json()) as GreenhouseJobsResponse;
}

export async function fetchGreenhouseJobDetail(boardToken: string, jobId: string): Promise<GreenhouseJobDetail> {
  const response = await fetch(`${BASE_URL}/${encodeURIComponent(boardToken)}/jobs/${encodeURIComponent(jobId)}?questions=true`);
  if (!response.ok) {
    throw new Error(`Greenhouse job board API returned ${response.status} for job "${jobId}" on board "${boardToken}".`);
  }
  return (await response.json()) as GreenhouseJobDetail;
}
