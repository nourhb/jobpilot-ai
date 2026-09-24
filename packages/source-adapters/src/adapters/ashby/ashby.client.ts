import type { AshbyApplicationForm, AshbyJobBoardResponse, AshbySubmitPayload, AshbySubmitResult } from "./ashby.types";

const BASE_URL = "https://api.ashbyhq.com/posting-api/job-board";

/**
 * Real, documented, unauthenticated Ashby Job Board API (spec section
 * 18). Ashby's public API returns the full board (org + all published
 * jobs) in one response -- there is no separate authenticated per-job
 * detail endpoint, so `getJobDetails` (in ashby.adapter.ts) re-fetches
 * the whole board and finds the job by id.
 */
export async function fetchAshbyJobBoard(jobBoardName: string): Promise<AshbyJobBoardResponse> {
  const response = await fetch(`${BASE_URL}/${encodeURIComponent(jobBoardName)}`);
  if (!response.ok) {
    throw new Error(`Ashby job board API returned ${response.status} for board "${jobBoardName}".`);
  }
  return (await response.json()) as AshbyJobBoardResponse;
}

/** Spec section 18's cited application-form-specification retrieval. */
export async function fetchAshbyApplicationForm(jobBoardName: string, jobId: string): Promise<AshbyApplicationForm> {
  const response = await fetch(`${BASE_URL}/${encodeURIComponent(jobBoardName)}/${encodeURIComponent(jobId)}/application-form`);
  if (!response.ok) {
    throw new Error(`Ashby application-form API returned ${response.status} for job "${jobId}".`);
  }
  return (await response.json()) as AshbyApplicationForm;
}

/**
 * Spec section 18's cited "using the form to submit applications".
 * A CAPTCHA/anti-bot 403 is surfaced as `{ success: false, errorCode }`
 * rather than retried or bypassed.
 */
export async function submitAshbyApplication(jobBoardName: string, jobId: string, payload: AshbySubmitPayload): Promise<AshbySubmitResult> {
  const response = await fetch(`${BASE_URL}/${encodeURIComponent(jobBoardName)}/${encodeURIComponent(jobId)}/application`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (response.status === 403 || response.status === 429) {
    return { success: false, errorCode: "captcha_required" };
  }
  if (!response.ok) {
    throw new Error(`Ashby application API returned ${response.status} for job "${jobId}".`);
  }
  return (await response.json()) as AshbySubmitResult;
}
