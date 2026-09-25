import { afterEach, describe, expect, it, vi } from "vitest";
import { CircuitOpenError, resilientFetch, resetCircuits } from "./resilientFetch";

afterEach(() => {
  vi.unstubAllGlobals();
  resetCircuits();
});

describe("resilientFetch", () => {
  it("returns a 4xx without retrying", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal("fetch", fetchMock);

    const response = await resilientFetch("https://boards.example/jobs");

    expect(response.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a 5xx then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    const response = await resilientFetch("https://boards.example/jobs", {
      retries: 1,
      retryDelaysMs: [1],
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("opens the circuit after consecutive exhausted failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    for (let i = 0; i < 5; i += 1) {
      await expect(
        resilientFetch("https://boards.example/jobs", { retries: 0, retryDelaysMs: [1] }),
      ).rejects.toThrow("network down");
    }

    await expect(resilientFetch("https://boards.example/jobs", { retries: 0 })).rejects.toBeInstanceOf(CircuitOpenError);
  });
});
