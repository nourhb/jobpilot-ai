import { interpretJobMatch } from "@jobpilot/ai";
import { jobRepository } from "../repositories/job.repository";
import { jobPreferenceRepository } from "../repositories/jobPreference.repository";
import { jobMatchRepository } from "../repositories/jobMatch.repository";
import { profileService } from "../profile/profile.service";
import { getAIProvider } from "../lib/aiProvider";
import { AppError } from "../middleware/errorHandler";
import { applyHardFilters } from "./hardFilters";
import { computeHybridScore } from "./scoring";

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
};
