import type { Job, JobPreference } from "@prisma/client";
import type { VerifiedCandidateProfile } from "@jobpilot/shared";
import { describesNoSponsorship } from "./sponsorshipSignal";

export interface HardFilterResult {
  skip: boolean;
  reason?: string;
}

const PASS: HardFilterResult = { skip: false };

function skip(reason: string): HardFilterResult {
  return { skip: true, reason };
}

/**
 * Section 27 (Hard Filters): "Before AI matching" -- and, per section 26,
 * before the deterministic hybrid score too. A job that fails any of
 * these is never scored at all; scoring an already-disqualified job
 * would be wasted work and could produce a misleadingly high number.
 *
 * Deviations from the spec's literal pseudocode, each documented at the
 * check itself:
 *   - "job already applied" is deferred to Phase 6 (no Application model
 *     exists yet in this phase).
 *   - "country != Canada" is expressed generically via
 *     JobPreference.countries (which defaults to ["Canada"]) instead of
 *     being hardcoded, so a user can broaden it later without a code
 *     change.
 *   - remote/hybrid/onsite are treated as hard include/exclude toggles
 *     (the spec lists them as plain booleans on JobPreference, not as a
 *     soft-scored field), not merely a scoring input.
 */
export function applyHardFilters(job: Job, profile: VerifiedCandidateProfile, preferences: JobPreference): HardFilterResult {
  if (job.status !== "ACTIVE") {
    return skip("Job posting is no longer active.");
  }
  if (job.expiresAt && job.expiresAt.getTime() < Date.now()) {
    return skip("Job posting has expired.");
  }

  if (job.country && preferences.countries.length > 0) {
    const allowed = preferences.countries.some((c) => c.toLowerCase() === job.country?.toLowerCase());
    if (!allowed) return skip(`Job is located in ${job.country}, which is outside your configured countries.`);
  }

  if (job.remoteType === "REMOTE" && !preferences.remote) return skip("Remote jobs are excluded by your preferences.");
  if (job.remoteType === "HYBRID" && !preferences.hybrid) return skip("Hybrid jobs are excluded by your preferences.");
  if (job.remoteType === "ONSITE" && !preferences.onsite) return skip("Onsite jobs are excluded by your preferences.");

  if (preferences.requireWorkAuthorization && !profile.authorization.status) {
    return skip("Your work authorization status is not set in your profile.");
  }

  if (preferences.requireNoSponsorship && profile.authorization.requiresSponsorship && describesNoSponsorship(job.description)) {
    return skip("This posting indicates it cannot offer the sponsorship your profile requires.");
  }

  if (job.experienceLevel && preferences.experienceLevels.length > 0) {
    const allowed = preferences.experienceLevels.some((level) => level.toLowerCase() === job.experienceLevel?.toLowerCase());
    if (!allowed) return skip(`This job's experience level ("${job.experienceLevel}") is outside your configured levels.`);
  }

  if (preferences.excludedTitles.length > 0) {
    const jobTitle = job.title.toLowerCase();
    const excluded = preferences.excludedTitles.some((title) => jobTitle.includes(title.toLowerCase()));
    if (excluded) return skip("This job's title matches one of your excluded titles.");
  }

  // "IF job already applied SKIP" (section 27) is deferred to Phase 6,
  // once the Application model and engine exist.

  return PASS;
}
