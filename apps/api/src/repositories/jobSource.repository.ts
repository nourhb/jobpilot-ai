import { prisma } from "../lib/prisma";

export const jobSourceRepository = {
  listEnabled() {
    return prisma.jobSource.findMany({ where: { enabled: true }, orderBy: { name: "asc" } });
  },

  list() {
    return prisma.jobSource.findMany({ orderBy: { name: "asc" } });
  },

  findByName(name: string) {
    return prisma.jobSource.findUnique({ where: { name } });
  },
};
