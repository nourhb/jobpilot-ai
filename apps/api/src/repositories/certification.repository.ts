import type { CertificationInput } from "@jobpilot/shared";
import { prisma } from "../lib/prisma";

export const certificationRepository = {
  listByProfileId(profileId: string) {
    return prisma.certification.findMany({ where: { profileId }, orderBy: { createdAt: "desc" } });
  },

  findById(id: string) {
    return prisma.certification.findUnique({ where: { id } });
  },

  createManual(profileId: string, input: CertificationInput) {
    return prisma.certification.create({ data: { ...input, profileId, source: "MANUAL", verified: true } });
  },

  createFromParser(profileId: string, input: CertificationInput) {
    return prisma.certification.create({ data: { ...input, profileId, source: "RESUME_PARSER", verified: false } });
  },

  update(id: string, input: CertificationInput) {
    return prisma.certification.update({ where: { id }, data: { ...input, verified: true } });
  },

  delete(id: string) {
    return prisma.certification.delete({ where: { id } });
  },

  verifyMany(profileId: string, ids: string[]) {
    if (ids.length === 0) return Promise.resolve({ count: 0 });
    return prisma.certification.updateMany({ where: { id: { in: ids }, profileId }, data: { verified: true } });
  },

  deleteUnverifiedFromParser(profileId: string) {
    return prisma.certification.deleteMany({
      where: { profileId, source: "RESUME_PARSER", verified: false },
    });
  },
};
