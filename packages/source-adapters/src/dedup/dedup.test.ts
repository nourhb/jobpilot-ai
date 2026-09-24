import { describe, expect, it } from "vitest";
import type { NormalizedJob } from "../base/types";
import { computeContentHash, computeSecondaryDedupeKey, findDuplicate, normalizeForComparison } from "./index";

function makeJob(overrides: Partial<NormalizedJob> = {}): NormalizedJob {
  return {
    externalId: "ext-1",
    title: "Cloud Engineer",
    company: "Acme Inc.",
    description: "Build and operate cloud infrastructure.",
    location: { city: "Toronto", province: "Ontario", country: "Canada" },
    remoteType: "REMOTE",
    employmentType: "FULL_TIME",
    application: { type: "API" },
    raw: {},
    ...overrides,
  };
}

describe("normalizeForComparison", () => {
  it("lowercases, trims, and collapses whitespace", () => {
    expect(normalizeForComparison("  Cloud   Engineer \n")).toBe("cloud engineer");
  });
});

describe("computeSecondaryDedupeKey", () => {
  it("produces the same key regardless of case/whitespace differences", () => {
    const a = computeSecondaryDedupeKey(makeJob());
    const b = computeSecondaryDedupeKey(
      makeJob({ title: "  CLOUD engineer", company: "acme inc.  ", location: { city: "toronto", province: "ONTARIO", country: "canada" } }),
    );
    expect(a).toBe(b);
  });

  it("produces different keys for different titles", () => {
    const a = computeSecondaryDedupeKey(makeJob());
    const b = computeSecondaryDedupeKey(makeJob({ title: "DevOps Engineer" }));
    expect(a).not.toBe(b);
  });
});

describe("computeContentHash", () => {
  it("is deterministic for identical content", () => {
    expect(computeContentHash(makeJob())).toBe(computeContentHash(makeJob()));
  });

  it("changes when the description changes", () => {
    const a = computeContentHash(makeJob());
    const b = computeContentHash(makeJob({ description: "Something completely different." }));
    expect(a).not.toBe(b);
  });
});

describe("findDuplicate", () => {
  const existing = [
    { id: "job-1", sourceId: "source-a", externalId: "ext-1", contentHash: "hash-1", secondaryKey: "key-1" },
    { id: "job-2", sourceId: "source-b", externalId: "ext-2", contentHash: "hash-2", secondaryKey: "key-2" },
  ];

  it("matches on sourceId + externalId first", () => {
    const result = findDuplicate({ sourceId: "source-a", externalId: "ext-1", contentHash: "unrelated", secondaryKey: "unrelated" }, existing);
    expect(result).toEqual({ isDuplicate: true, matchedJobId: "job-1", reason: "SOURCE_EXTERNAL_ID" });
  });

  it("falls back to the secondary key when source+externalId differ", () => {
    const result = findDuplicate({ sourceId: "source-c", externalId: "ext-9", contentHash: "unrelated", secondaryKey: "key-2" }, existing);
    expect(result).toEqual({ isDuplicate: true, matchedJobId: "job-2", reason: "SECONDARY_KEY" });
  });

  it("falls back to the content hash as a last resort", () => {
    const result = findDuplicate({ sourceId: "source-c", externalId: "ext-9", contentHash: "hash-1", secondaryKey: "unrelated" }, existing);
    expect(result).toEqual({ isDuplicate: true, matchedJobId: "job-1", reason: "CONTENT_HASH" });
  });

  it("reports no duplicate when nothing matches", () => {
    const result = findDuplicate({ sourceId: "source-c", externalId: "ext-9", contentHash: "unrelated", secondaryKey: "unrelated" }, existing);
    expect(result).toEqual({ isDuplicate: false });
  });
});
