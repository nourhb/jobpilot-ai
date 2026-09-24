/**
 * Section 60 (Mock Application Environment): "Before using real
 * employers, build MockATS... your entire application engine can be
 * tested without accidentally applying to real jobs."
 *
 * Behaviour is driven entirely by substrings in the job's own
 * `externalId`, so tests can deliberately exercise every branch of the
 * Application Engine (success, CAPTCHA, an unsupported/down source, an
 * unanswerable question, a high-risk question) just by choosing a
 * fixture externalId -- no hidden state, no database required.
 */

export interface MockAtsQuestion {
  id: string;
  text: string;
}

const BASE_QUESTIONS: MockAtsQuestion[] = [
  { id: "q-legal", text: "Are you legally authorized to work in Canada?" },
  { id: "q-experience", text: "How many years of Kubernetes experience do you have?" },
  { id: "q-motivation", text: "Why do you want to work at our company?" },
];

export function isJobActive(externalId: string): boolean {
  return !/expired|closed/i.test(externalId);
}

export function getQuestionsFor(externalId: string): MockAtsQuestion[] {
  const questions = [...BASE_QUESTIONS];

  if (/highrisk/i.test(externalId)) {
    questions.push({ id: "q-highrisk", text: "Do you have any disability we should accommodate?" });
  }
  if (/unanswerable/i.test(externalId)) {
    questions.push({ id: "q-unanswerable", text: "How many years of Terraform experience do you have?" });
  }

  return questions;
}

export type SubmitOutcome =
  | { kind: "success"; externalApplicationId: string }
  | { kind: "captcha" }
  | { kind: "unavailable" };

export function simulateSubmit(externalId: string): SubmitOutcome {
  if (/captcha/i.test(externalId)) return { kind: "captcha" };
  if (/fail|unavailable/i.test(externalId)) return { kind: "unavailable" };
  return { kind: "success", externalApplicationId: `mock-ats-${externalId}-${Date.now()}` };
}
