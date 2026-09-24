import type { ApplicationStatus, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export interface CreateApplicationInput {
  userId: string;
  jobId: string;
  idempotencyKey: string;
  jobSnapshot: Prisma.InputJsonValue;
  candidateSnapshot: Prisma.InputJsonValue;
  matchScore: number;
  matchCategory: Prisma.ApplicationCreateInput["matchCategory"];
}

export interface UpdateApplicationStatusInput {
  status: ApplicationStatus;
  manualReviewReason?: string | null;
  blockedReason?: string | null;
  failureReason?: string | null;
  submittedAt?: Date | null;
  externalApplicationId?: string | null;
}

const detailInclude = {
  coverLetter: true,
  answers: { orderBy: { createdAt: "asc" as const } },
  events: { orderBy: { createdAt: "asc" as const } },
  job: true,
};

export const applicationRepository = {
  create(input: CreateApplicationInput) {
    return prisma.application.create({
      data: { ...input, status: "QUALIFIED" },
    });
  },

  findById(id: string) {
    return prisma.application.findUnique({ where: { id }, include: detailInclude });
  },

  findByUserAndJob(userId: string, jobId: string) {
    return prisma.application.findUnique({ where: { userId_jobId: { userId, jobId } } });
  },

  async findOwnedById(userId: string, id: string) {
    const application = await prisma.application.findUnique({ where: { id }, include: detailInclude });
    if (!application || application.userId !== userId) return null;
    return application;
  },

  async list(userId: string, filters: { status?: ApplicationStatus; page: number; pageSize: number }) {
    const where: Prisma.ApplicationWhereInput = { userId, ...(filters.status ? { status: filters.status } : {}) };

    const [items, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: { job: true },
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      prisma.application.count({ where }),
    ]);

    return { items, total };
  },

  updateStatus(id: string, input: UpdateApplicationStatusInput) {
    return prisma.application.update({ where: { id }, data: input });
  },
};
