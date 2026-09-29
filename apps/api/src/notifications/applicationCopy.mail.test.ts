import { describe, expect, it } from "vitest";
import { buildApplicationCopyEmail, uniqueEmails } from "./applicationCopy.mail";

describe("application copy email", () => {
  it("dedupes recipients case-insensitively", () => {
    expect(uniqueEmails("nourhb58@gmail.com", "NourHB58@gmail.com", "demo@jobpilot.ai", "")).toEqual([
      "nourhb58@gmail.com",
      "demo@jobpilot.ai",
    ]);
  });

  it("builds a copy with the job, apply URL, cover letter, and answers", () => {
    const copy = buildApplicationCopyEmail({
      status: "MANUAL_REVIEW",
      message: "This board has no public submit API.",
      job: {
        title: "Cloud Support Engineer",
        company: "Northwind Cloud",
        locationRaw: "Toronto, Ontario, Canada",
        remoteType: "REMOTE",
        applicationUrl: "https://boards.greenhouse.io/northwind/jobs/123",
      },
      coverLetter: { content: "I can support Kubernetes workloads." },
      answers: [{ questionText: "Why this role?", answer: "I already operate similar systems." }],
    });

    expect(copy.subject).toContain("Cloud Support Engineer");
    expect(copy.subject).toContain("Northwind Cloud");
    expect(copy.text).toContain("https://boards.greenhouse.io/northwind/jobs/123");
    expect(copy.text).toContain("I can support Kubernetes workloads.");
    expect(copy.text).toContain("Why this role?");
    expect(copy.html).toContain("I already operate similar systems.");
  });
});
