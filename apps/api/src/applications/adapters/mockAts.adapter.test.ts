import { afterEach, describe, expect, it, vi } from "vitest";
import { ApplicationSourceError, CaptchaDetectedError } from "./applicationAdapter.types";
import { mockAtsAdapter } from "./mockAts.adapter";

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const samplePayload = {
  candidateName: "Demo Candidate",
  candidateEmail: "demo@jobpilot.ai",
  coverLetter: "A great cover letter.",
  answers: [],
};

describe("mockAtsAdapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("isJobStillActive parses the mock ATS's response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { active: true }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await mockAtsAdapter.isJobStillActive({ externalId: "ext-1" });

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/jobs/ext-1"));
  });

  it("isJobStillActive throws ApplicationSourceError on a non-2xx response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(500, {})));

    await expect(mockAtsAdapter.isJobStillActive({ externalId: "ext-1" })).rejects.toThrow(ApplicationSourceError);
  });

  it("getQuestions parses the question list", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { questions: [{ id: "q1", text: "Why?" }] })));

    const result = await mockAtsAdapter.getQuestions({ externalId: "ext-1" });

    expect(result).toEqual([{ id: "q1", text: "Why?" }]);
  });

  it("submit returns the external application id on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(201, { applicationId: "mock-app-1" })));

    const result = await mockAtsAdapter.submit({ externalId: "ext-1" }, samplePayload);

    expect(result).toEqual({ externalApplicationId: "mock-app-1" });
  });

  it("submit throws CaptchaDetectedError on a 409 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(409, { error: "CAPTCHA_REQUIRED" })));

    await expect(mockAtsAdapter.submit({ externalId: "ext-captcha" }, samplePayload)).rejects.toThrow(CaptchaDetectedError);
  });

  it("submit throws ApplicationSourceError on any other non-2xx response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(503, { error: "ATS_UNAVAILABLE" })));

    await expect(mockAtsAdapter.submit({ externalId: "ext-fail" }, samplePayload)).rejects.toThrow(ApplicationSourceError);
  });
});
