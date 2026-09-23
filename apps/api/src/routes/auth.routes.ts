import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { validateLoginBody, validateRegisterBody } from "../validators/auth.validators";
import { requireAuth } from "../middleware/requireAuth";
import { authRateLimiter } from "../middleware/rateLimiter";
import { asyncHandler } from "../utils/asyncHandler";

export const authRouter = Router();

authRouter.post("/register", authRateLimiter, validateRegisterBody, asyncHandler(authController.register));
authRouter.post("/login", authRateLimiter, validateLoginBody, asyncHandler(authController.login));
authRouter.post("/logout", requireAuth, asyncHandler(authController.logout));
authRouter.get("/me", requireAuth, asyncHandler(authController.me));
