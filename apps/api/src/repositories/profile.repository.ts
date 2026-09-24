import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export interface ProfileScalarUpdate {
  professionalSummary?: string | null;
  yearsOfExperience?: number | null;
  workAuthorization?: Prisma.ProfileUpdateInput["workAuthorization"];
  requiresSponsorship?: boolean;
  willingToRelocate?: boolean;
  remotePreference?: Prisma.ProfileUpdateInput["remotePreference"];
  minimumSalary?: number | null;
  maximumSalary?: number | null;
}

export const profileRepository = {
  findByUserId(userId: string) {
    return prisma.profile.findUnique({
      where: { userId },
      include: {
        resumes: { orderBy: { version: "desc" } },
        workExperiences: { orderBy: { startDate: "desc" } },
        educations: { orderBy: { createdAt: "desc" } },
        skills: { orderBy: { name: "asc" } },
        certifications: { orderBy: { createdAt: "desc" } },
      },
    });
  },

  /** Every user gets exactly one Profile row, created lazily on first access. */
  async getOrCreateForUser(userId: string) {
    const existing = await prisma.profile.findUnique({ where: { userId } });
    if (existing) return existing;
    return prisma.profile.create({ data: { userId } });
  },

  updateScalars(profileId: string, data: ProfileScalarUpdate) {
    return prisma.profile.update({ where: { id: profileId }, data });
  },
};
