import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../repositories/jobPreference.repository", () => ({
  jobPreferenceRepository: {
    getOrCreateForUser: vi.fn(),
    update: vi.fn(),
  },
}));
vi.mock("../audit/audit.service", () => ({
  auditService: { log: vi.fn() },
}));

describe("preferencesService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("getPreferences returns (and lazily creates) the user's JobPreference row", async () => {
    const { jobPreferenceRepository } = await import("../repositories/jobPreference.repository");
    const { preferencesService } = await import("./preferences.service");
    vi.mocked(jobPreferenceRepository.getOrCreateForUser).mockResolvedValue({ id: "pref-1" } as never);

    const result = await preferencesService.getPreferences("user-1");

    expect(result).toEqual({ id: "pref-1" });
    expect(jobPreferenceRepository.getOrCreateForUser).toHaveBeenCalledWith("user-1");
  });

  it("updatePreferences ensures the row exists, updates it, and writes an audit log", async () => {
    const { jobPreferenceRepository } = await import("../repositories/jobPreference.repository");
    const { auditService } = await import("../audit/audit.service");
    const { preferencesService } = await import("./preferences.service");
    vi.mocked(jobPreferenceRepository.getOrCreateForUser).mockResolvedValue({ id: "pref-1" } as never);
    vi.mocked(jobPreferenceRepository.update).mockResolvedValue({ id: "pref-1", minimumMatchScore: 80 } as never);

    const result = await preferencesService.updatePreferences("user-1", { minimumMatchScore: 80 });

    expect(result).toEqual({ id: "pref-1", minimumMatchScore: 80 });
    expect(jobPreferenceRepository.update).toHaveBeenCalledWith("user-1", { minimumMatchScore: 80 });
    expect(auditService.log).toHaveBeenCalledWith(
      "PREFERENCES_UPDATED",
      expect.objectContaining({ userId: "user-1", entityType: "JobPreference", entityId: "pref-1" }),
    );
  });
});
