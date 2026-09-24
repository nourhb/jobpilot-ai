/**
 * Shapes modeled from Lever's public, documented Postings API
 * (hire.lever.co/developer/documentation -- cited in spec section 17:
 * "Lever documents `GET /postings/:posting/apply` for application
 * questions and `POST /postings/:posting/apply` for submitting an
 * application"). The listing/detail shapes below match Lever's real
 * documented format; the `.../apply` field-level JSON shape is a
 * good-faith modeling of that documented flow, verified only against
 * recorded fixtures per the `unit_fixtures` project decision, never
 * against a live Lever tenant.
 */
export interface LeverPostingCategories {
  team?: string;
  department?: string;
  location?: string;
  commitment?: string;
}

export interface LeverPosting {
  id: string;
  text: string;
  categories: LeverPostingCategories;
  descriptionPlain?: string;
  description?: string;
  hostedUrl: string;
  applyUrl?: string;
  createdAt: number;
  workplaceType?: string;
}

export interface LeverApplyField {
  id: string;
  text: string;
  type: string;
  required: boolean;
  options?: string[];
}

export interface LeverApplyForm {
  fields: LeverApplyField[];
}

export interface LeverSubmitPayload {
  name: string;
  email: string;
  comments: string;
  answers: Array<{ id: string; answer: string }>;
}

export interface LeverSubmitResult {
  ok: boolean;
  applicationId?: string;
  reason?: string;
}

/** `RawJob.raw` payload actually stored -- Lever's own posting plus the human-readable company name (Lever's public API identifies the employer only by URL slug). */
export interface LeverRawJobData extends LeverPosting {
  companyName: string;
}
