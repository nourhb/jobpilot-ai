import { afterEach, describe, expect, it, vi } from "vitest";
import { createLeverAdapter } from "./lever.adapter";

const POSTINGS_FIXTURE = [
  {
    id: "abc-123",
    text: "DevOps Engineer",
    categories: { team: "Infrastructure", location: "Remote, Canada", commitment: "Full-time" },
    descriptionPlain: "Own our CI/CD pipelines.",
    hostedUrl: "https://jobs.lever.co/acmeco/abc-123",
    applyUrl: "https://jobs.lever.co/acmeco/abc-123/apply",
    createdAt: 1756684800000,
    workplaceType: "remote",
  },
];

const APPLY_FORM_FIXTURE = {
  fields: [
    { id: "fullName", text: "Full name", type: "text", required: true },
    { id: "email", text: "Email", type: "text", required: true },
    { id: "authorized", text: "Are you legally authorized to work in Canada?", type: "yes-no", required: true },
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

describe("createLeverAdapter", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("discovers postings from the public Postings API", async () => {
    mockFetchSequence([{ body: POSTINGS_FIXTURE }]);
    const adapter = createLeverAdapter({ company: "acmeco", companyName: "Acme Co" });

    const jobs = await adapter.discoverJobs();

    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.externalId).toBe("abc-123");
  });

  it("maps apply-form fields to ApplicationForm fields", async () => {
    mockFetchSequence([{ body: APPLY_FORM_FIXTURE }]);
    const adapter = createLeverAdapter({ company: "acmeco" });

    const form = await adapter.getApplicationForm!("abc-123");

    expect(form.fields).toHaveLength(3);
    expect(form.fields[2]).toMatchObject({ type: "BOOLEAN", required: true });
  });

  it("submits an application successfully", async () => {
    mockFetchSequence([{ body: { ok: true, applicationId: "lever-app-1" } }]);
    const adapter = createLeverAdapter({ company: "acmeco" });

    const result = await adapter.submitApplication!({
      sourceName: "lever:acmeco",
      externalId: "abc-123",
      answers: { fullName: "Jane Doe", email: "jane@example.com", authorized: true },
      resumeStorageKey: "resumes/jane.pdf",
      coverLetter: "I would love to join Acme.",
      idempotencyKey: "key-1",
    });

    expect(result.status).toBe("SUBMITTED");
    expect(result.externalApplicationId).toBe("lever-app-1");
  });

  it("treats a 403 during submission as MANUAL_REVIEW_REQUIRED, never a bypass attempt", async () => {
    mockFetchSequence([{ body: {}, ok: false, status: 403 }]);
    const adapter = createLeverAdapter({ company: "acmeco" });

    const result = await adapter.submitApplication!({
      sourceName: "lever:acmeco",
      externalId: "abc-123",
      answers: { fullName: "Jane Doe", email: "jane@example.com" },
      resumeStorageKey: "resumes/jane.pdf",
      coverLetter: "",
      idempotencyKey: "key-1",
    });

    expect(result.status).toBe("MANUAL_REVIEW_REQUIRED");
  });

  it("throws a descriptive error on an unexpected non-2xx response", async () => {
    mockFetchSequence([{ body: {}, ok: false, status: 500 }]);
    const adapter = createLeverAdapter({ company: "acmeco" });

    await expect(adapter.discoverJobs()).rejects.toThrow(/500/);
  });
});
