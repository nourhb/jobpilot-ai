import type { Job, JobPreference } from "@prisma/client";
import type { MatchDecision, VerifiedCandidateProfile } from "@jobpilot/shared";
import { interpretJobMatch } from "@jobpilot/ai";
import { jobRepository } from "../repositories/job.repository";
import { jobPreferenceRepository } from "../repositories/jobPreference.repository";
import { jobMatchRepository } from "../repositories/jobMatch.repository";
import { profileService } from "../profile/profile.service";
import { getAIProvider } from "../lib/aiProvider";
import { AppError } from "../middleware/errorHandler";
import { applyHardFilters, type HardFilterResult } from "./hardFilters";
import { describesNoSponsorship } from "./sponsorshipSignal";
import { computeHybridScore } from "./scoring";

const CANDIDATE_LIMIT = 400;
const MAX_RESULTS = 60;
const MIN_SCORE = 50;
const FALLBACK_SCORE = 40;

function isProfileReady(profile: VerifiedCandidateProfile): boolean {
  return profile.skills.length > 0 || profile.experience.length > 0;
}

function profileKeywords(profile: VerifiedCandidateProfile): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const term of [...profile.skills.map((skill) => skill.name), ...profile.experience.map((role) => role.jobTitle)]) {
    const trimmed = term.trim();
    if (trimmed.length < 2) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= 16) break;
  }
  return out;
}

/**
 * Ranking filters for the CV "For you" list. Country is only a hard skip
 * for onsite roles — remote postings stay eligible so a verified skill
 * match is not discarded because the ATS stored a US office country.
 * Missing work-authorization is also not a list-level skip; the user
 * still needs to set it before the agent can apply.
 */
function applyRecommendFilters(
  job: Job,
  profile: VerifiedCandidateProfile,
  preferences: JobPreference,
): HardFilterResult {
  if (job.status !== "ACTIVE") return { skip: true, reason: "Job posting is no longer active." };
  if (job.expiresAt && job.expiresAt.getTime() < Date.now()) {
    return { skip: true, reason: "Job posting has expired." };
  }
  if (job.remoteType === "REMOTE" && !preferences.remote) {
    return { skip: true, reason: "Remote jobs are excluded by your preferences." };
  }
  if (job.remoteType === "HYBRID" && !preferences.hybrid) {
    return { skip: true, reason: "Hybrid jobs are excluded by your preferences." };
  }
  if (job.remoteType === "ONSITE" && !preferences.onsite) {
    return { skip: true, reason: "Onsite jobs are excluded by your preferences." };
  }
  if (job.remoteType === "ONSITE" && job.country && preferences.countries.length > 0) {
    const allowed = preferences.countries.some((country) => country.toLowerCase() === job.country?.toLowerCase());
    if (!allowed) {
      return { skip: true, reason: `Job is located in ${job.country}, which is outside your configured countries.` };
    }
  }
  if (preferences.requireNoSponsorship && profile.authorization.requiresSponsorship && describesNoSponsorship(job.description)) {
    return { skip: true, reason: "This posting indicates it cannot offer the sponsorship your profile requires." };
  }
  if (preferences.excludedTitles.length > 0) {
    const jobTitle = job.title.toLowerCase();
    const excluded = preferences.excludedTitles.some((title) => jobTitle.includes(title.toLowerCase()));
    if (excluded) return { skip: true, reason: "This job's title matches one of your excluded titles." };
  }
  return { skip: false };
}

function decideFromScore(score: number, minimumMatchScore: number): MatchDecision {
  if (score >= minimumMatchScore) return "APPLY";
  if (score >= 70) return "REVIEW";
  return "SKIP";
}

/**
 * Section 25/26 orchestration: hard filter -> deterministic hybrid score
 * -> AI narrative interpretation -> persist. Called on demand from
 * `GET /api/jobs/:id/match` in this phase; Phase 8's scheduled worker
 * will call the same function in bulk instead of the user having to
 * open every job to trigger a computation.
 */
