import type { NextFunction, Request, Response } from "express";

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

/**
 * Express does not forward rejected promises to the error handler by
 * default. Wrapping every async controller with this ensures thrown
 * AppErrors (and everything else) reaches `errorHandler` (Cursor rule
 * #22: never silently swallow errors).
 */
export function asyncHandler(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}
