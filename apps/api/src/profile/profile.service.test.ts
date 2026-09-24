import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../middleware/errorHandler";

vi.mock("../repositories/profile.repository", () => ({
  profileRepository: {
    getOrCreateForUser: vi.fn(),
    findByUserId: vi.fn(),
    updateScalars: vi.fn(),
  },
}));
vi.mock("../repositories/resume.repository", () => ({
  resumeRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    listByProfileId: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock("../repositories/workExperience.repository", () => ({
  workExperienceRepository: {
    createManual: vi.fn(),
    createFromParser: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findById: vi.fn(),
    verifyMany: vi.fn(),
  },
}));
vi.mock("../repositories/education.repository", () => ({
  educationRepository: {
    createManual: vi.fn(),
    createFromParser: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findById: vi.fn(),
    verifyMany: vi.fn(),
  },
}));
vi.mock("../repositories/skill.repository", () => ({
  skillRepository: {
    createManual: vi.fn(),
    createFromParserIfNew: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findById: vi.fn(),
    verifyMany: vi.fn(),
  },
}));
vi.mock("../repositories/certification.repository", () => ({
  certificationRepository: {
    createManual: vi.fn(),
    createFromParser: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findById: vi.fn(),
    verifyMany: vi.fn(),
  },
}));
vi.mock("../repositories/user.repository", () => ({
  userRepository: {
    findById: vi.fn(),
    updateContactIfEmpty: vi.fn(),
  },
}));
vi.mock("../documents/storage", () => ({
  getStorageAdapter: vi.fn(),
}));
vi.mock("../documents/fileValidation", () => ({
  validateResumeUpload: vi.fn(),
}));
vi.mock("../documents/textExtraction", () => ({
  extractResumeText: vi.fn(),
}));
vi.mock("../lib/aiProvider", () => ({
  getAIProvider: vi.fn(),
}));
vi.mock("@jobpilot/ai", () => ({
  parseResume: vi.fn(),
}));
vi.mock("../audit/audit.service", () => ({
  auditService: { log: vi.fn() },
}));

const baseProfile = {
  id: "profile-1",
  userId: "user-1",
  professionalSummary: null,
  yearsOfExperience: null,
  workAuthorization: null,
  requiresSponsorship: false,
  willingToRelocate: false,
  remotePreference: null,
  desiredJobTitles: [] as string[],
  minimumSalary: null,
  maximumSalary: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

describe("profileService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getFullProfile", () => {
    it("lazily creates the profile row then returns the full profile with relations", async () => {
      const { profileRepository } = await import("../repositories/profile.repository");
      const { profileService } = await import("./profile.service");

      vi.mocked(profileRepository.getOrCreateForUser).mockResolvedValue(baseProfile);
      vi.mocked(profileRepository.findByUserId).mockResolvedValue({
        ...baseProfile,
        resumes: [],
        workExperiences: [],
        educations: [],
        skills: [],
        certifications: [],
      });

      const result = await profileService.getFullProfile("user-1");

      expect(profileRepository.getOrCreateForUser).toHaveBeenCalledWith("user-1");
      expect(result.id).toBe("profile-1");
    });

    it("throws a 404 AppError if the profile disappears between create and read", async () => {
      const { profileRepository } = await import("../repositories/profile.repository");
      const { profileService } = await import("./profile.service");

      vi.mocked(profileRepository.getOrCreateForUser).mockResolvedValue(baseProfile);
      vi.mocked(profileRepository.findByUserId).mockResolvedValue(null);

      await expect(profileService.getFullProfile("user-1")).rejects.toBeInstanceOf(AppError);
    });
  });

  describe("updateProfile", () => {
    it("updates scalar fields and writes an audit log entry", async () => {
      const { profileRepository } = await import("../repositories/profile.repository");
      const { auditService } = await import("../audit/audit.service");
      const { profileService } = await import("./profile.service");

      vi.mocked(profileRepository.getOrCreateForUser).mockResolvedValue(baseProfile);
      vi.mocked(profileRepository.updateScalars).mockResolvedValue({
        ...baseProfile,
        professionalSummary: "Senior engineer.",
      });

      const result = await profileService.updateProfile("user-1", { professionalSummary: "Senior engineer." });

      expect(result.professionalSummary).toBe("Senior engineer.");
      expect(profileRepository.updateScalars).toHaveBeenCalledWith("profile-1", {
        professionalSummary: "Senior engineer.",
      });
      expect(auditService.log).toHaveBeenCalledWith(
        "PROFILE_UPDATED",
        expect.objectContaining({ userId: "user-1", entityType: "Profile", entityId: "profile-1" }),
      );
    });
  });

  describe("verifyItems", () => {
    it("verifies items across all four entity types and sums the verified count", async () => {
      const { profileRepository } = await import("../repositories/profile.repository");
      const { workExperienceRepository } = await import("../repositories/workExperience.repository");
      const { educationRepository } = await import("../repositories/education.repository");
      const { skillRepository } = await import("../repositories/skill.repository");
      const { certificationRepository } = await import("../repositories/certification.repository");
      const { profileService } = await import("./profile.service");

      vi.mocked(profileRepository.getOrCreateForUser).mockResolvedValue(baseProfile);
      vi.mocked(workExperienceRepository.verifyMany).mockResolvedValue({ count: 2 });
      vi.mocked(educationRepository.verifyMany).mockResolvedValue({ count: 1 });
      vi.mocked(skillRepository.verifyMany).mockResolvedValue({ count: 3 });
      vi.mocked(certificationRepository.verifyMany).mockResolvedValue({ count: 0 });

      const result = await profileService.verifyItems("user-1", {
        workExperienceIds: ["a", "b"],
        educationIds: ["c"],
        skillIds: ["d", "e", "f"],
        certificationIds: [],
      });

      expect(result).toEqual({ verified: 6 });
    });
  });

  describe("addExperience / updateExperience / deleteExperience", () => {
    it("adds a manual work experience entry under the caller's profile", async () => {
      const { profileRepository } = await import("../repositories/profile.repository");
      const { workExperienceRepository } = await import("../repositories/workExperience.repository");
      const { profileService } = await import("./profile.service");

      vi.mocked(profileRepository.getOrCreateForUser).mockResolvedValue(baseProfile);
      vi.mocked(workExperienceRepository.createManual).mockResolvedValue({ id: "exp-1" } as never);

      const input = {
        company: "Acme",
        jobTitle: "Engineer",
        location: null,
        startDate: new Date("2024-01-01"),
        endDate: null,
        isCurrent: true,
        description: null,
      };

      await profileService.addExperience("user-1", input);

      expect(workExperienceRepository.createManual).toHaveBeenCalledWith("profile-1", input);
    });

    it("rejects updating an experience entry owned by a different profile", async () => {
      const { profileRepository } = await import("../repositories/profile.repository");
      const { workExperienceRepository } = await import("../repositories/workExperience.repository");
      const { profileService } = await import("./profile.service");

      vi.mocked(profileRepository.getOrCreateForUser).mockResolvedValue(baseProfile);
      vi.mocked(workExperienceRepository.findById).mockResolvedValue({
        id: "exp-1",
        profileId: "someone-elses",
      } as never);

      await expect(
        profileService.updateExperience("user-1", "exp-1", {
          company: "Acme",
          jobTitle: "Engineer",
          location: null,
          startDate: new Date("2024-01-01"),
          endDate: null,
          isCurrent: true,
          description: null,
        }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe("uploadResume", () => {
    it("validates, extracts, parses, stores, and seeds unverified items from the resume", async () => {
      const { profileRepository } = await import("../repositories/profile.repository");
      const { resumeRepository } = await import("../repositories/resume.repository");
      const { workExperienceRepository } = await import("../repositories/workExperience.repository");
      const { educationRepository } = await import("../repositories/education.repository");
      const { skillRepository } = await import("../repositories/skill.repository");
      const { certificationRepository } = await import("../repositories/certification.repository");
      const { userRepository } = await import("../repositories/user.repository");
      const { getStorageAdapter } = await import("../documents/storage");
      const { validateResumeUpload } = await import("../documents/fileValidation");
      const { extractResumeText } = await import("../documents/textExtraction");
      const { parseResume } = await import("@jobpilot/ai");
      const { profileService } = await import("./profile.service");

      vi.mocked(profileRepository.getOrCreateForUser).mockResolvedValue(baseProfile);
      vi.mocked(validateResumeUpload).mockReturnValue("pdf");
      vi.mocked(extractResumeText).mockResolvedValue("Jane Doe, Software Engineer...");
      vi.mocked(getStorageAdapter).mockReturnValue({
        save: vi.fn().mockResolvedValue("storage-key-1"),
        read: vi.fn(),
        delete: vi.fn(),
      });
      vi.mocked(parseResume).mockResolvedValue({
        data: {
          personal: { city: "Toronto", country: "Canada", linkedinUrl: null, githubUrl: null, portfolioUrl: null },
          skills: [{ name: "TypeScript", category: null, yearsExperience: null }],
          experience: [
            {
              company: "Acme",
              jobTitle: "Engineer",
              location: null,
              startDate: "2024-01-01",
              endDate: null,
              isCurrent: true,
              description: null,
            },
          ],
          education: [],
          certifications: [],
        },
        confidence: 0.4,
        reviewRequired: true,
        promptVersion: "v1",
      } as never);
      vi.mocked(resumeRepository.create).mockResolvedValue({ id: "resume-1" } as never);
      vi.mocked(resumeRepository.findById).mockResolvedValue({ id: "resume-1", isActive: true } as never);
      vi.mocked(skillRepository.createFromParserIfNew).mockResolvedValue(undefined as never);
      vi.mocked(workExperienceRepository.createFromParser).mockResolvedValue(undefined as never);
      vi.mocked(educationRepository.createFromParser).mockResolvedValue(undefined as never);
      vi.mocked(certificationRepository.createFromParser).mockResolvedValue(undefined as never);
      vi.mocked(userRepository.updateContactIfEmpty).mockResolvedValue(undefined as never);

      const result = await profileService.uploadResume("user-1", {
        originalName: "resume.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("fake-pdf-bytes"),
      });

      expect(result).toEqual({ id: "resume-1", isActive: true });
      expect(skillRepository.createFromParserIfNew).toHaveBeenCalledWith(
        "profile-1",
        expect.objectContaining({ name: "TypeScript" }),
      );
      expect(workExperienceRepository.createFromParser).toHaveBeenCalledWith(
        "profile-1",
        expect.objectContaining({ company: "Acme" }),
      );
      // Contact fields are only ever filled in if empty, never overwritten.
      expect(userRepository.updateContactIfEmpty).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ city: "Toronto", country: "Canada" }),
      );
    });

    it("rejects an unreadable file with a 422 before ever touching storage", async () => {
      const { profileRepository } = await import("../repositories/profile.repository");
      const { validateResumeUpload } = await import("../documents/fileValidation");
      const { extractResumeText } = await import("../documents/textExtraction");
      const { getStorageAdapter } = await import("../documents/storage");
      const { profileService } = await import("./profile.service");

      const save = vi.fn();
      vi.mocked(profileRepository.getOrCreateForUser).mockResolvedValue(baseProfile);
      vi.mocked(validateResumeUpload).mockReturnValue("pdf");
      vi.mocked(extractResumeText).mockResolvedValue("");
      vi.mocked(getStorageAdapter).mockReturnValue({ save, read: vi.fn(), delete: vi.fn() });

      await expect(
        profileService.uploadResume("user-1", {
          originalName: "empty.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.from(""),
        }),
      ).rejects.toMatchObject({ statusCode: 422 });

      expect(save).not.toHaveBeenCalled();
    });

    it("cleans up the stored file and surfaces a 502 if parsing throws", async () => {
      const { profileRepository } = await import("../repositories/profile.repository");
      const { validateResumeUpload } = await import("../documents/fileValidation");
      const { extractResumeText } = await import("../documents/textExtraction");
      const { getStorageAdapter } = await import("../documents/storage");
      const { parseResume } = await import("@jobpilot/ai");
      const { profileService } = await import("./profile.service");

      const deleteFn = vi.fn().mockResolvedValue(undefined);
      vi.mocked(profileRepository.getOrCreateForUser).mockResolvedValue(baseProfile);
      vi.mocked(validateResumeUpload).mockReturnValue("pdf");
      vi.mocked(extractResumeText).mockResolvedValue("some text");
      vi.mocked(getStorageAdapter).mockReturnValue({
        save: vi.fn().mockResolvedValue("storage-key-1"),
        read: vi.fn(),
        delete: deleteFn,
      });
      vi.mocked(parseResume).mockRejectedValue(new Error("provider exploded"));

      await expect(
        profileService.uploadResume("user-1", {
          originalName: "resume.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.from("bytes"),
        }),
      ).rejects.toMatchObject({ statusCode: 502 });

      expect(deleteFn).toHaveBeenCalledWith("storage-key-1");
    });
  });

  describe("deleteResume", () => {
    it("rejects deleting a resume that belongs to a different profile", async () => {
      const { profileRepository } = await import("../repositories/profile.repository");
      const { resumeRepository } = await import("../repositories/resume.repository");
      const { profileService } = await import("./profile.service");

      vi.mocked(profileRepository.getOrCreateForUser).mockResolvedValue(baseProfile);
      vi.mocked(resumeRepository.findById).mockResolvedValue({
        id: "resume-1",
        profileId: "someone-elses",
      } as never);

      await expect(profileService.deleteResume("user-1", "resume-1")).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
