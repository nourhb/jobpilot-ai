import type { Request, Response } from "express";
import type { LoginInput, RegisterInput } from "@jobpilot/shared";
import { authService } from "../services/auth.service";
import { env } from "../config/env";
import { AppError } from "../middleware/errorHandler";

const ACCESS_TOKEN_COOKIE = "accessToken";

function setAccessTokenCookie(res: Response, token: string): void {
  res.cookie(ACCESS_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export const authController = {
  async register(req: Request<unknown, unknown, RegisterInput>, res: Response): Promise<void> {
    const { user, accessToken } = await authService.register(req.body);
    setAccessTokenCookie(res, accessToken);
    res.status(201).json({ success: true, data: { user, accessToken } });
  },

  async login(req: Request<unknown, unknown, LoginInput>, res: Response): Promise<void> {
    const { user, accessToken } = await authService.login(req.body);
    setAccessTokenCookie(res, accessToken);
    res.status(200).json({ success: true, data: { user, accessToken } });
  },

  async logout(req: Request, res: Response): Promise<void> {
    if (req.user) {
      await authService.logout(req.user.id);
    }
    res.clearCookie(ACCESS_TOKEN_COOKIE);
    res.status(200).json({ success: true, data: { message: "Logged out." } });
  },

  async me(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication is required for this request.");
    }
    const user = await authService.getById(req.user.id);
    res.status(200).json({ success: true, data: { user } });
  },
};
