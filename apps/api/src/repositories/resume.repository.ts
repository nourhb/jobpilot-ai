import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export interface CreateResumeInput {
  profileId: string;
  originalFileName: string;
  storageKey: string;
  mimeType: string;
  fileSize: number;
  parsedText: string;
  parsedJson: Prisma.InputJsonValue;
  confidenceScore: number;
  reviewRequired: boolean;
}

export const resumeRepository = {
  listByProfileId(profileId: string) {
    return prisma.resume.findMany({ where: { profileId }, orderBy: { version: "desc" } });
  },

  findById(id: string) {
    return prisma.resume.findUnique({ where: { id } });
  },

  async create(input: CreateResumeInput) {
    // Never overwrite the original document (section 8): every upload is
    // a new immutable row/version, and the previous active version is
    // demoted rather than deleted.
    return prisma.$transaction(async (tx) => {
      const { _max } = await tx.resume.aggregate({
        where: { profileId: input.profileId },
        _max: { version: true },
      });

      await tx.resume.updateMany({ where: { profileId: input.profileId, isActive: true }, data: { isActive: false } });

      return tx.resume.create({
        data: {
          ...input,
          version: (_max.version ?? 0) + 1,
          isActive: true,
        },
      });
    });
  },

  delete(id: string) {
    return prisma.resume.delete({ where: { id } });
  },
};
