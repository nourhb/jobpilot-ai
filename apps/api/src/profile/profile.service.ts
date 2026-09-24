import type {
  CertificationInput,
  EducationInput,
  ProfileUpdateInput,
  SkillInput,
  VerifyProfileItemsInput,
  WorkExperienceInput,
} from "@jobpilot/shared";
import type { Prisma } from "@prisma/client";
import { parseResume } from "@jobpilot/ai";
import { profileRepository } from "../repositories/profile.repository";
import { resumeRepository } from "../repositories/resume.repository";
import { workExperienceRepository } from "../repositories/workExperience.repository";
import { educationRepository } from "../repositories/education.repository";
import { skillRepository } from "../repositories/skill.repository";
import { certificationRepository } from "../repositories/certification.repository";
import { userRepository } from "../repositories/user.repository";
import { getStorageAdapter } from "../documents/storage";
import { validateResumeUpload } from "../documents/fileValidation";
import { extractResumeText } from "../documents/textExtraction";
import { getAIProvider } from "../lib/aiProvider";
import { auditService } from "../audit/audit.service";
import { AppError } from "../middleware/errorHandler";
import { buildVerifiedCandidateProfile } from "./truthLayer";
import { logger } from "../lib/logger";

async function requireOwnedProfile(userId: string) {
  return profileRepository.getOrCreateForUser(userId);
}

