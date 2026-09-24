import {
  certificationInputSchema,
  educationInputSchema,
  profileUpdateSchema,
  skillInputSchema,
  verifyProfileItemsSchema,
  workExperienceInputSchema,
} from "@jobpilot/shared";
import { validateBody } from "../middleware/validate";

export const validateProfileUpdateBody = validateBody(profileUpdateSchema);
export const validateWorkExperienceBody = validateBody(workExperienceInputSchema);
export const validateEducationBody = validateBody(educationInputSchema);
export const validateSkillBody = validateBody(skillInputSchema);
export const validateCertificationBody = validateBody(certificationInputSchema);
export const validateVerifyProfileItemsBody = validateBody(verifyProfileItemsSchema);
