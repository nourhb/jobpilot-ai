import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../agent/agent.service", () => ({
  agentService: { setStatus: vi.fn() },
}));
vi.mock("../audit/audit.service", () => ({
  auditService: { log: vi.fn() },
}));
vi.mock("../documents/storage", () => ({
  getStorageAdapter: vi.fn(() => ({ delete: vi.fn() })),
}));
vi.mock("../repositories/profile.repository", () => ({
  profileRepository: { findByUserId: vi.fn() },
}));
vi.mock("../repositories/user.repository", () => ({
  userRepository: { delete: vi.fn() },
}));

describe("accountService.deleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stops the agent, deletes resume files, audits, then deletes the user", async () => {
    const { agentService } = await import("../agent/agent.service");
    const { auditService } = await import("../audit/audit.service");
    const { getStorageAdapter } = await import("../documents/storage");
    const { profileRepository } = await import("../repositories/profile.repository");
    const { userRepository } = await import("../repositories/user.repository");
    const { accountService } = await import("./account.service");

    const deleteFile = vi.fn();
    vi.mocked(getStorageAdapter).mockReturnValue({
      save: vi.fn(),
      read: vi.fn(),
      delete: deleteFile,
    });
    vi.mocked(profileRepository.findByUserId).mockResolvedValue({
      id: "profile-1",
      resumes: [{ storageKey: "abc.pdf" }],
    } as never);

    await expect(accountService.deleteAccount("user-1")).resolves.toEqual({ deleted: true });

    expect(agentService.setStatus).toHaveBeenCalledWith("user-1", "STOPPED");
    expect(deleteFile).toHaveBeenCalledWith("abc.pdf");
    expect(auditService.log).toHaveBeenCalledWith("ACCOUNT_DELETED", {
      userId: "user-1",
      entityType: "User",
      entityId: "user-1",
    });
    expect(userRepository.delete).toHaveBeenCalledWith("user-1");
  });
});
