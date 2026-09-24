import type { WorkExperienceInput } from "@jobpilot/shared";
import { prisma } from "../lib/prisma";

export const workExperienceRepository = {
  listByProfileId(profileId: string) {
    return prisma.workExperience.findMany({ where: { profileId }, orderBy: { startDate: "desc" } });
  },

  findById(id: string) {
    return prisma.workExperience.findUnique({ where: { id } });
  },

  createManual(profileId: string, input: WorkExperienceInput) {
    return prisma.workExperience.create({
      data: { ...input, profileId, source: "MANUAL", verified: true },
    });
  },

  createFromParser(profileId: string, input: Omit<WorkExperienceInput, "isCurrent"> & { isCurrent: boolean }) {
    return prisma.workExperience.create({
      data: { ...input, profileId, source: "RESUME_PARSER", verified: false },
    });
  },

  update(id: string, input: WorkExperienceInput) {
    // A manual edit is, by definition, information the user is now
    // vouching for directly -- promote it to verified (section 11: "the
    // user can manually correct the CV parser").
    return prisma.workExperience.update({ where: { id }, data: { ...input, verified: true } });
  },

  delete(id: string) {
    return prisma.workExperience.delete({ where: { id } });
  },

  verifyMany(profileId: string, ids: string[]) {
    if (ids.length === 0) return Promise.resolve({ count: 0 });
    return prisma.workExperience.updateMany({ where: { id: { in: ids }, profileId }, data: { verified: true } });
  },
};
