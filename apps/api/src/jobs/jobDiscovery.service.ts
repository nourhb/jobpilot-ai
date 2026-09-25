import { computeContentHash, computeSecondaryDedupeKey, normalizeRawJob } from "@jobpilot/source-adapters";
import type { JobSourceTypeName, NormalizedJob } from "@jobpilot/source-adapters";
import type { Prisma } from "@prisma/client";
import { getAdapterForSource } from "../adapters/registry";
import { jobRepository } from "../repositories/job.repository";
import { jobSourceRepository } from "../repositories/jobSource.repository";
import { auditService } from "../audit/audit.service";
import { logger } from "../lib/logger";

/**
 * Spec section 20 (Job Discovery Engine) / section 41 (worker flow):
 *
 *   Load enabled sources -> Fetch jobs -> Normalize jobs -> Calculate
 *   content hash -> Remove duplicates -> Store jobs
 *
 * This is a plain async function, not a BullMQ worker -- Phase 8 wraps
 * it in `jobDiscoveryWorker` on a schedule. Calling it directly (from a
 * script, a test, or a future admin endpoint) must behave identically.
 */

function toDate(value?: string): Date | null {
  if (!value) return null;
  const numeric = Number(value);
  const date =
    Number.isFinite(numeric) && /^\d+(\.\d+)?$/.test(value.trim())
      ? new Date(numeric > 1e12 ? numeric : numeric * 1000)
      : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toInt(value?: number): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded > 2_147_483_647 || rounded < 0) return null;
  return rounded;
}

function mapNormalizedJobToUpsertInput(normalized: NormalizedJob, sourceId: string, rawData: unknown) {
  return {
    sourceId,
    externalId: normalized.externalId,
    title: normalized.title,
    company: normalized.company,
    description: normalized.description,
    descriptionHtml: normalized.descriptionHtml ?? null,
    locationRaw: normalized.location.raw ?? null,
    city: normalized.location.city ?? null,
    province: normalized.location.province ?? null,
    country: normalized.location.country ?? null,
    remoteType: normalized.remoteType,
    employmentType: normalized.employmentType,
    experienceLevel: normalized.experienceLevel ?? null,
    salaryMin: toInt(normalized.salary?.min),
    salaryMax: toInt(normalized.salary?.max),
    salaryCurrency: normalized.salary?.currency ?? null,
    salaryPeriod: normalized.salary?.period ?? null,
    jobUrl: normalized.jobUrl ?? null,
    applicationType: normalized.application.type,
    applicationUrl: normalized.application.url ?? null,
    postedAt: toDate(normalized.postedAt),
    expiresAt: toDate(normalized.expiresAt),
    rawData: rawData as Prisma.InputJsonValue,
    contentHash: computeContentHash(normalized),
    secondaryDedupeKey: computeSecondaryDedupeKey(normalized),
  };
}

export interface JobDiscoverySourceResult {
  sourceName: string;
  fetched: number;
  stored: number;
  skippedDuplicates: number;
  errors: number;
}

export const jobDiscoveryService = {
  async runForSource(source: { id: string; name: string; type: string; config: unknown }): Promise<JobDiscoverySourceResult> {
    const result: JobDiscoverySourceResult = { sourceName: source.name, fetched: 0, stored: 0, skippedDuplicates: 0, errors: 0 };

    // Building the adapter and discovering jobs both belong in the try
    // block (not just per-job normalization below): a disabled real
    // source (Phase 7's env-flag kill switch) or a real source that's
    // genuinely down must not crash the whole multi-source discovery
    // run -- it should be recorded as a source-level error instead.
    let rawJobs;
    try {
      const adapter = getAdapterForSource(source as never);
      rawJobs = await adapter.discoverJobs();
    } catch (error) {
      result.errors += 1;
      logger.error({ err: error, sourceName: source.name }, "Failed to discover jobs from source");
      return result;
    }
    result.fetched = rawJobs.length;

    for (const rawJob of rawJobs) {
      try {
        const normalized = normalizeRawJob(source.type as JobSourceTypeName, rawJob);

        // A job we've already stored under this exact (sourceId,
        // externalId) is re-discovered on every run -- that's not a
        // "duplicate", it's the same posting still being live. Go
        // straight to the upsert (update path, bumps lastSeenAt) and
        // skip the secondary-key check entirely, otherwise the job
        // would match its own fingerprint and never get updated again.
        const alreadyStored = await jobRepository.findBySourceAndExternalId(source.id, normalized.externalId);

        if (!alreadyStored) {
          // Brand-new (sourceId, externalId): only now is it meaningful
          // to check whether this is the *same posting* duplicated
          // under a different source/externalId (spec section 21,
          // secondary layer).
          const secondaryDedupeKey = computeSecondaryDedupeKey(normalized);
          const existingBySecondaryKey = await jobRepository.findFingerprintBySecondaryKey(secondaryDedupeKey);
          if (existingBySecondaryKey) {
            result.skippedDuplicates += 1;
            continue;
          }
        }

        const input = mapNormalizedJobToUpsertInput(normalized, source.id, rawJob.raw);
        await jobRepository.upsertBySourceAndExternalId(input);
        result.stored += 1;
      } catch (error) {
        result.errors += 1;
        logger.error({ err: error, sourceName: source.name, externalId: rawJob.externalId }, "Failed to process discovered job");
      }
    }

    return result;
  },

  async runForMatchingSources(filters: string[]): Promise<JobDiscoverySourceResult[]> {
    const wanted = new Set(filters.map((value) => value.toUpperCase()));
    const sources = (await jobSourceRepository.listEnabled()).filter(
      (source) => wanted.has(source.type) || wanted.has(source.name.toUpperCase()) || filters.includes(source.name),
    );
    const results: JobDiscoverySourceResult[] = [];
    for (const source of sources) {
      results.push(await this.runForSource(source));
    }
    await auditService.log("JOB_DISCOVERY_RUN", {
      metadata: { sources: results.map((r) => ({ sourceName: r.sourceName, fetched: r.fetched, stored: r.stored })) },
    });
    return results;
  },

  async runForAllEnabledSources(): Promise<JobDiscoverySourceResult[]> {
    const sources = await jobSourceRepository.listEnabled();
    const results: JobDiscoverySourceResult[] = [];

    for (const source of sources) {
      const result = await this.runForSource(source);
      results.push(result);
    }

    await auditService.log("JOB_DISCOVERY_RUN", {
      metadata: { sources: results.map((r) => ({ sourceName: r.sourceName, fetched: r.fetched, stored: r.stored })) },
    });

    return results;
  },
};
