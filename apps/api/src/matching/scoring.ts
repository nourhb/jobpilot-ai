import type { Job, JobPreference } from "@prisma/client";
import type { HybridScoreBreakdown, MatchCategory, VerifiedCandidateProfile } from "@jobpilot/shared";
import { scoreTitleSimilarity } from "./titleSimilarity";
import { describesNoSponsorship } from "./sponsorshipSignal";

/**
 * Section 26 (Matching Algorithm): "Don't rely exclusively on the LLM.
 * Use a hybrid score." Every function below is a plain, deterministic
 * heuristic over already-known data (the verified profile, the job
 * posting, and the user's preferences) -- no AI provider is involved.
 * The AI only gets to narrate this result afterwards (see
 * packages/ai/src/matching/jobMatch.ts), never to compute it.
 *
 * Every component is intentionally simple and documented rather than
 * "smart": a wrong-but-explainable heuristic beats an opaque one when
 * the downstream decision is "should this candidate's information be
 * submitted to a real employer".
 */

const WEIGHTS = {
  skills: 0.3,
  experience: 0.2,
  title: 0.15,
  location: 0.1,
  authorization: 0.1,
  salary: 0.05,
  employmentType: 0.05,
  preferences: 0.05,
} as const;

function scoreCategory(score: number): MatchCategory {
  if (score >= 90) return "EXCELLENT";
  if (score >= 80) return "STRONG";
  if (score >= 70) return "POTENTIAL";
  return "LOW";
}

function findMatchedSkills(profile: VerifiedCandidateProfile, job: Pick<Job, "title" | "description">): string[] {
  const haystack = `${job.title}\n${job.description}`.toLowerCase();
  return profile.skills.filter((skill) => skill.name.length > 1 && haystack.includes(skill.name.toLowerCase())).map((s) => s.name);
}

/**
 * 30% weight. Ratio of the candidate's verified skills that show up in
 * this specific posting's title/description, over a capped denominator
 * (min(skillCount, 8)) so a candidate with many unrelated skills isn't
 * unfairly diluted relative to one with fewer, more focused skills.
 */
function scoreSkills(matchedSkills: string[], totalSkills: number): number {
  if (totalSkills === 0) return 0;
  const denominator = Math.min(totalSkills, 8);
  return Math.min(100, Math.round((matchedSkills.length / denominator) * 100));
}

/**
 * 20% weight. Job.experienceLevel is unstructured free text (section
 * 13) coming from source normalization -- when absent (the common case
 * for now, since no adapter populates it yet) this returns a neutral
 * score rather than guessing.
 */
const EXPERIENCE_LEVEL_YEAR_RANGES: Record<string, [number, number]> = {
  entry: [0, 2],
  "entry-level": [0, 2],
  junior: [0, 2],
  intermediate: [2, 5],
  mid: [2, 5],
  "mid-level": [2, 5],
  senior: [5, 10],
  lead: [8, 20],
  principal: [8, 20],
  staff: [8, 20],
};

function scoreExperience(jobExperienceLevel: string | null, candidateYears: number | null): number {
  if (!jobExperienceLevel) return 70; // unknown requirement -- don't penalize
  const range = EXPERIENCE_LEVEL_YEAR_RANGES[jobExperienceLevel.trim().toLowerCase()];
  if (!range) return 70; // unrecognized label -- treat the same as unknown
  if (candidateYears === null) return 50; // requirement is known, candidate's years are not

  const [min, max] = range;
  if (candidateYears >= min && candidateYears <= max + 3) return 100;
  if (candidateYears < min) return Math.max(0, 100 - (min - candidateYears) * 20);
  return Math.max(0, 100 - (candidateYears - max - 3) * 10); // overqualified: smaller penalty
}

/**
 * 10% weight. Prefers an exact remote/hybrid/onsite match against the
 * candidate's stated preference; falls back to a looser
 * country/province/city comparison for onsite roles.
 */
function scoreLocation(job: Job, profile: VerifiedCandidateProfile, preferences: JobPreference): number {
  if (job.remoteType === "REMOTE") {
    return profile.remotePreference === "REMOTE" || profile.remotePreference === "ANY" || preferences.remote ? 100 : 60;
  }
  if (job.remoteType === "HYBRID") {
    return profile.remotePreference === "HYBRID" || profile.remotePreference === "ANY" || preferences.hybrid ? 100 : 60;
  }
  if (job.remoteType === "ONSITE") {
    const city = job.city?.toLowerCase();
    const province = job.province?.toLowerCase();
    const inConfiguredCity = city && preferences.cities.some((c) => c.toLowerCase() === city);
    const inConfiguredProvince = province && preferences.provinces.some((p) => p.toLowerCase() === province);
    if (inConfiguredCity || inConfiguredProvince) return 100;
    const countryMatches = job.country && preferences.countries.some((c) => c.toLowerCase() === job.country?.toLowerCase());
    return countryMatches ? 60 : 30;
  }
  return 50; // UNKNOWN
}

