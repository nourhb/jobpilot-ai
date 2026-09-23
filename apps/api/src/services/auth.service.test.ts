import { beforeEach, describe, expect, it, vi } from "vitest";
import argon2 from "argon2";
import { AppError } from "../middleware/errorHandler";

vi.mock("../repositories/user.repository", () => ({
  userRepository: {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("../audit/audit.service", () => ({
  auditService: { log: vi.fn() },
}));

const baseUser = {
  id: "user-1",
  email: "jane@example.com",
  firstName: "Jane",
  lastName: "Doe",
  phone: null,
  city: null,
  province: null,
  country: null,
  linkedinUrl: null,
  githubUrl: null,
  portfolioUrl: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("authService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("registers a new user and returns a public user + access token", async () => {
    const { userRepository } = await import("../repositories/user.repository");
    const { authService } = await import("./auth.service");

    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(userRepository.create).mockResolvedValue({ ...baseUser, passwordHash: "hashed" });

    const result = await authService.register({
      email: "jane@example.com",
      password: "StrongPass123",
      firstName: "Jane",
      lastName: "Doe",
    });

    expect(result.user.email).toBe("jane@example.com");
    expect(result.user).not.toHaveProperty("passwordHash");
    expect(typeof result.accessToken).toBe("string");
    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: "jane@example.com", firstName: "Jane", lastName: "Doe" }),
    );
  });

  it("rejects registration when the email is already taken", async () => {
    const { userRepository } = await import("../repositories/user.repository");
    const { authService } = await import("./auth.service");

    vi.mocked(userRepository.findByEmail).mockResolvedValue({ ...baseUser, passwordHash: "hashed" });

    await expect(
      authService.register({
        email: "jane@example.com",
        password: "StrongPass123",
        firstName: "Jane",
        lastName: "Doe",
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("logs in successfully with correct credentials", async () => {
    const { userRepository } = await import("../repositories/user.repository");
    const { authService } = await import("./auth.service");

    const passwordHash = await argon2.hash("StrongPass123");
    vi.mocked(userRepository.findByEmail).mockResolvedValue({ ...baseUser, passwordHash });

    const result = await authService.login({ email: "jane@example.com", password: "StrongPass123" });

    expect(result.user.email).toBe("jane@example.com");
    expect(typeof result.accessToken).toBe("string");
  });

  it("rejects login with an incorrect password", async () => {
    const { userRepository } = await import("../repositories/user.repository");
    const { authService } = await import("./auth.service");

    const passwordHash = await argon2.hash("StrongPass123");
    vi.mocked(userRepository.findByEmail).mockResolvedValue({ ...baseUser, passwordHash });

    await expect(authService.login({ email: "jane@example.com", password: "WrongPassword" })).rejects.toBeInstanceOf(
      AppError,
    );
  });

  it("rejects login for a non-existent user without leaking which part was wrong", async () => {
    const { userRepository } = await import("../repositories/user.repository");
    const { authService } = await import("./auth.service");

    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);

    await expect(authService.login({ email: "ghost@example.com", password: "whatever" })).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
    });
  });
});
