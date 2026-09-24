import { describe, expect, it, vi } from "vitest";
import type { ApplicationForm, ApplicationResult, JobSourceAdapter, RawJob } from "@jobpilot/source-adapters";
import { ApplicationSourceError, CaptchaDetectedError } from "./applicationAdapter.types";
import { createSourceAdapterBridge } from "./sourceAdapterBridge";

function makeAdapter(overrides: Partial<JobSourceAdapter> = {}): JobSourceAdapter & Required<Pick<JobSourceAdapter, "getApplicationForm" | "submitApplication">> {
  return {
    sourceName: "lever:acme",
    discoverJobs: vi.fn().mockResolvedValue([]),
    getJobDetails: vi.fn().mockResolvedValue({} as RawJob),
    getApplicationForm: vi.fn().mockResolvedValue({ sourceName: "lever:acme", externalId: "1", fields: [] } as ApplicationForm),
    submitApplication: vi.fn().mockResolvedValue({ status: "SUBMITTED", externalApplicationId: "app-1" } as ApplicationResult),
    ...overrides,
  };
}

describe("createSourceAdapterBridge", () => {
  it("reports the job as active when getJobDetails succeeds", async () => {
    const adapter = makeAdapter();
    const bridge = createSourceAdapterBridge("lever", adapter);

    await expect(bridge.isJobStillActive({ externalId: "1" })).resolves.toBe(true);
  });

  it("reports the job as inactive when getJobDetails throws", async () => {
    const adapter = makeAdapter({ getJobDetails: vi.fn().mockRejectedValue(new Error("not found")) });
    const bridge = createSourceAdapterBridge("lever", adapter);

    await expect(bridge.isJobStillActive({ externalId: "1" })).resolves.toBe(false);
  });

  it("maps application-form fields, excluding the conventional identity fields", async () => {
    const adapter = makeAdapter({
      getApplicationForm: vi.fn().mockResolvedValue({
        sourceName: "lever:acme",
        externalId: "1",
        fields: [
          { id: "fullName", label: "Full name", type: "TEXT", required: true },
          { id: "email", label: "Email", type: "EMAIL", required: true },
          { id: "authorized", label: "Are you legally authorized to work in Canada?", type: "BOOLEAN", required: true },
        ],
      } as ApplicationForm),
    });
    const bridge = createSourceAdapterBridge("lever", adapter);

    const questions = await bridge.getQuestions({ externalId: "1" });

    expect(questions).toEqual([{ id: "authorized", text: "Are you legally authorized to work in Canada?" }]);
  });

  it("wraps a getApplicationForm failure in ApplicationSourceError", async () => {
    const adapter = makeAdapter({ getApplicationForm: vi.fn().mockRejectedValue(new Error("boom")) });
    const bridge = createSourceAdapterBridge("lever", adapter);

    await expect(bridge.getQuestions({ externalId: "1" })).rejects.toThrow(ApplicationSourceError);
  });

  it("submits successfully, folding candidate identity into the answers map", async () => {
    const submitApplication = vi.fn().mockResolvedValue({ status: "SUBMITTED", externalApplicationId: "app-1" } as ApplicationResult);
    const adapter = makeAdapter({ submitApplication });
    const bridge = createSourceAdapterBridge("lever", adapter);

    const result = await bridge.submit(
      { externalId: "1" },
      { candidateName: "Jane Doe", candidateEmail: "jane@example.com", coverLetter: "Hi", answers: [{ questionId: "authorized", questionText: "Authorized?", answer: "Yes" }] },
    );

    expect(result).toEqual({ externalApplicationId: "app-1" });
    expect(submitApplication).toHaveBeenCalledWith(
      expect.objectContaining({ answers: { fullName: "Jane Doe", email: "jane@example.com", authorized: "Yes" }, coverLetter: "Hi" }),
    );
  });

  it("throws CaptchaDetectedError on MANUAL_REVIEW_REQUIRED", async () => {
    const adapter = makeAdapter({ submitApplication: vi.fn().mockResolvedValue({ status: "MANUAL_REVIEW_REQUIRED", message: "captcha_required" } as ApplicationResult) });
    const bridge = createSourceAdapterBridge("lever", adapter);

    await expect(
      bridge.submit({ externalId: "1" }, { candidateName: "Jane", candidateEmail: "jane@example.com", coverLetter: "", answers: [] }),
    ).rejects.toThrow(CaptchaDetectedError);
  });

  it("throws ApplicationSourceError on FAILED", async () => {
    const adapter = makeAdapter({ submitApplication: vi.fn().mockResolvedValue({ status: "FAILED", message: "source down" } as ApplicationResult) });
    const bridge = createSourceAdapterBridge("lever", adapter);

    await expect(
      bridge.submit({ externalId: "1" }, { candidateName: "Jane", candidateEmail: "jane@example.com", coverLetter: "", answers: [] }),
    ).rejects.toThrow(ApplicationSourceError);
  });
});
