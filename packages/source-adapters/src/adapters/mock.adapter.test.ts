import { describe, expect, it } from "vitest";
import { mockJobSourceAdapter } from "./mock.adapter";

describe("mockJobSourceAdapter", () => {
  it("discovers a fixed, deterministic set of fixture jobs", async () => {
    const jobs = await mockJobSourceAdapter.discoverJobs();
    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs.every((job) => job.sourceName === "mock")).toBe(true);
    expect(new Set(jobs.map((job) => job.externalId)).size).toBe(jobs.length);
  });

  it("fetches job details for a known external id", async () => {
    const job = await mockJobSourceAdapter.getJobDetails("mock-001");
    expect(job.externalId).toBe("mock-001");
  });

  it("throws for an unknown external id", async () => {
    await expect(mockJobSourceAdapter.getJobDetails("does-not-exist")).rejects.toThrow();
  });

  it("returns an application form with a work-authorization question", async () => {
    const form = await mockJobSourceAdapter.getApplicationForm!("mock-001");
    expect(form.fields.some((field) => field.id === "workAuthorization")).toBe(true);
  });

  it("submits an application and returns a SUBMITTED result with an idempotent-derived id", async () => {
    const result = await mockJobSourceAdapter.submitApplication!({
      sourceName: "mock",
      externalId: "mock-001",
      answers: { fullName: "Jane Doe" },
      resumeStorageKey: "storage-key-1",
      idempotencyKey: "abcdef0123456789",
    });
    expect(result.status).toBe("SUBMITTED");
    expect(result.externalApplicationId).toContain("abcdef012345");
  });

  it("fails submission for an unknown job", async () => {
    const result = await mockJobSourceAdapter.submitApplication!({
      sourceName: "mock",
      externalId: "does-not-exist",
      answers: {},
      resumeStorageKey: "storage-key-1",
      idempotencyKey: "abcdef0123456789",
    });
    expect(result.status).toBe("FAILED");
  });
});
