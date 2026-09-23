import { loginSchema, registerSchema } from "@jobpilot/shared";
import { validateBody } from "../middleware/validate";

/**
 * The Zod schemas themselves live in @jobpilot/shared so the exact same
 * rules run in the React registration/login forms (Cursor rule #19).
 */
export const validateRegisterBody = validateBody(registerSchema);
export const validateLoginBody = validateBody(loginSchema);
