import { afterEach, describe, expect, it, vi } from "vitest";
import { createGreenhouseAdapter } from "./greenhouse.adapter";

/** Recorded-shape fixtures matching Greenhouse's real, documented Job Board API response format -- never fetched from a live board (`unit_fixtures` project decision). */
const JOBS_FIXTURE = {
  jobs: [
    { id: 4000001, title: "Cloud Support Engineer", updated_at: "2026-09-01T00:00:00Z", absolute_url: "https://boards.greenhouse.io/acmeco/jobs/4000001", location: { name: "Toronto, Ontario, Canada" } },
  ],
};

const JOB_DETAIL_FIXTURE = {
  id: 4000001,
  title: "Cloud Support Engineer",
  updated_at: "2026-09-01T00:00:00Z",
  absolute_url: "https://boards.greenhouse.io/acmeco/jobs/4000001",
  location: { name: "Toronto, Ontario, Canada" },
  content: "<p>Support customers running <b>Kubernetes</b> workloads.</p>",
  questions: [
    { label: "Are you legally authorized to work in Canada?", required: true, fields: [{ name: "authorized", type: "yes_no", required: true }] },
    { label: "Years of Kubernetes experience", required: false, fields: [{ name: "k8s_years", type: "input_text", required: false }] },
  ],
};

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok, status, json: async () => body }),
  );
}

describe("createGreenhouseAdapter", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("discovers jobs from the public job board API", async () => {
    mockFetchOnce(JOBS_FIXTURE);
    const adapter = createGreenhouseAdapter({ boardToken: "acmeco", companyName: "Acme Co" });

    const jobs = await adapter.discoverJobs();

    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.externalId).toBe("4000001");
    expect(jobs[0]!.sourceName).toBe("greenhouse:acmeco");
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0]).toContain("boards-api.greenhouse.io/v1/boards/acmeco/jobs");
  });

  it("fetches job details including questions", async () => {
    mockFetchOnce(JOB_DETAIL_FIXTURE);
    const adapter = createGreenhouseAdapter({ boardToken: "acmeco" });

    const detail = await adapter.getJobDetails("4000001");

    expect(detail.externalId).toBe("4000001");
    expect((detail.raw as { companyName: string }).companyName).toBe("acmeco");
  });

  it("maps Greenhouse questions to ApplicationForm fields", async () => {
    mockFetchOnce(JOB_DETAIL_FIXTURE);
    const adapter = createGreenhouseAdapter({ boardToken: "acmeco" });

    const form = await adapter.getApplicationForm!("4000001");

    expect(form.fields).toHaveLength(2);
    expect(form.fields[0]).toMatchObject({ type: "BOOLEAN", required: true });
    expect(form.fields[1]).toMatchObject({ type: "TEXT", required: false });
  });

  it("does not implement submitApplication (public API is read-only)", () => {
    const adapter = createGreenhouseAdapter({ boardToken: "acmeco" });
    expect(adapter.submitApplication).toBeUndefined();
  });

  it("throws a descriptive error on a non-2xx response", async () => {
    mockFetchOnce({}, false, 503);
    const adapter = createGreenhouseAdapter({ boardToken: "acmeco" });

    await expect(adapter.discoverJobs()).rejects.toThrow(/503/);
  });
});
