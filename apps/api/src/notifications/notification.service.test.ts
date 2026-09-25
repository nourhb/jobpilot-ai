import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../repositories/notification.repository", () => ({
  notificationRepository: {
    create: vi.fn(),
    list: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}));

describe("notificationService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates a notification", async () => {
    const { notificationRepository } = await import("../repositories/notification.repository");
    const { notificationService } = await import("./notification.service");
    vi.mocked(notificationRepository.create).mockResolvedValue({ id: "n-1" } as never);

    const result = await notificationService.notify({
      userId: "user-1",
      type: "APPLICATION_SUBMITTED",
      title: "Application submitted",
      body: "Submitted via mock-ats.",
    });

    expect(result).toEqual({ id: "n-1" });
  });

  it("swallows a repository failure so the application pipeline is not blocked", async () => {
    const { notificationRepository } = await import("../repositories/notification.repository");
    const { notificationService } = await import("./notification.service");
    vi.mocked(notificationRepository.create).mockRejectedValue(new Error("db down"));

    await expect(
      notificationService.notify({ userId: "user-1", type: "APPLICATION_FAILED", title: "Failed", body: "down" }),
    ).resolves.toBeNull();
  });
});
