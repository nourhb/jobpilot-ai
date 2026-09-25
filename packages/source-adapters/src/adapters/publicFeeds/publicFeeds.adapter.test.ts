import { afterEach, describe, expect, it, vi } from "vitest";
import { createPublicFeedsAdapter } from "./publicFeeds.adapter";
import { normalizeCompanyJob } from "../../normalize/company";

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockJson(body: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }),
  );
}

describe("createPublicFeedsAdapter", () => {
  it("maps RemoteOK's public API payload", async () => {
    mockJson([
      { legal: "notice" },
      {
        id: "123",
        position: "Remote React Developer",
        company: "Acme",
        description: "Build UI",
        location: "Worldwide",
        url: "https://remoteok.com/l/123",
        date: "2026-09-24T00:00:00.000Z",
      },
    ]);

    const jobs = await createPublicFeedsAdapter({ feed: "remoteok" }).discoverJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.externalId).toBe("123");
    expect(normalizeCompanyJob(jobs[0]!).title).toBe("Remote React Developer");
  });

  it("maps Working Nomads public API payload", async () => {
    mockJson([
      {
        id: "wn-1",
        title: "Remote Python Engineer",
        company_name: "Nomad Co",
        description: "Python",
        location: "Worldwide",
        url: "https://example.com/wn-1",
        pub_date: "2026-09-24T00:00:00.000Z",
      },
    ]);

    const jobs = await createPublicFeedsAdapter({ feed: "workingnomads" }).discoverJobs();
    expect(jobs[0]?.externalId).toBe("wn-1");
    expect(normalizeCompanyJob(jobs[0]!).company).toBe("Nomad Co");
  });

  it("maps Arbeitnow's public API payload", async () => {
    mockJson({
      data: [{ slug: "berlin-dev", title: "Backend Engineer", company_name: "Foo", description: "Go", location: "Berlin", remote: true, url: "https://example.com" }],
    });

    const jobs = await createPublicFeedsAdapter({ feed: "arbeitnow" }).discoverJobs();
    expect(jobs[0]?.externalId).toBe("berlin-dev");
  });
});
