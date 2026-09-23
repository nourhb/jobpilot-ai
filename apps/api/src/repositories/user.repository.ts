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
};