export const profileService = {
  async getFullProfile(userId: string) {
    await requireOwnedProfile(userId);
    const profile = await profileRepository.findByUserId(userId);
    if (!profile) {
      throw new AppError(404, "PROFILE_NOT_FOUND", "Profile not found.");
    }
    return profile;
  },

  async updateProfile(userId: string, input: ProfileUpdateInput) {
    const profile = await requireOwnedProfile(userId);
    const updated = await profileRepository.updateScalars(profile.id, input);
    await auditService.log("PROFILE_UPDATED", { userId, entityType: "Profile", entityId: profile.id });
    return updated;
  },

  async getVerifiedCandidateProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError(404, "USER_NOT_FOUND", "User not found.");
    const profile = await this.getFullProfile(userId);
    return buildVerifiedCandidateProfile(
      user,
      profile,
      profile.workExperiences,
      profile.educations,
      profile.skills,
      profile.certifications,
    );
  },

  // -- Resume upload / parsing --------------------------------------

  async uploadResume(userId: string, file: { originalName: string; mimeType: string; buffer: Buffer }) {
    const profile = await requireOwnedProfile(userId);

    const kind = validateResumeUpload({
      originalName: file.originalName,
      mimeType: file.mimeType,
      buffer: file.buffer,
    });

    const text = await extractResumeText(file.buffer, kind);
    if (text.length === 0) {
      throw new AppError(422, "UNREADABLE_FILE", "Could not extract any text from this file.");
    }

    const storage = getStorageAdapter();
    const extension = kind === "pdf" ? ".pdf" : ".docx";
    const storageKey = await storage.save(file.buffer, extension);

    let parsed;
    try {
      parsed = await parseResume(getAIProvider(), text);
    } catch (error) {
      // Never lose the uploaded file if parsing fails -- clean it up and
      // surface a clear error instead of leaving an orphaned blob.
      await storage.delete(storageKey).catch(() => undefined);
      logger.error({ err: error, userId }, "Resume parsing failed");
      throw new AppError(502, "RESUME_PARSING_FAILED", "Could not parse the resume. Please try again.");
    }

    const resume = await resumeRepository.create({
      profileId: profile.id,
      originalFileName: file.originalName,
      storageKey,
      mimeType: file.mimeType,
      fileSize: file.buffer.length,
      parsedText: text,
      parsedJson: parsed.data as unknown as Prisma.InputJsonValue,
      confidenceScore: parsed.confidence,
      reviewRequired: parsed.reviewRequired,
    });

    await auditService.log("CV_UPLOADED", {
      userId,
      entityType: "Resume",
      entityId: resume.id,
      metadata: { fileSize: file.buffer.length, mimeType: file.mimeType },
    });
    await auditService.log("CV_PARSED", {
      userId,
      entityType: "Resume",
      entityId: resume.id,
      metadata: { confidence: parsed.confidence, reviewRequired: parsed.reviewRequired, promptVersion: parsed.promptVersion },
    });

    // Seed unverified suggestions from the extraction -- never
    // auto-verified (section 24/82: the user must confirm before these
    // feed the truth layer).
    for (const skill of parsed.data.skills) {
      await skillRepository.createFromParserIfNew(profile.id, { name: skill.name, category: skill.category, yearsExperience: skill.yearsExperience });
    }
    for (const exp of parsed.data.experience) {
      if (!exp.startDate) continue; // startDate is required by the schema/DB; skip unparseable entries rather than guessing one.
      await workExperienceRepository.createFromParser(profile.id, {
        company: exp.company,
        jobTitle: exp.jobTitle,
        location: exp.location,
        startDate: new Date(exp.startDate),
        endDate: exp.endDate ? new Date(exp.endDate) : null,
        isCurrent: exp.isCurrent ?? false,
        description: exp.description,
      });
    }
    for (const edu of parsed.data.education) {
      await educationRepository.createFromParser(profile.id, {
        institution: edu.institution,
        degree: edu.degree,
        field: edu.field,
        startDate: edu.startDate ? new Date(edu.startDate) : null,
        endDate: edu.endDate ? new Date(edu.endDate) : null,
        description: edu.description,
      });
    }
    for (const cert of parsed.data.certifications) {
      await certificationRepository.createFromParser(profile.id, {
        name: cert.name,
        issuer: cert.issuer,
        issuedAt: cert.issuedAt ? new Date(cert.issuedAt) : null,
        expiresAt: cert.expiresAt ? new Date(cert.expiresAt) : null,
      });
    }

    if (parsed.data.personal.city || parsed.data.personal.country) {
      // Contact/location fields belong on User in this schema (Phase 1),
      // not Profile -- only fill them in if not already set, never
      // silently overwrite user-provided data.
      await userRepository.updateContactIfEmpty(userId, {
        city: parsed.data.personal.city,
        country: parsed.data.personal.country,
        linkedinUrl: parsed.data.personal.linkedinUrl,
        githubUrl: parsed.data.personal.githubUrl,
        portfolioUrl: parsed.data.personal.portfolioUrl,
      });
    }

    return resumeRepository.findById(resume.id);
  },

  async listResumes(userId: string) {
    const profile = await requireOwnedProfile(userId);
    return resumeRepository.listByProfileId(profile.id);
  },

  async deleteResume(userId: string, resumeId: string) {
    const profile = await requireOwnedProfile(userId);
    const resume = await resumeRepository.findById(resumeId);
    if (!resume || resume.profileId !== profile.id) {
      throw new AppError(404, "RESUME_NOT_FOUND", "Resume not found.");
    }
    await getStorageAdapter().delete(resume.storageKey);
    await resumeRepository.delete(resumeId);
  },

  // -- Verification ---------------------------------------------------

  async verifyItems(userId: string, input: VerifyProfileItemsInput) {
    const profile = await requireOwnedProfile(userId);
    const results = await Promise.all([
      workExperienceRepository.verifyMany(profile.id, input.workExperienceIds),
      educationRepository.verifyMany(profile.id, input.educationIds),
      skillRepository.verifyMany(profile.id, input.skillIds),
      certificationRepository.verifyMany(profile.id, input.certificationIds),
    ]);
    const totalVerified = results.reduce((sum, r) => sum + r.count, 0);
    await auditService.log("PROFILE_ITEM_VERIFIED", {
      userId,
      entityType: "Profile",
      entityId: profile.id,
      metadata: { totalVerified },
    });
    return { verified: totalVerified };
  },

  // -- Work experience --------------------------------------------------

  async addExperience(userId: string, input: WorkExperienceInput) {
    const profile = await requireOwnedProfile(userId);
    return workExperienceRepository.createManual(profile.id, input);
  },

  async updateExperience(userId: string, id: string, input: WorkExperienceInput) {
    await assertOwnsExperience(userId, id);
    return workExperienceRepository.update(id, input);
  },

  async deleteExperience(userId: string, id: string) {
    await assertOwnsExperience(userId, id);
    await workExperienceRepository.delete(id);
  },

  // -- Education --------------------------------------------------------

  async addEducation(userId: string, input: EducationInput) {
    const profile = await requireOwnedProfile(userId);
    return educationRepository.createManual(profile.id, input);
  },

  async updateEducation(userId: string, id: string, input: EducationInput) {
    await assertOwnsEducation(userId, id);
    return educationRepository.update(id, input);
  },

  async deleteEducation(userId: string, id: string) {
    await assertOwnsEducation(userId, id);
    await educationRepository.delete(id);
  },

  // -- Skills -------------------------------------------------------------

  async addSkill(userId: string, input: SkillInput) {
    const profile = await requireOwnedProfile(userId);
    return skillRepository.createManual(profile.id, input);
  },

  async updateSkill(userId: string, id: string, input: SkillInput) {
    await assertOwnsSkill(userId, id);
    return skillRepository.update(id, input);
  },

  async deleteSkill(userId: string, id: string) {
    await assertOwnsSkill(userId, id);
    await skillRepository.delete(id);
  },

  // -- Certifications -------------------------------------------------------

  async addCertification(userId: string, input: CertificationInput) {
    const profile = await requireOwnedProfile(userId);
    return certificationRepository.createManual(profile.id, input);
  },

  async updateCertification(userId: string, id: string, input: CertificationInput) {
    await assertOwnsCertification(userId, id);
    return certificationRepository.update(id, input);
  },

  async deleteCertification(userId: string, id: string) {
    await assertOwnsCertification(userId, id);
    await certificationRepository.delete(id);
  },
};

async function assertOwnsExperience(userId: string, id: string) {
  const profile = await requireOwnedProfile(userId);
  const item = await workExperienceRepository.findById(id);
  if (!item || item.profileId !== profile.id) throw new AppError(404, "NOT_FOUND", "Work experience not found.");
}

async function assertOwnsEducation(userId: string, id: string) {
  const profile = await requireOwnedProfile(userId);
  const item = await educationRepository.findById(id);
  if (!item || item.profileId !== profile.id) throw new AppError(404, "NOT_FOUND", "Education entry not found.");
}

async function assertOwnsSkill(userId: string, id: string) {
  const profile = await requireOwnedProfile(userId);
  const item = await skillRepository.findById(id);
  if (!item || item.profileId !== profile.id) throw new AppError(404, "NOT_FOUND", "Skill not found.");
}

async function assertOwnsCertification(userId: string, id: string) {
  const profile = await requireOwnedProfile(userId);
  const item = await certificationRepository.findById(id);
  if (!item || item.profileId !== profile.id) throw new AppError(404, "NOT_FOUND", "Certification not found.");
}