/**
 * 10% weight. Section 27's sponsorship hard filter already removes the
 * clearest mismatches before scoring ever runs; this component instead
 * expresses how confident we are for jobs that pass through.
 */
function scoreAuthorization(profile: VerifiedCandidateProfile, job: Pick<Job, "description">): number {
  if (!profile.authorization.status) return 40; // candidate hasn't declared a status at all
  if (!profile.authorization.requiresSponsorship) return 100;
  return describesNoSponsorship(job.description) ? 20 : 70;
}

/** 5% weight. */
function scoreSalary(job: Job, profile: VerifiedCandidateProfile): number {
  const candidateMin = profile.salaryExpectation.minimum;
  const candidateMax = profile.salaryExpectation.maximum;
  if (job.salaryMin === null && job.salaryMax === null) return 60; // job didn't disclose a range
  if (candidateMin === null && candidateMax === null) return 70; // candidate has no stated expectation

  const jobMin = job.salaryMin ?? job.salaryMax ?? 0;
  const jobMax = job.salaryMax ?? job.salaryMin ?? Number.POSITIVE_INFINITY;
  const wantMin = candidateMin ?? 0;
  const wantMax = candidateMax ?? Number.POSITIVE_INFINITY;

  const overlaps = jobMax >= wantMin && jobMin <= wantMax;
  if (overlaps) return 100;
  if (jobMax < wantMin) {
    // Job's ceiling is below the candidate's floor -- score the shortfall.
    return Math.max(0, Math.min(90, Math.round((jobMax / wantMin) * 100)));
  }
  return 100; // job's floor is above the candidate's ceiling -- pays more than asked, not a problem
}

/** 5% weight. */
function scoreEmploymentType(job: Job, preferences: JobPreference): number {
  if (preferences.employmentTypes.length === 0) return 70; // no preference configured
  if (preferences.employmentTypes.includes(job.employmentType)) return 100;
  return job.employmentType === "UNKNOWN" ? 50 : 20;
}

/**
 * 5% weight. A lightweight, separate-from-title-similarity signal: does
 * this posting's title actually appear among the candidate's explicitly
 * configured target titles (substring match, not token overlap)?
 */
function scorePreferences(job: Job, preferences: JobPreference): number {
  if (preferences.targetTitles.length === 0) return 60;
  const jobTitle = job.title.toLowerCase();
  const matches = preferences.targetTitles.some((title) => {
    const t = title.toLowerCase();
    return jobTitle.includes(t) || t.includes(jobTitle);
  });
  return matches ? 100 : 40;
}

export function computeHybridScore(
  job: Job,
  profile: VerifiedCandidateProfile,
  preferences: JobPreference,
): HybridScoreBreakdown {
  const matchedSkills = findMatchedSkills(profile, job);

  const skillsScore = scoreSkills(matchedSkills, profile.skills.length);
  const experienceScore = scoreExperience(job.experienceLevel, profile.yearsOfExperience);
  const referenceTitles =
    preferences.targetTitles.length > 0 ? preferences.targetTitles : profile.experience.map((e) => e.jobTitle);
  const titleScore = scoreTitleSimilarity(job.title, referenceTitles);
  const locationScore = scoreLocation(job, profile, preferences);
  const authorizationScore = scoreAuthorization(profile, job);
  const salaryScore = scoreSalary(job, profile);
  const employmentTypeScore = scoreEmploymentType(job, preferences);
  const preferencesScore = scorePreferences(job, preferences);

  const score = Math.round(
    skillsScore * WEIGHTS.skills +
      experienceScore * WEIGHTS.experience +
      titleScore * WEIGHTS.title +
      locationScore * WEIGHTS.location +
      authorizationScore * WEIGHTS.authorization +
      salaryScore * WEIGHTS.salary +
      employmentTypeScore * WEIGHTS.employmentType +
      preferencesScore * WEIGHTS.preferences,
  );

  return {
    score,
    matchCategory: scoreCategory(score),
    skillsScore,
    experienceScore,
    titleScore,
    locationScore,
    authorizationScore,
    salaryScore,
    employmentTypeScore,
    preferencesScore,
    matchedSkills,
  };
}
