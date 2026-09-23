import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/jwt";
import { AppError } from "./errorHandler";

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const cookieToken = req.cookies?.accessToken as string | undefined;
  const bearerToken = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
  const token = bearerToken ?? cookieToken;

  if (!token) {
    next(new AppError(401, "UNAUTHENTICATED", "Authentication is required for this request."));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    next(new AppError(401, "UNAUTHENTICATED", "Invalid or expired session. Please log in again."));
  }
}
