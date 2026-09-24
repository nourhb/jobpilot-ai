import { createHash } from "node:crypto";
import type { NormalizedJob } from "../base/types";

/**
 * Spec section 21 (Deduplication). Three layers, cheapest/most-precise
 * first:
 *
 * 1. (sourceId, externalId) -- enforced by a DB unique constraint on
 *    Job, applied at upsert time in apps/api/src/jobs/jobDiscovery.service.ts.
 * 2. normalized company + title + location -- {@link computeSecondaryDedupeKey}.
 * 3. description content hash -- {@link computeContentHash}, stored as
 *    Job.contentHash so a later discovery run can compare without
 *    re-fetching.
 */

/** Lowercase, trim, and collapse internal whitespace for stable comparison. */
export function normalizeForComparison(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

export function computeSecondaryDedupeKey(job: Pick<NormalizedJob, "company" | "title" | "location">): string {
  const locationPart = [job.location.city, job.location.province, job.location.country]
    .filter((part): part is string => Boolean(part))
    .map(normalizeForComparison)
    .join("|");
  return [normalizeForComparison(job.company), normalizeForComparison(job.title), locationPart].join("::");
}

/** SHA-256 over normalized title + company + description. Stored as `Job.contentHash`. */
export function computeContentHash(job: Pick<NormalizedJob, "title" | "company" | "description">): string {
  const input = [normalizeForComparison(job.title), normalizeForComparison(job.company), normalizeForComparison(job.description)].join(
    "::",
  );
  return createHash("sha256").update(input).digest("hex");
}

export interface ExistingJobFingerprint {
  id: string;
  sourceId: string;
  externalId: string;
  contentHash: string;
  secondaryKey: string;
}

export type DuplicateMatchReason = "SOURCE_EXTERNAL_ID" | "SECONDARY_KEY" | "CONTENT_HASH";

export interface DuplicateMatch {
  isDuplicate: boolean;
  matchedJobId?: string;
  reason?: DuplicateMatchReason;
}

/**
 * Given a freshly normalized job and its already-computed hash/key, plus
 * the fingerprints of jobs already stored *for other sources* (the same
 * sourceId+externalId case is handled by the DB upsert and never reaches
 * here), decide whether this is a duplicate of something already known.
 */
export function findDuplicate(
  candidate: { sourceId: string; externalId: string; contentHash: string; secondaryKey: string },
  existing: ExistingJobFingerprint[],
): DuplicateMatch {
  for (const job of existing) {
    if (job.sourceId === candidate.sourceId && job.externalId === candidate.externalId) {
      return { isDuplicate: true, matchedJobId: job.id, reason: "SOURCE_EXTERNAL_ID" };
    }
  }
  for (const job of existing) {
    if (job.secondaryKey === candidate.secondaryKey) {
      return { isDuplicate: true, matchedJobId: job.id, reason: "SECONDARY_KEY" };
    }
  }
  for (const job of existing) {
    if (job.contentHash === candidate.contentHash) {
      return { isDuplicate: true, matchedJobId: job.id, reason: "CONTENT_HASH" };
    }
  }
  return { isDuplicate: false };
}
