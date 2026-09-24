import { afterEach, describe, expect, it, vi } from "vitest";
import { createAshbyAdapter } from "./ashby.adapter";

const BOARD_FIXTURE = {
  organizationName: "Acme Co",
  jobs: [
    {
      id: "job-1",
      title: "Junior Cloud Administrator",
      location: "Hamilton, Ontario, Canada",
      isRemote: false,
      employmentType: "FullTime",
      descriptionPlain: "Administer Azure resources.",
      jobUrl: "https://jobs.ashbyhq.com/acmeco/job-1",
      applyUrl: "https://jobs.ashbyhq.com/acmeco/job-1/apply",
      publishedAt: "2026-09-10T00:00:00Z",
    },
  ],
};

const APPLICATION_FORM_FIXTURE = {
  fields: [
    { id: "fullName", label: "Full name", type: "Text", isRequired: true },
    { id: "authorized", label: "Are you legally authorized to work in Canada?", type: "Boolean", isRequired: true },
  ],
};

function mockFetchSequence(responses: Array<{ body: unknown; ok?: boolean; status?: number }>) {
  const fn = vi.fn();
  for (const response of responses) {
    fn.mockResolvedValueOnce({ ok: response.ok ?? true, status: response.status ?? 200, json: async () => response.body });
  }
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("createAshbyAdapter", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("discovers jobs from the public job board API", async () => {
    mockFetchSequence([{ body: BOARD_FIXTURE }]);
    const adapter = createAshbyAdapter({ jobBoardName: "acmeco" });

    const jobs = await adapter.discoverJobs();

    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.externalId).toBe("job-1");
    expect((jobs[0]!.raw as { organizationName: string }).organizationName).toBe("Acme Co");
  });

  it("finds job details by re-fetching the board", async () => {
    mockFetchSequence([{ body: BOARD_FIXTURE }]);
    const adapter = createAshbyAdapter({ jobBoardName: "acmeco" });

    const detail = await adapter.getJobDetails("job-1");
    expect(detail.externalId).toBe("job-1");
  });

  it("throws when the job is not found on the board", async () => {
    mockFetchSequence([{ body: BOARD_FIXTURE }]);
    const adapter = createAshbyAdapter({ jobBoardName: "acmeco" });

    await expect(adapter.getJobDetails("missing")).rejects.toThrow(/not found/);
  });

  it("maps application-form fields", async () => {
    mockFetchSequence([{ body: APPLICATION_FORM_FIXTURE }]);
    const adapter = createAshbyAdapter({ jobBoardName: "acmeco" });

    const form = await adapter.getApplicationForm!("job-1");
    expect(form.fields).toHaveLength(2);
    expect(form.fields[1]).toMatchObject({ type: "BOOLEAN", required: true });
  });

  it("submits an application successfully", async () => {
    mockFetchSequence([{ body: { success: true, applicationId: "ashby-app-1" } }]);
    const adapter = createAshbyAdapter({ jobBoardName: "acmeco" });

    const result = await adapter.submitApplication!({
      sourceName: "ashby:acmeco",
      externalId: "job-1",
      answers: { fullName: "Jane Doe", email: "jane@example.com", authorized: true },
      resumeStorageKey: "resumes/jane.pdf",
      coverLetter: "",
      idempotencyKey: "key-1",
    });

    expect(result.status).toBe("SUBMITTED");
    expect(result.externalApplicationId).toBe("ashby-app-1");
  });

  it("treats a 403 during submission as MANUAL_REVIEW_REQUIRED", async () => {
    mockFetchSequence([{ body: {}, ok: false, status: 403 }]);
    const adapter = createAshbyAdapter({ jobBoardName: "acmeco" });

    const result = await adapter.submitApplication!({
      sourceName: "ashby:acmeco",
      externalId: "job-1",
      answers: { fullName: "Jane Doe", email: "jane@example.com" },
      resumeStorageKey: "resumes/jane.pdf",
      coverLetter: "",
      idempotencyKey: "key-1",
    });

    expect(result.status).toBe("MANUAL_REVIEW_REQUIRED");
  });
});
