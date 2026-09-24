import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export interface UpsertJobMatchInput {
  userId: string;
  jobId: string;
  score: number;
  matchCategory: Prisma.JobMatchCreateInput["matchCategory"];
  decision: Prisma.JobMatchCreateInput["decision"];
  skillsScore: number;
  experienceScore: number;
  titleScore: number;
  locationScore: number;
  authorizationScore: number;
  salaryScore: number;
  employmentTypeScore: number;
  preferencesScore: number;
  skippedReason?: string | null;
  aiSuggestedDecision?: string | null;
  reasons?: string[];
  missingRequirements?: string[];
  riskFlags?: string[];
  aiModel?: string | null;
  aiPromptVersion?: string | null;
}

export const jobMatchRepository = {
  /**
   * A single (userId, jobId) row is kept up to date rather than
   * accumulating history -- matches are re-computed on demand (this
   * phase) or on a schedule (Phase 8), and only the latest result is
   * meaningful for driving auto-apply decisions.
   */
  upsert(input: UpsertJobMatchInput) {
    const { userId, jobId, ...data } = input;
    return prisma.jobMatch.upsert({
      where: { userId_jobId: { userId, jobId } },
      create: { userId, jobId, ...data },
      update: data,
    });
  },

  findByUserAndJob(userId: string, jobId: string) {
    return prisma.jobMatch.findUnique({ where: { userId_jobId: { userId, jobId } } });
  },
};
