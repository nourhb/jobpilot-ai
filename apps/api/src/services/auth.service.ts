import type { RegisterInput, LoginInput } from "@jobpilot/shared";
import argon2 from "argon2";
import type { User } from "@prisma/client";
import { userRepository } from "../repositories/user.repository";
import { auditService } from "../audit/audit.service";
import { signAccessToken } from "../lib/jwt";
import { AppError } from "../middleware/errorHandler";

function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    city: user.city,
    province: user.province,
    country: user.country,
    linkedinUrl: user.linkedinUrl,
    githubUrl: user.githubUrl,
    portfolioUrl: user.portfolioUrl,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export const authService = {
  async register(input: RegisterInput) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new AppError(409, "EMAIL_ALREADY_REGISTERED", "An account with this email already exists.");
    }

    const passwordHash = await argon2.hash(input.password);

    const user = await userRepository.create({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    });

    await auditService.log("USER_REGISTERED", { userId: user.id, entityType: "User", entityId: user.id });

    const accessToken = signAccessToken({ sub: user.id, email: user.email });

    return { user: toPublicUser(user), accessToken };
  },

  async login(input: LoginInput) {
    const user = await userRepository.findByEmail(input.email);

    // Always run argon2.verify (even with a dummy hash) so login timing
    // does not reveal whether an email exists in the system.
    const dummyHash =
      "$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQxMjM0NTY3OA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    const passwordValid = await argon2.verify(user?.passwordHash ?? dummyHash, input.password).catch(() => false);

    if (!user || !passwordValid) {
      await auditService.log("USER_LOGIN_FAILED", { metadata: { email: input.email } });
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }

    await auditService.log("USER_LOGIN", { userId: user.id, entityType: "User", entityId: user.id });

    const accessToken = signAccessToken({ sub: user.id, email: user.email });

    return { user: toPublicUser(user), accessToken };
  },

  async logout(userId: string) {
    await auditService.log("USER_LOGOUT", { userId, entityType: "User", entityId: userId });
  },

  async getById(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found.");
    }
    return toPublicUser(user);
  },
};
