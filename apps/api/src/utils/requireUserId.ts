import type { RequestUser } from "../types/express";
import { AppError } from "../middleware/errorHandler";

/**
 * Accepts any `Request<...>` instantiation (not just the default
 * `Request`) -- narrower `Params`/`ReqBody` generics used by individual
 * controller methods are not structurally assignable to plain `Request`,
 * so this only requires the one field it actually needs. Shared across
 * controllers (profile, preferences, jobs) instead of being redefined in
 * each one.
 */
export function requireUserId(req: { user?: RequestUser }): string {
  if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Authentication is required for this request.");
  return req.user.id;
}
