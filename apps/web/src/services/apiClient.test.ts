import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, ApiError } from "./apiClient";

function mockFetchOnce(response: unknown, init: { ok: boolean; status: number }) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: init.ok,
      status: init.status,
      json: () => Promise.resolve(response),
    }),
  );
}

describe("apiRequest", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the unwrapped data on a successful envelope", async () => {
    mockFetchOnce({ success: true, data: { id: "123" } }, { ok: true, status: 200 });

    const result = await apiRequest<{ id: string }>("/api/auth/me");

    expect(result).toEqual({ id: "123" });
  });

  it("throws an ApiError with the backend's code/status/message on a failure envelope", async () => {
    mockFetchOnce(
      {
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." },
      },
      { ok: false, status: 401 },
    );

    await expect(apiRequest("/api/auth/login")).rejects.toMatchObject({
      name: "ApiError",
      code: "INVALID_CREDENTIALS",
      status: 401,
      message: "Invalid email or password.",
    });
  });

  it("falls back to a generic ApiError when the response body is not valid JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("not json")),
      }),
    );

    await expect(apiRequest("/api/health")).rejects.toBeInstanceOf(ApiError);
    await expect(apiRequest("/api/health")).rejects.toMatchObject({
      code: "UNKNOWN_ERROR",
      status: 500,
    });
  });
});
