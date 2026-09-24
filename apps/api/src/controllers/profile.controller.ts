import type { Request, Response } from "express";
import type {
  CertificationInput,
  EducationInput,
  ProfileUpdateInput,
  SkillInput,
  VerifyProfileItemsInput,
  WorkExperienceInput,
} from "@jobpilot/shared";
import type { RequestUser } from "../types/express";
import { profileService } from "../profile/profile.service";
import { AppError } from "../middleware/errorHandler";

/**
 * Accepts any `Request<...>` instantiation (not just the default
 * `Request`) -- narrower `Params`/`ReqBody` generics used by individual
 * controller methods are not structurally assignable to plain `Request`,
 * so this only requires the one field it actually needs.
 */
function requireUserId(req: { user?: RequestUser }): string {
  if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Authentication is required for this request.");
  return req.user.id;
}

export const profileController = {
  async getProfile(req: Request, res: Response): Promise<void> {
    const profile = await profileService.getFullProfile(requireUserId(req));
    res.status(200).json({ success: true, data: { profile } });
  },

  async updateProfile(req: Request<unknown, unknown, ProfileUpdateInput>, res: Response): Promise<void> {
    const profile = await profileService.updateProfile(requireUserId(req), req.body);
    res.status(200).json({ success: true, data: { profile } });
  },

  async getVerifiedCandidateProfile(req: Request, res: Response): Promise<void> {
    const verified = await profileService.getVerifiedCandidateProfile(requireUserId(req));
    res.status(200).json({ success: true, data: { verifiedCandidateProfile: verified } });
  },

  async uploadResume(req: Request, res: Response): Promise<void> {
    if (!req.file) throw new AppError(400, "NO_FILE_UPLOADED", "No file was uploaded.");
    const resume = await profileService.uploadResume(requireUserId(req), {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      buffer: req.file.buffer,
    });
    res.status(201).json({ success: true, data: { resume } });
  },

  async listResumes(req: Request, res: Response): Promise<void> {
    const resumes = await profileService.listResumes(requireUserId(req));
    res.status(200).json({ success: true, data: { resumes } });
  },

  async deleteResume(req: Request<{ id: string }>, res: Response): Promise<void> {
    await profileService.deleteResume(requireUserId(req), req.params.id);
    res.status(200).json({ success: true, data: { message: "Resume deleted." } });
  },

  async verifyItems(req: Request<unknown, unknown, VerifyProfileItemsInput>, res: Response): Promise<void> {
    const result = await profileService.verifyItems(requireUserId(req), req.body);
    res.status(200).json({ success: true, data: result });
  },

  async addExperience(req: Request<unknown, unknown, WorkExperienceInput>, res: Response): Promise<void> {
    const item = await profileService.addExperience(requireUserId(req), req.body);
    res.status(201).json({ success: true, data: { experience: item } });
  },
  async updateExperience(req: Request<{ id: string }, unknown, WorkExperienceInput>, res: Response): Promise<void> {
    const item = await profileService.updateExperience(requireUserId(req), req.params.id, req.body);
    res.status(200).json({ success: true, data: { experience: item } });
  },
  async deleteExperience(req: Request<{ id: string }>, res: Response): Promise<void> {
    await profileService.deleteExperience(requireUserId(req), req.params.id);
    res.status(200).json({ success: true, data: { message: "Deleted." } });
  },

  async addEducation(req: Request<unknown, unknown, EducationInput>, res: Response): Promise<void> {
    const item = await profileService.addEducation(requireUserId(req), req.body);
    res.status(201).json({ success: true, data: { education: item } });
  },
  async updateEducation(req: Request<{ id: string }, unknown, EducationInput>, res: Response): Promise<void> {
    const item = await profileService.updateEducation(requireUserId(req), req.params.id, req.body);
    res.status(200).json({ success: true, data: { education: item } });
  },
  async deleteEducation(req: Request<{ id: string }>, res: Response): Promise<void> {
    await profileService.deleteEducation(requireUserId(req), req.params.id);
    res.status(200).json({ success: true, data: { message: "Deleted." } });
  },

  async addSkill(req: Request<unknown, unknown, SkillInput>, res: Response): Promise<void> {
    const item = await profileService.addSkill(requireUserId(req), req.body);
    res.status(201).json({ success: true, data: { skill: item } });
  },
  async updateSkill(req: Request<{ id: string }, unknown, SkillInput>, res: Response): Promise<void> {
    const item = await profileService.updateSkill(requireUserId(req), req.params.id, req.body);
    res.status(200).json({ success: true, data: { skill: item } });
  },
  async deleteSkill(req: Request<{ id: string }>, res: Response): Promise<void> {
    await profileService.deleteSkill(requireUserId(req), req.params.id);
    res.status(200).json({ success: true, data: { message: "Deleted." } });
  },

  async addCertification(req: Request<unknown, unknown, CertificationInput>, res: Response): Promise<void> {
    const item = await profileService.addCertification(requireUserId(req), req.body);
    res.status(201).json({ success: true, data: { certification: item } });
  },
  async updateCertification(req: Request<{ id: string }, unknown, CertificationInput>, res: Response): Promise<void> {
    const item = await profileService.updateCertification(requireUserId(req), req.params.id, req.body);
    res.status(200).json({ success: true, data: { certification: item } });
  },
  async deleteCertification(req: Request<{ id: string }>, res: Response): Promise<void> {
    await profileService.deleteCertification(requireUserId(req), req.params.id);
    res.status(200).json({ success: true, data: { message: "Deleted." } });
  },
};
