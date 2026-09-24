/**
 * Shapes returned by Greenhouse's real, public, unauthenticated Job
 * Board API (boards-api.greenhouse.io) -- see greenhouse.client.ts for
 * the exact endpoints. Field names below match Greenhouse's own
 * documented response format.
 */
export interface GreenhouseJobSummary {
  id: number;
  title: string;
  updated_at: string;
  absolute_url: string;
  location: { name: string };
}

export interface GreenhouseQuestionField {
  name: string;
  type: string;
  required: boolean;
  values?: Array<{ label: string; value: string }>;
}

/** Greenhouse groups one or more `fields` under a single `label` (e.g. an address question has street/city/postal-code fields) -- this adapter takes only the first field per question, which covers every common single-value question type. */
export interface GreenhouseQuestion {
  label: string;
  required: boolean;
  fields: GreenhouseQuestionField[];
}

export interface GreenhouseJobDetail extends GreenhouseJobSummary {
  content?: string;
  questions?: GreenhouseQuestion[];
}

export interface GreenhouseJobsResponse {
  jobs: GreenhouseJobSummary[];
}

/** `RawJob.raw` payload actually stored -- the real API response plus the human-readable company name, which Greenhouse's per-board API never includes on the job itself (the board token *is* the company identifier). */
export interface GreenhouseRawJobData extends GreenhouseJobDetail {
  companyName: string;
}
