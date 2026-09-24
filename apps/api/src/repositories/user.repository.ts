import type { User } from "@prisma/client";
import { prisma } from "../lib/prisma";

/**
 * Only this module (and other repositories) may import `prisma` directly
 * (Cursor rule #5/#6). Controllers and services must go through here.
 */
export interface CreateUserInput {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
}

export const userRepository = {
  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  create(input: CreateUserInput): Promise<User> {
    return prisma.user.create({ data: input });
  },

  update(id: string, input: Partial<Pick<User, "firstName" | "lastName" | "phone" | "city" | "province" | "country" | "linkedinUrl" | "githubUrl" | "portfolioUrl">>): Promise<User> {
    return prisma.user.update({ where: { id }, data: input });
  },

  /**
   * Used by the resume parser (Phase 2) to fill in contact fields it
   * found on the CV -- only when the field is currently empty, so a
   * resume upload can never silently overwrite something the user
   * already entered themselves.
   */
  async updateContactIfEmpty(
    id: string,
    fields: Partial<Pick<User, "city" | "country" | "linkedinUrl" | "githubUrl" | "portfolioUrl">>,
  ): Promise<User> {
    const user = await prisma.user.findUniqueOrThrow({ where: { id } });
    const data: Record<string, string> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value && !user[key as keyof User]) {
        data[key] = value;
      }
    }
    if (Object.keys(data).length === 0) return user;
    return prisma.user.update({ where: { id }, data });
  },
};
