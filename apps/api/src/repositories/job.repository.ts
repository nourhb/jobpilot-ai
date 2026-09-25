import type { JobEmploymentType, JobSourceType, JobStatus, Prisma, RemoteType } from "@prisma/client";
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
  country?: string;
  status?: JobStatus;
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
    const where: Prisma.JobWhereInput = {
      status: filters.status ?? "ACTIVE",
      ...(filters.remoteType ? { remoteType: filters.remoteType } : {}),
      ...(filters.employmentType ? { employmentType: filters.employmentType } : {}),
      ...(filters.country ? { country: { equals: filters.country, mode: "insensitive" } } : {}),
      ...(filters.search
        ? {
            OR: [
              { title: { contains: filters.search, mode: "insensitive" } },
              { company: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { postedAt: "desc" },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      prisma.job.count({ where }),
    ]);

    return { items, total };
  },
};
