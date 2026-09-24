/** Minimal job shape every adapter needs -- deliberately not the full Prisma `Job & { source }` type, to keep adapters easy to unit test. */
export interface AdapterJob {
  externalId: string;
}

export interface ApplicationQuestionDescriptor {
  id: string;
  text: string;
}

export interface SubmitAnswer {
  questionId: string;
  questionText: string;
  answer: string;
}

export interface SubmitApplicationPayload {
  candidateName: string;
  candidateEmail: string;
  coverLetter: string;
  answers: SubmitAnswer[];
}

export interface SubmitApplicationResult {
  externalApplicationId: string;
}

/** Section 38: "If CAPTCHA appears -> MANUAL_REVIEW", never an attempted bypass. */
export class CaptchaDetectedError extends Error {}

/** Any other adapter-level failure (source down, unexpected response, ...) -- routes to FAILED, distinct from a policy/validation decision. */
export class ApplicationSourceError extends Error {}

/**
 * Section 38 architecture: `ApplicationRouter` picks one of these per
 * job. Every real submission integration (Mock ATS here, Lever/Ashby/
 * Greenhouse in Phase 7) implements this same interface so
 * application.service.ts never needs to know which one it's talking to.
 */
export interface ApplicationAdapter {
  readonly name: string;
  isJobStillActive(job: AdapterJob): Promise<boolean>;
  getQuestions(job: AdapterJob): Promise<ApplicationQuestionDescriptor[]>;
  submit(job: AdapterJob, payload: SubmitApplicationPayload): Promise<SubmitApplicationResult>;
}
