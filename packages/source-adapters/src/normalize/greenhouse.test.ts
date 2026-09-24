import { describe, expect, it } from "vitest";
import type { RawJob } from "../base/types";
import { normalizeGreenhouseJob } from "./greenhouse";

function rawJob(overrides: Partial<Record<string, unknown>> = {}): RawJob {
  return {
    sourceName: "greenhouse:acmeco",
    externalId: "4000001",
    fetchedAt: new Date().toISOString(),
    raw: {
      id: 4000001,
      title: "Cloud Support Engineer",
      companyName: "Acme Co",
      updated_at: "2026-09-01T00:00:00Z",
      absolute_url: "https://boards.greenhouse.io/acmeco/jobs/4000001",
      location: { name: "Toronto, Ontario, Canada" },
      content: "<p>Support <b>Kubernetes</b> workloads.</p>",
      ...overrides,
    },
  };
}

describe("normalizeGreenhouseJob", () => {
  it("strips HTML from the description", () => {
    const normalized = normalizeGreenhouseJob(rawJob());
    expect(normalized.description).toBe("Support Kubernetes workloads.");
    expect(normalized.descriptionHtml).toContain("<b>");
  });

  it("uses the injected companyName, not anything from Greenhouse's own payload", () => {
    const normalized = normalizeGreenhouseJob(rawJob());
    expect(normalized.company).toBe("Acme Co");
  });

  it("parses a three-part location", () => {
    const normalized = normalizeGreenhouseJob(rawJob());
    expect(normalized.location).toMatchObject({ city: "Toronto", province: "Ontario", country: "Canada" });
  });

  it("marks application type as MANUAL since Greenhouse submission isn't automated", () => {
    const normalized = normalizeGreenhouseJob(rawJob());
    expect(normalized.application.type).toBe("MANUAL");
  });

  it("detects remote from the location string", () => {
    const normalized = normalizeGreenhouseJob(rawJob({ location: { name: "Remote" } }));
    expect(normalized.remoteType).toBe("REMOTE");
  });
});
