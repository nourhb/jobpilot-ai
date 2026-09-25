import { describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";

vi.mock("../config/env", () => ({
  env: { NODE_ENV: "production", CORS_ORIGIN: "http://localhost:5173", APP_URL: "http://localhost:5173" },
}));

async function run(req: Partial<Request>) {
  const { csrfProtection } = await import("./csrf");
  return new Promise<unknown>((resolve) => {
    csrfProtection(req as Request, {} as Response, ((err?: unknown) => resolve(err)) as NextFunction);
  });
}

describe("csrfProtection", () => {
  it("allows GET without an Origin", async () => {
    await expect(run({ method: "GET", headers: {} })).resolves.toBeUndefined();
  });

  it("allows a mutating request with a Bearer token", async () => {
    await expect(run({ method: "POST", headers: { authorization: "Bearer abc" } })).resolves.toBeUndefined();
  });

  it("allows a mutating request from the configured frontend origin", async () => {
    await expect(run({ method: "PUT", headers: { origin: "http://localhost:5173" } })).resolves.toBeUndefined();
  });

  it("rejects a mutating cookie request from an unexpected origin in production", async () => {
    const err = await run({ method: "DELETE", headers: { origin: "https://evil.example" } });
    expect(err).toMatchObject({ statusCode: 403, code: "CSRF_REJECTED" });
  });
});
