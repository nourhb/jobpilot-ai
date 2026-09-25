import type { EducationInput } from "@jobpilot/shared";
import { prisma } from "../lib/prisma";

export const educationRepository = {
  listByProfileId(profileId: string) {
    return prisma.education.findMany({ where: { profileId }, orderBy: { createdAt: "desc" } });
  },

  findById(id: string) {
    return prisma.education.findUnique({ where: { id } });
  },

  createManual(profileId: string, input: EducationInput) {
    return prisma.education.create({ data: { ...input, profileId, source: "MANUAL", verified: true } });
  },

  createFromParser(profileId: string, input: EducationInput) {
    return prisma.education.create({ data: { ...input, profileId, source: "RESUME_PARSER", verified: false } });
  },

  update(id: string, input: EducationInput) {
    return prisma.education.update({ where: { id }, data: { ...input, verified: true } });
  },

  delete(id: string) {
    return prisma.education.delete({ where: { id } });
  },

  verifyMany(profileId: string, ids: string[]) {
    if (ids.length === 0) return Promise.resolve({ count: 0 });
    return prisma.education.updateMany({ where: { id: { in: ids }, profileId }, data: { verified: true } });
  },

  deleteUnverifiedFromParser(profileId: string) {
    return prisma.education.deleteMany({
      where: { profileId, source: "RESUME_PARSER", verified: false },
    });
  },
};
