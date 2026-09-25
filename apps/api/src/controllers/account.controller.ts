import type { Request, Response } from "express";
import { accountService } from "../account/account.service";
import { AppError } from "../middleware/errorHandler";

const ACCESS_TOKEN_COOKIE = "accessToken";

export const accountController = {
  async deleteAccount(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication is required for this request.");
    }
    const result = await accountService.deleteAccount(req.user.id);
    res.clearCookie(ACCESS_TOKEN_COOKIE);
    res.status(200).json({ success: true, data: result });
  },
};
