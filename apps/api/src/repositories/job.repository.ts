import type { JobEmploymentType, JobSourceType, JobStatus, Prisma, RemoteType } from "@prisma/client";
import {
  COUNTRY_FILTER_ALIASES,
  EMPLOYMENT_FILTER_TERMS,
  EXPERIENCE_FILTER_TERMS,
  JOB_DOMAIN_FILTER_TERMS,
  JOB_FIELD_FILTER_TERMS,
  type JobCountryFilter,
  type JobDomain,
  type JobEmploymentType as SharedEmploymentType,
  type JobExperienceLevel,
  type JobField,
} from "@jobpilot/shared";
import { prisma } from "../lib/prisma";

export interface UpsertJobInput {
  sourceId: string;
  externalId: string;
  title: string;
  company: string;
  description: string;
  descriptionHtml?: string | null;
  locationRaw?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  remoteType: RemoteType;
  employmentType: JobEmploymentType;
  experienceLevel?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: string | null;
  jobUrl?: string | null;
  applicationType: Prisma.JobCreateInput["applicationType"];
  applicationUrl?: string | null;
  postedAt?: Date | null;
  expiresAt?: Date | null;
  rawData: Prisma.InputJsonValue;
  contentHash: string;
  secondaryDedupeKey: string;
}

export interface JobListFilters {
  page: number;
  pageSize: number;
  search?: string;
  remoteType?: RemoteType;
  employmentType?: JobEmploymentType;
  experienceLevel?: JobExperienceLevel;
  country?: string;
  field?: JobField;
  domain?: JobDomain;
  status?: JobStatus;
}

function containsAny(
  fields: Array<"title" | "description" | "company" | "locationRaw" | "city" | "province" | "country" | "experienceLevel">,
  terms: string[],
): Prisma.JobWhereInput {
  return {
    OR: terms.flatMap((term) => fields.map((field) => ({ [field]: { contains: term, mode: "insensitive" } }))),
  };
}

export const jobRepository = {
  /**
   * The DB-level (sourceId, externalId) unique constraint is the primary
   * duplicate key (spec section 21) -- upserting is what makes discovery
   * idempotent: re-discovering the same posting updates it in place
   * (bumping lastSeenAt) instead of creating a second row.
   */
  upsertBySourceAndExternalId(input: UpsertJobInput) {
    const { sourceId, externalId, ...data } = input;
    return prisma.job.upsert({
      where: { sourceId_externalId: { sourceId, externalId } },
      create: { sourceId, externalId, ...data },
      update: { ...data, lastSeenAt: new Date() },
    });
  },

  findById(id: string) {
    return prisma.job.findUnique({ where: { id } });
  },

  /** Includes the parent JobSource -- needed to route to the right ApplicationAdapter (section 38) by source type. */
  findByIdWithSource(id: string) {
    return prisma.job.findUnique({ where: { id }, include: { source: true } });
  },

  findBySourceAndExternalId(sourceId: string, externalId: string) {
    return prisma.job.findUnique({ where: { sourceId_externalId: { sourceId, externalId } } });
  },

  /**
   * Phase 8: active postings the scheduler should match. An empty
   * `sourceTypes` list means "no restriction" (every source is eligible),
   * matching JobPreference.allowedSourceTypes' documented empty-array
   * semantics.
   */
  listActiveIds(sourceTypes: JobSourceType[] = []) {
    return prisma.job.findMany({
      where: {
        status: "ACTIVE",
        ...(sourceTypes.length > 0 ? { source: { type: { in: sourceTypes } } } : {}),
      },
      select: { id: true },
    });
  },

  /** Fingerprints of already-stored jobs, used for secondary/tertiary dedup lookups. */
  findFingerprintByContentHash(contentHash: string) {
    return prisma.job.findFirst({ where: { contentHash }, select: { id: true } });
  },

  findFingerprintBySecondaryKey(secondaryDedupeKey: string) {
    return prisma.job.findFirst({ where: { secondaryDedupeKey }, select: { id: true } });
  },

  async list(filters: JobListFilters) {
    const extra: Prisma.JobWhereInput[] = [];

    if (filters.search) {
      extra.push({
        OR: [
          { title: { contains: filters.search, mode: "insensitive" } },
          { company: { contains: filters.search, mode: "insensitive" } },
        ],
      });
    }

    if (filters.remoteType && filters.remoteType !== "UNKNOWN") {
      extra.push({
        OR: [
          { remoteType: filters.remoteType },
          ...(filters.remoteType === "REMOTE" ? [{ locationRaw: { contains: "remote", mode: "insensitive" as const } }] : []),
          ...(filters.remoteType === "HYBRID" ? [{ locationRaw: { contains: "hybrid", mode: "insensitive" as const } }] : []),
        ],
      });
    }

    if (filters.employmentType && filters.employmentType !== "UNKNOWN") {
      const terms = EMPLOYMENT_FILTER_TERMS[filters.employmentType as Exclude<SharedEmploymentType, "UNKNOWN">] ?? [];
      extra.push({
        OR: [{ employmentType: filters.employmentType }, ...(terms.length ? [containsAny(["title", "description"], terms)] : [])],
      });
    }

    if (filters.experienceLevel) {
      const terms = EXPERIENCE_FILTER_TERMS[filters.experienceLevel] ?? [];
      extra.push({
        OR: [{ experienceLevel: { equals: filters.experienceLevel, mode: "insensitive" } }, containsAny(["title", "description", "experienceLevel"], terms)],
      });
    }

    if (filters.country) {
      const aliases = COUNTRY_FILTER_ALIASES[filters.country as JobCountryFilter] ?? [filters.country];
      extra.push(containsAny(["country", "locationRaw", "city", "province"], aliases));
    }

    if (filters.field) {
      extra.push(containsAny(["title"], JOB_FIELD_FILTER_TERMS[filters.field]));
    }

    if (filters.domain) {
      extra.push(containsAny(["title", "company"], JOB_DOMAIN_FILTER_TERMS[filters.domain]));
    }

    const where: Prisma.JobWhereInput = {
      status: filters.status ?? "ACTIVE",
      AND: extra,
    };

    const [items, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { postedAt: "desc" },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
        include: { source: { select: { name: true, type: true } } },
      }),
      prisma.job.count({ where }),
    ]);

    return { items, total };
  },

  /**
   * Candidate pool for CV ranking: active postings whose title or
   * description mentions a verified skill or past job title.
   */
  listByKeywords(keywords: string[], take = 400) {
    const terms = [...new Set(keywords.map((keyword) => keyword.trim()).filter((keyword) => keyword.length >= 2))].slice(
      0,
      16,
    );
    if (terms.length === 0) return Promise.resolve([]);

    return prisma.job.findMany({
      where: {
        status: "ACTIVE",
        OR: terms.flatMap((term) => [
          { title: { contains: term, mode: "insensitive" as const } },
          { description: { contains: term, mode: "insensitive" as const } },
        ]),
      },
      take,
      orderBy: { lastSeenAt: "desc" },
      include: { source: { select: { name: true, type: true } } },
    });
  },

  listRecentActive(take = 300) {
    return prisma.job.findMany({
      where: { status: "ACTIVE" },
      take,
      orderBy: { lastSeenAt: "desc" },
      include: { source: { select: { name: true, type: true } } },
    });
  },
};
