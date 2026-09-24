/**
 * Shapes modeled from Ashby's public Job Postings API
 * (developers.ashbyhq.com/docs/public-job-posting-api -- cited in spec
 * section 18: "Ashby's API can provide published job postings and
 * application-form definitions... retrieving job postings, retrieving
 * the application form specification, and using the form to submit
 * applications"). The listing shape below matches Ashby's real
 * documented format; the application-form/submit shapes are a
 * good-faith modeling of that documented flow, verified only against
 * recorded fixtures per the `unit_fixtures` project decision, never
 * against a live Ashby tenant.
 */
export interface AshbyJobPosting {
  id: string;
  title: string;
  department?: string;
  team?: string;
  location: string;
  isRemote: boolean;
  employmentType?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  jobUrl: string;
  applyUrl?: string;
  publishedAt?: string;
}

export interface AshbyJobBoardResponse {
  organizationName: string;
  jobs: AshbyJobPosting[];
}

export interface AshbyApplicationField {
  id: string;
  label: string;
  type: string;
  isRequired: boolean;
  options?: string[];
}

export interface AshbyApplicationForm {
  fields: AshbyApplicationField[];
}

export interface AshbySubmitPayload {
  name: string;
  email: string;
  coverLetter: string;
  answers: Array<{ fieldId: string; value: string }>;
}

export interface AshbySubmitResult {
  success: boolean;
  applicationId?: string;
  errorCode?: string;
}

/** `RawJob.raw` payload actually stored -- Ashby's own job plus the organization name from the job-board root response, since a single job entry doesn't repeat it. */
export interface AshbyRawJobData extends AshbyJobPosting {
  organizationName: string;
}
