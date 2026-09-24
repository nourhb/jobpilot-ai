import type { LeverApplyForm, LeverPosting, LeverSubmitPayload, LeverSubmitResult } from "./lever.types";

const BASE_URL = "https://api.lever.co/v0/postings";

/**
 * Real, documented, unauthenticated Lever Postings API (spec section
 * 17). No API key, no login -- `mode=json` is Lever's own documented
 * parameter for getting JSON instead of the hosted HTML page.
 */
export async function fetchLeverPostings(company: string): Promise<LeverPosting[]> {
  const response = await fetch(`${BASE_URL}/${encodeURIComponent(company)}?mode=json`);
  if (!response.ok) {
    throw new Error(`Lever postings API returned ${response.status} for company "${company}".`);
  }
  return (await response.json()) as LeverPosting[];
}

export async function fetchLeverPosting(company: string, postingId: string): Promise<LeverPosting> {
  const response = await fetch(`${BASE_URL}/${encodeURIComponent(company)}/${encodeURIComponent(postingId)}?mode=json`);
  if (!response.ok) {
    throw new Error(`Lever postings API returned ${response.status} for posting "${postingId}".`);
  }
  return (await response.json()) as LeverPosting;
}

/** Spec section 17's cited `GET /postings/:posting/apply` -- application questions for a posting. */
export async function fetchLeverApplyForm(company: string, postingId: string): Promise<LeverApplyForm> {
  const response = await fetch(`${BASE_URL}/${encodeURIComponent(company)}/${encodeURIComponent(postingId)}/apply?mode=json`);
  if (!response.ok) {
    throw new Error(`Lever apply-form API returned ${response.status} for posting "${postingId}".`);
  }
  return (await response.json()) as LeverApplyForm;
}

/**
 * Spec section 17's cited `POST /postings/:posting/apply` -- submits an
 * application to a published/internal posting. Lever's hosted apply
 * flow is bot-protected; a 403/429 here is treated as an anti-bot
 * signal and surfaced as `{ ok: false, reason: "captcha_required" }`
 * rather than retried or bypassed, per the master prompt's "never
 * bypass CAPTCHA or anti-bot systems" rule.
 */
export async function submitLeverApplication(company: string, postingId: string, payload: LeverSubmitPayload): Promise<LeverSubmitResult> {
  const response = await fetch(`${BASE_URL}/${encodeURIComponent(company)}/${encodeURIComponent(postingId)}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (response.status === 403 || response.status === 429) {
    return { ok: false, reason: "captcha_required" };
  }
  if (!response.ok) {
    throw new Error(`Lever apply API returned ${response.status} for posting "${postingId}".`);
  }
  return (await response.json()) as LeverSubmitResult;
}
