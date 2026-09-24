import { Router } from "express";
import { profileController } from "../controllers/profile.controller";
import { requireAuth } from "../middleware/requireAuth";
import { asyncHandler } from "../utils/asyncHandler";
import { singleResumeUpload } from "../middleware/upload";
import {
  validateCertificationBody,
  validateEducationBody,
  validateProfileUpdateBody,
  validateSkillBody,
  validateVerifyProfileItemsBody,
  validateWorkExperienceBody,
} from "../validators/profile.validators";

export const profileRouter = Router();

profileRouter.use(requireAuth);

profileRouter.get("/", asyncHandler(profileController.getProfile));
profileRouter.put("/", validateProfileUpdateBody, asyncHandler(profileController.updateProfile));
profileRouter.get("/verified", asyncHandler(profileController.getVerifiedCandidateProfile));
profileRouter.post("/verify", validateVerifyProfileItemsBody, asyncHandler(profileController.verifyItems));

profileRouter.post("/resume", singleResumeUpload, asyncHandler(profileController.uploadResume));
profileRouter.get("/resume", asyncHandler(profileController.listResumes));
profileRouter.delete("/resume/:id", asyncHandler(profileController.deleteResume));

profileRouter.post("/experience", validateWorkExperienceBody, asyncHandler(profileController.addExperience));
profileRouter.put("/experience/:id", validateWorkExperienceBody, asyncHandler(profileController.updateExperience));
profileRouter.delete("/experience/:id", asyncHandler(profileController.deleteExperience));

profileRouter.post("/education", validateEducationBody, asyncHandler(profileController.addEducation));
profileRouter.put("/education/:id", validateEducationBody, asyncHandler(profileController.updateEducation));
profileRouter.delete("/education/:id", asyncHandler(profileController.deleteEducation));

profileRouter.post("/skills", validateSkillBody, asyncHandler(profileController.addSkill));
profileRouter.put("/skills/:id", validateSkillBody, asyncHandler(profileController.updateSkill));
profileRouter.delete("/skills/:id", asyncHandler(profileController.deleteSkill));

profileRouter.post("/certifications", validateCertificationBody, asyncHandler(profileController.addCertification));
profileRouter.put("/certifications/:id", validateCertificationBody, asyncHandler(profileController.updateCertification));
profileRouter.delete("/certifications/:id", asyncHandler(profileController.deleteCertification));
