import { describe, expect, it } from "vitest";
import { mockJobSourceAdapter } from "../adapters/mock.adapter";
import { normalizeRawJob } from "./index";

describe("normalizeRawJob", () => {
  it("normalizes a mock raw job into the common NormalizedJob shape", async () => {
    const jobs = await mockJobSourceAdapter.discoverJobs();
    const rawJob = jobs[0]!;
    const normalized = normalizeRawJob("MOCK", rawJob);

    expect(normalized.externalId).toBe(rawJob.externalId);
    expect(normalized.title).toBe("Cloud Support Engineer");
    expect(normalized.company).toBe("Northwind Cloud");
    expect(normalized.remoteType).toBe("REMOTE");
    expect(normalized.employmentType).toBe("FULL_TIME");
    expect(normalized.location).toEqual({ raw: "Toronto, Ontario, Canada", city: "Toronto", province: "Ontario", country: "Canada" });
    expect(normalized.salary).toEqual({ min: 75000, max: 95000, currency: "CAD", period: "YEAR" });
    expect(normalized.application).toEqual({ type: "API" });
  });

  it("throws a clear not-implemented error for sources without a normalizer yet", async () => {
    const jobs = await mockJobSourceAdapter.discoverJobs();
    expect(() => normalizeRawJob("GREENHOUSE", jobs[0]!)).toThrow(/not implemented yet/i);
  });
});
