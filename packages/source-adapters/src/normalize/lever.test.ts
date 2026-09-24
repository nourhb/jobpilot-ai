import { describe, expect, it } from "vitest";
import type { RawJob } from "../base/types";
import { normalizeLeverJob } from "./lever";

function rawJob(overrides: Partial<Record<string, unknown>> = {}): RawJob {
  return {
    sourceName: "lever:acmeco",
    externalId: "abc-123",
    fetchedAt: new Date().toISOString(),
    raw: {
      id: "abc-123",
      text: "DevOps Engineer",
      companyName: "Acme Co",
      categories: { location: "Remote, Canada", commitment: "Full-time" },
      descriptionPlain: "Own our CI/CD pipelines.",
      hostedUrl: "https://jobs.lever.co/acmeco/abc-123",
      applyUrl: "https://jobs.lever.co/acmeco/abc-123/apply",
      createdAt: 1756684800000,
      workplaceType: "remote",
      ...overrides,
    },
  };
}

describe("normalizeLeverJob", () => {
  it("normalizes core fields", () => {
    const normalized = normalizeLeverJob(rawJob());
    expect(normalized.title).toBe("DevOps Engineer");
    expect(normalized.company).toBe("Acme Co");
    expect(normalized.remoteType).toBe("REMOTE");
    expect(normalized.employmentType).toBe("FULL_TIME");
  });

  it("marks application type as API since Lever supports real submission", () => {
    const normalized = normalizeLeverJob(rawJob());
    expect(normalized.application.type).toBe("API");
    expect(normalized.application.url).toBe("https://jobs.lever.co/acmeco/abc-123/apply");
  });

  it("falls back to UNKNOWN for an unrecognized workplaceType", () => {
    const normalized = normalizeLeverJob(rawJob({ workplaceType: undefined }));
    expect(normalized.remoteType).toBe("UNKNOWN");
  });
});
