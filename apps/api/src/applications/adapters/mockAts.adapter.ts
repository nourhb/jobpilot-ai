import { env } from "../../config/env";
import {
  ApplicationSourceError,
  CaptchaDetectedError,
  type AdapterJob,
  type ApplicationAdapter,
  type ApplicationQuestionDescriptor,
  type SubmitApplicationPayload,
  type SubmitApplicationResult,
} from "./applicationAdapter.types";

function baseUrl(): string {
  return `http://127.0.0.1:${env.PORT}/api/_mock-ats`;
}

/**
 * Real HTTP client against the Mock ATS (apps/api/src/mockAts) --
 * deliberately built the same way a genuine `ApiApplicationAdapter`
 * against Lever/Ashby/Greenhouse will be in Phase 7, so this phase
 * exercises the actual network/error-handling code paths (timeouts,
 * non-2xx responses, CAPTCHA-style 409s) rather than only in-process
 * function calls.
 */
export const mockAtsAdapter: ApplicationAdapter = {
  name: "mock-ats",

  async isJobStillActive(job: AdapterJob): Promise<boolean> {
    const response = await fetch(`${baseUrl()}/jobs/${encodeURIComponent(job.externalId)}`);
    if (!response.ok) {
      throw new ApplicationSourceError(`Mock ATS returned ${response.status} checking job availability.`);
    }
    const body = (await response.json()) as { active: boolean };
    return body.active;
  },

  async getQuestions(job: AdapterJob): Promise<ApplicationQuestionDescriptor[]> {
    const response = await fetch(`${baseUrl()}/jobs/${encodeURIComponent(job.externalId)}/questions`);
    if (!response.ok) {
      throw new ApplicationSourceError(`Mock ATS returned ${response.status} fetching the application form.`);
    }
    const body = (await response.json()) as { questions: ApplicationQuestionDescriptor[] };
    return body.questions;
  },

  async submit(job: AdapterJob, payload: SubmitApplicationPayload): Promise<SubmitApplicationResult> {
    const response = await fetch(`${baseUrl()}/jobs/${encodeURIComponent(job.externalId)}/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.status === 409) {
      throw new CaptchaDetectedError("Mock ATS reported a CAPTCHA challenge during submission.");
    }
    if (!response.ok) {
      throw new ApplicationSourceError(`Mock ATS returned ${response.status} submitting the application.`);
    }

    const body = (await response.json()) as { applicationId: string };
    return { externalApplicationId: body.applicationId };
  },
};
