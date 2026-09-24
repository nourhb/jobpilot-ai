import { describe, expect, it } from "vitest";
import type { RawJob } from "../base/types";
import { normalizeAshbyJob } from "./ashby";

function rawJob(overrides: Partial<Record<string, unknown>> = {}): RawJob {
  return {
    sourceName: "ashby:acmeco",
    externalId: "job-1",
    fetchedAt: new Date().toISOString(),
    raw: {
      id: "job-1",
      title: "Junior Cloud Administrator",
      organizationName: "Acme Co",
      location: "Hamilton, Ontario, Canada",
      isRemote: false,
      employmentType: "FullTime",
      descriptionPlain: "Administer Azure resources.",
      jobUrl: "https://jobs.ashbyhq.com/acmeco/job-1",
      applyUrl: "https://jobs.ashbyhq.com/acmeco/job-1/apply",
      publishedAt: "2026-09-10T00:00:00Z",
      ...overrides,
    },
  };
}

describe("normalizeAshbyJob", () => {
  it("normalizes core fields", () => {
    const normalized = normalizeAshbyJob(rawJob());
    expect(normalized.company).toBe("Acme Co");
    expect(normalized.remoteType).toBe("ONSITE");
    expect(normalized.employmentType).toBe("FULL_TIME");
  });

  it("marks application type as API since Ashby supports real submission", () => {
    const normalized = normalizeAshbyJob(rawJob());
    expect(normalized.application.type).toBe("API");
  });

  it("detects remote from isRemote flag regardless of location text", () => {
    const normalized = normalizeAshbyJob(rawJob({ isRemote: true, location: "Canada" }));
    expect(normalized.remoteType).toBe("REMOTE");
  });
});
