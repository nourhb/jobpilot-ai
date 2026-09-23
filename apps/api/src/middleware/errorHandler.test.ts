import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AppError, errorHandler } from "./errorHandler";

function createMockResponse() {
  const res: { statusCode?: number; body?: unknown; status: (code: number) => typeof res; json: (body: unknown) => typeof res } =
    {
      status(code: number) {
        res.statusCode = code;
        return res;
      },
      json(body: unknown) {
        res.body = body;
        return res;
      },
    };
  return res;
}

describe("errorHandler", () => {
  it("formats AppError with its own status code and error code", () => {
    const res = createMockResponse();
    const err = new AppError(409, "EMAIL_ALREADY_REGISTERED", "An account with this email already exists.");

    errorHandler(err, { path: "/api/auth/register" } as never, res as never, vi.fn());

    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: "EMAIL_ALREADY_REGISTERED" },
    });
  });

  it("formats ZodError as a 400 VALIDATION_ERROR", () => {
    const res = createMockResponse();
    const schema = z.object({ email: z.string().email() });
    const parseResult = schema.safeParse({ email: "invalid" });

    if (parseResult.success) throw new Error("expected failure");

    errorHandler(parseResult.error, { path: "/api/auth/register" } as never, res as never, vi.fn());

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ success: false, error: { code: "VALIDATION_ERROR" } });
  });

  it("hides internal error details behind a generic 500", () => {
    const res = createMockResponse();

    errorHandler(new Error("connection refused: secret-internal-detail"), { path: "/api/jobs" } as never, res as never, vi.fn());

    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({ success: false, error: { code: "INTERNAL_SERVER_ERROR" } });
    expect(JSON.stringify(res.body)).not.toContain("secret-internal-detail");
  });
});
