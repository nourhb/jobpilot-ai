import type { NextFunction, Request, Response } from "express";

/**
 * Express does not forward rejected promises to the error handler by
 * default. Wrapping every async controller with this ensures thrown
 * AppErrors (and everything else) reaches `errorHandler` (Cursor rule
 * #22: never silently swallow errors).
 *
 * Generic over the controller's own `Request<Params, ResBody, ReqBody>`
 * type (e.g. `Request<{ id: string }, unknown, WorkExperienceInput>`) so
 * route params/body stay strongly typed in controllers instead of every
 * handler re-casting `req.params.id`. Express itself only ever calls this
 * with a real `Request` matching the route path, so the cast at this one
 * boundary is safe. `Req` is deliberately left unconstrained (no
 * `extends Request`): controllers commonly narrow `Params`/`ReqBody` to
 * `unknown` or a specific shape, and Express's own `ParamsDictionary`
 * default is an index-signature type that TypeScript's structural
 * subtyping does not consider a supertype of `unknown` -- constraining
 * `Req` would reject exactly the pattern this helper exists for.
 */
export function asyncHandler<Req = Request>(handler: (req: Req, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req as unknown as Req, res, next).catch(next);
  };
}
