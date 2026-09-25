import type { SkillInput } from "@jobpilot/shared";
import { prisma } from "../lib/prisma";

export const skillRepository = {
  listByProfileId(profileId: string) {
    return prisma.skill.findMany({ where: { profileId }, orderBy: { name: "asc" } });
  },

  findById(id: string) {
    return prisma.skill.findUnique({ where: { id } });
  },

  createManual(profileId: string, input: SkillInput) {
    return prisma.skill.create({ data: { ...input, profileId, source: "MANUAL", verified: true } });
  },

  /**
   * Resume-parser skills are deduplicated by (profileId, name) at the
   * database level (`@@unique`) -- if a skill with the same name already
   * exists for this profile, this quietly skips it rather than erroring,
   * since a duplicate name is expected across repeated CV uploads.
   */
  async createFromParserIfNew(profileId: string, input: SkillInput) {
    return prisma.skill.upsert({
      where: { profileId_name: { profileId, name: input.name } },
      update: {},
      create: { ...input, profileId, source: "RESUME_PARSER", verified: false },
    });
  },

  update(id: string, input: SkillInput) {
    return prisma.skill.update({ where: { id }, data: { ...input, verified: true } });
  },

  delete(id: string) {
    return prisma.skill.delete({ where: { id } });
  },

  verifyMany(profileId: string, ids: string[]) {
    if (ids.length === 0) return Promise.resolve({ count: 0 });
    return prisma.skill.updateMany({ where: { id: { in: ids }, profileId }, data: { verified: true } });
  },

  deleteUnverifiedFromParser(profileId: string) {
    return prisma.skill.deleteMany({
      where: { profileId, source: "RESUME_PARSER", verified: false },
    });
  },
};
