import type { ResumeExtraction } from "@jobpilot/shared";

/**
 * Section 23: "If confidence is low: CV REVIEW REQUIRED. Do not
 * automatically invent missing information." This is a completeness
 * score, not a claim that extracted facts are correct -- it purely
 * measures how much of the expected shape was actually found, which is
 * provider-agnostic (a real LLM extraction and the offline heuristic
 * extractor are scored by exactly the same function).
 */
export const RESUME_REVIEW_THRESHOLD = 0.6;

interface Check {
  label: string;
  passed: boolean;
}

function hasValidDates(data: ResumeExtraction): boolean {
  for (const exp of data.experience) {
    if (exp.startDate && exp.endDate) {
      const start = new Date(exp.startDate).getTime();
      const end = new Date(exp.endDate).getTime();
      if (!Number.isNaN(start) && !Number.isNaN(end) && end < start) {
        return false;
      }
    }
  }
  return true;
}

export function scoreResumeExtraction(data: ResumeExtraction): { score: number; checks: Check[] } {
  const checks: Check[] = [
    { label: "email_found", passed: Boolean(data.personal.email) },
    { label: "name_found", passed: Boolean(data.personal.firstName && data.personal.lastName) },
    { label: "summary_found", passed: Boolean(data.summary && data.summary.trim().length > 0) },
    { label: "skills_found", passed: data.skills.length > 0 },
    {
      label: "experience_found",
      passed: data.experience.length > 0 && data.experience.every((e) => Boolean(e.company && e.jobTitle)),
    },
    { label: "education_found", passed: data.education.length > 0 },
    { label: "dates_valid", passed: hasValidDates(data) },
  ];

  const score = checks.filter((c) => c.passed).length / checks.length;
  return { score, checks };
}
