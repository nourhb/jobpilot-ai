import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

/**
 * Wraps a Zod schema (usually imported from @jobpilot/shared so the exact
 * same rules apply on the frontend form) as Express middleware. Any
 * validation failure is forwarded to errorHandler as a ZodError.
 */
export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}
