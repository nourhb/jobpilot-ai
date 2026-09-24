import { prisma } from "../lib/prisma";

export interface UpsertCoverLetterInput {
  applicationId: string;
  content: string;
  model: string;
  promptVersion: string;
}

export const coverLetterRepository = {
  /** A retried application regenerates its cover letter in place -- only the latest attempt is ever submittable (see prisma/schema.prisma's CoverLetter doc comment). */
  upsert(input: UpsertCoverLetterInput) {
    const { applicationId, ...data } = input;
    return prisma.coverLetter.upsert({
      where: { applicationId },
      create: { applicationId, ...data },
      update: data,
    });
  },
};
