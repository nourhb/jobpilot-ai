import { describe, expect, it } from "vitest";
import { describesNoSponsorship } from "./sponsorshipSignal";

describe("describesNoSponsorship", () => {
  it("detects a clear no-sponsorship statement", () => {
    expect(describesNoSponsorship("We are unable to sponsor work visas for this role.")).toBe(true);
    expect(describesNoSponsorship("No sponsorship is available for this position.")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(describesNoSponsorship("NO SPONSORSHIP AVAILABLE")).toBe(true);
  });

  it("does not flag a generic description with no sponsorship language", () => {
    expect(describesNoSponsorship("We are looking for a Cloud Support Engineer with Kubernetes experience.")).toBe(false);
  });

  it("does not flag a posting that merely mentions authorization requirements generically", () => {
    expect(describesNoSponsorship("Candidates must be legally authorized to work in Canada.")).toBe(false);
  });
});
