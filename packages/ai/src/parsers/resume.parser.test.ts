import { describe, expect, it } from "vitest";
import { MockAIProvider } from "../providers/mock.provider";
import { heuristicExtractResume } from "./resume.heuristic";
import { scoreResumeExtraction } from "./resume.confidence";
import { parseResume } from "./resume.parser";

const SAMPLE_RESUME = `Jane Doe
jane.doe@example.com
(416) 555-0134
linkedin.com/in/janedoe
github.com/janedoe

Experienced cloud engineer with a focus on Kubernetes and Terraform.

SKILLS
Docker, Kubernetes, AWS, Terraform, Python, Git

EXPERIENCE
Cloud Engineer, Acme Corp
2021 - Present
Built and maintained CI/CD pipelines.

EDUCATION
B.Eng Software Engineering, University of Waterloo
2016 - 2020
`;

describe("heuristicExtractResume", () => {
  it("extracts contact info and known skills without inventing experience/education", () => {
    const result = heuristicExtractResume(SAMPLE_RESUME);

    expect(result.personal.email).toBe("jane.doe@example.com");
    expect(result.personal.firstName).toBe("Jane");
    expect(result.personal.lastName).toBe("Doe");
    expect(result.skills.map((s) => s.name)).toEqual(expect.arrayContaining(["Docker", "Kubernetes", "AWS"]));
    // The heuristic never invents structured experience/education entries.
    expect(result.experience).toEqual([]);
    expect(result.education).toEqual([]);
  });

  it("returns mostly-empty data for text with no recognizable structure", () => {
    const result = heuristicExtractResume("lorem ipsum dolor sit amet");
    expect(result.personal.email).toBeUndefined();
    expect(result.skills).toEqual([]);
  });
});

describe("scoreResumeExtraction", () => {
  it("scores a heuristic extraction (missing experience/education) below the review threshold", () => {
    const extraction = heuristicExtractResume(SAMPLE_RESUME);
    const { score } = scoreResumeExtraction(extraction);
    expect(score).toBeLessThan(0.6);
  });

  it("scores a complete, well-formed extraction highly", () => {
    const { score } = scoreResumeExtraction({
      personal: { firstName: "Jane", lastName: "Doe", email: "jane@example.com" },
      summary: "Cloud engineer.",
      skills: [{ name: "Kubernetes" }],
      experience: [{ company: "Acme", jobTitle: "Engineer", startDate: "2021-01-01", isCurrent: true }],
      education: [{ institution: "Waterloo", degree: "B.Eng" }],
      certifications: [],
      languages: [],
      projects: [],
    });
    expect(score).toBe(1);
  });

  it("flags invalid date ranges", () => {
    const { score, checks } = scoreResumeExtraction({
      personal: {},
      skills: [],
      experience: [{ company: "Acme", jobTitle: "Engineer", startDate: "2021-01-01", endDate: "2019-01-01" }],
      education: [],
      certifications: [],
      languages: [],
      projects: [],
    });
    expect(checks.find((c) => c.label === "dates_valid")?.passed).toBe(false);
    expect(score).toBeLessThan(1);
  });
});

describe("parseResume", () => {
  it("seeds the MockAIProvider with the heuristic extraction and flags review for an incomplete resume", async () => {
    const provider = new MockAIProvider();
    const result = await parseResume(provider, SAMPLE_RESUME);

    expect(result.data.personal.email).toBe("jane.doe@example.com");
    expect(result.promptVersion).toBe("resume-parser-v1");
    expect(result.reviewRequired).toBe(true);
  });

  it("does not require review when a provider returns a complete extraction", async () => {
    const provider = new MockAIProvider();
    provider.queueStructuredResponse({
      personal: { firstName: "Jane", lastName: "Doe", email: "jane@example.com" },
      summary: "Cloud engineer.",
      skills: [{ name: "Kubernetes" }],
      experience: [{ company: "Acme", jobTitle: "Engineer", startDate: "2021-01-01", isCurrent: true }],
      education: [{ institution: "Waterloo", degree: "B.Eng" }],
      certifications: [],
      languages: [],
      projects: [],
    });

    const result = await parseResume(provider, SAMPLE_RESUME);
    expect(result.reviewRequired).toBe(false);
  });
});