export const jobMatchService = {
  async getOrComputeMatch(userId: string, jobId: string) {
    const job = await jobRepository.findById(jobId);
    if (!job) throw new AppError(404, "JOB_NOT_FOUND", "Job not found.");

    const [profile, preferences] = await Promise.all([
      profileService.getVerifiedCandidateProfile(userId),
      jobPreferenceRepository.getOrCreateForUser(userId),
    ]);

    const hardFilter = applyHardFilters(job, profile, preferences);
    if (hardFilter.skip) {
      return jobMatchRepository.upsert({
        userId,
        jobId,
        score: 0,
        matchCategory: "LOW",
        decision: "SKIP",
        skillsScore: 0,
        experienceScore: 0,
        titleScore: 0,
        locationScore: 0,
        authorizationScore: 0,
        salaryScore: 0,
        employmentTypeScore: 0,
        preferencesScore: 0,
        skippedReason: hardFilter.reason,
        reasons: [],
        missingRequirements: [],
        riskFlags: [],
      });
    }

    const breakdown = computeHybridScore(job, profile, preferences);
    const interpretation = await interpretJobMatch(
      getAIProvider(),
      { title: job.title, company: job.company, description: job.description },
      profile,
      breakdown,
    );

    // The system's own authoritative decision -- NOT interpretation.decision
    // (the AI's advisory opinion, stored separately as aiSuggestedDecision).
    // Section 28: score >= the user's own threshold is APPLY; otherwise
    // POTENTIAL-and-above is surfaced for manual REVIEW; anything below
    // the fixed 70 floor is SKIP regardless of the user's threshold.
    const decision = breakdown.score >= preferences.minimumMatchScore ? "APPLY" : breakdown.score >= 70 ? "REVIEW" : "SKIP";

    return jobMatchRepository.upsert({
      userId,
      jobId,
      score: breakdown.score,
      matchCategory: breakdown.matchCategory,
      decision,
      skillsScore: breakdown.skillsScore,
      experienceScore: breakdown.experienceScore,
      titleScore: breakdown.titleScore,
      locationScore: breakdown.locationScore,
      authorizationScore: breakdown.authorizationScore,
      salaryScore: breakdown.salaryScore,
      employmentTypeScore: breakdown.employmentTypeScore,
      preferencesScore: breakdown.preferencesScore,
      skippedReason: null,
      aiSuggestedDecision: interpretation.decision,
      reasons: interpretation.reasons,
      missingRequirements: interpretation.missingRequirements,
      riskFlags: interpretation.riskFlags,
      aiModel: interpretation.model,
      aiPromptVersion: interpretation.promptVersion,
    });
  },

  /**
   * Bulk CV ranking for the For you tab. Uses verified profile fields
   * only, scores with the deterministic hybrid (no AI per job), and
   * does not persist matches.
   */
  async rankJobsForUser(userId: string) {
    const [profile, preferences] = await Promise.all([
      profileService.getVerifiedCandidateProfile(userId),
      jobPreferenceRepository.getOrCreateForUser(userId),
    ]);

    if (!isProfileReady(profile)) {
      return { profileReady: false as const, scanned: 0, items: [] };
    }

    const keywords = profileKeywords(profile);
    let candidates = (await jobRepository.listByKeywords(keywords, CANDIDATE_LIMIT)) ?? [];
    if (candidates.length < 20) {
      const extra = (await jobRepository.listRecentActive(300)) ?? [];
      const seen = new Set(candidates.map((job) => job.id));
      for (const job of extra) {
        if (seen.has(job.id)) continue;
        seen.add(job.id);
        candidates.push(job);
      }
    }

    const scored = [];
    for (const job of candidates) {
      if (applyRecommendFilters(job, profile, preferences).skip) continue;
      const breakdown = computeHybridScore(job, profile, preferences);
      scored.push({
        job,
        score: breakdown.score,
        matchCategory: breakdown.matchCategory,
        decision: decideFromScore(breakdown.score, preferences.minimumMatchScore),
        matchedSkills: breakdown.matchedSkills,
        skillsScore: breakdown.skillsScore,
        titleScore: breakdown.titleScore,
      });
    }

    scored.sort((left, right) => right.score - left.score);
    const fromCv = scored.filter((item) => item.matchedSkills.length > 0 || item.titleScore >= 50);
    let items = fromCv.filter((item) => item.score >= MIN_SCORE);
    if (items.length === 0) items = fromCv.filter((item) => item.score >= FALLBACK_SCORE);

    return {
      profileReady: true as const,
      scanned: candidates.length,
      items: items.slice(0, MAX_RESULTS),
    };
  },
};
