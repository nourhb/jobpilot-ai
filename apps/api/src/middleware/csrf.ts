import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { AppError } from "./errorHandler";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function originAllowed(origin: string): boolean {
  return origin === env.CORS_ORIGIN || origin === env.APP_URL;
}

/**
 * Spec section 51 (CSRF). Cookie-authenticated mutating requests must
 * come from our own frontend origin. Bearer tokens are treated as
 * non-browser API clients and are not subject to this check (they are
 * not automatically attached by a browser the way the httpOnly cookie
 * is). Missing Origin is allowed in development/test so scripts and
 * supertest keep working; production requires Origin or a Bearer token.
 */
export function csrfProtection(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const authorization = req.headers.authorization;
  if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
    next();
    return;
  }

  const origin = req.headers.origin;
  if (typeof origin === "string" && originAllowed(origin)) {
    next();
    return;
  }

  if (!origin && env.NODE_ENV !== "production") {
    next();
    return;
  }

  next(new AppError(403, "CSRF_REJECTED", "This request did not come from the JobPilot AI web app."));
}
