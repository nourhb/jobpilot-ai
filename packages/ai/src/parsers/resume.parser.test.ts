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
  it("extracts contact, skills, and labelled experience/education without inventing extras", () => {
    const result = heuristicExtractResume(SAMPLE_RESUME);

    expect(result.personal.email).toBe("jane.doe@example.com");
    expect(result.personal.firstName).toBe("Jane");
    expect(result.personal.lastName).toBe("Doe");
    expect(result.skills.map((s) => s.name)).toEqual(expect.arrayContaining(["Docker", "Kubernetes", "AWS"]));
    expect(result.experience).toEqual([
      expect.objectContaining({
        company: "Acme Corp",
        jobTitle: "Cloud Engineer",
        startDate: "2021-01-01",
        isCurrent: true,
      }),
    ]);
    expect(result.education).toEqual([
      expect.objectContaining({
        institution: "University of Waterloo",
        degree: "B.Eng Software Engineering",
      }),
    ]);
    expect(result.workAuthorization).toBeUndefined();
  });

  it("extracts an explicit Canadian work-authorization phrase only", () => {
    const result = heuristicExtractResume(`${SAMPLE_RESUME}\nCanadian Citizen. 5 years of experience.\n`);
    expect(result.workAuthorization).toBe("CANADIAN_CITIZEN");
    expect(result.yearsOfExperience).toBe(5);
  });

  it("does not invent a legal status from a generic eligibility sentence", () => {
    const result = heuristicExtractResume("Eligible to work in Canada.\nAuthorized to work.");
    expect(result.workAuthorization).toBeUndefined();
  });

  it("returns mostly-empty data for text with no recognizable structure", () => {
    const result = heuristicExtractResume("lorem ipsum dolor sit amet");
    expect(result.personal.email).toBeUndefined();
    expect(result.skills).toEqual([]);
    expect(result.experience).toEqual([]);
  });

  it("extracts jobs when dates sit on the same line as the title", () => {
    const result = heuristicExtractResume(`ALEX RIVERA
alex.rivera@example.com
Toronto, ON

EXPERIENCE
Senior Cloud Engineer | Shopify | Jan 2021 - Present
Designed Kubernetes platforms.
Software Engineer, Acme Corp 2018 - 2021
Wrote TypeScript services.

EDUCATION
University of Toronto - BSc Computer Science
2014 - 2018
`);

    expect(result.personal.firstName).toBe("Alex");
    expect(result.personal.city).toBe("Toronto");
    expect(result.experience).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          jobTitle: "Senior Cloud Engineer",
          company: "Shopify",
          startDate: "2021-01-01",
          isCurrent: true,
        }),
        expect.objectContaining({
          jobTitle: "Software Engineer",
          company: "Acme Corp",
          startDate: "2018-01-01",
          endDate: "2021-01-01",
        }),
      ]),
    );
    expect(result.education).toEqual([
      expect.objectContaining({
        institution: "University of Toronto",
        degree: expect.stringMatching(/BSc/i),
      }),
    ]);
    expect(result.yearsOfExperience).toBeGreaterThanOrEqual(3);
  });

  it("recovers jobs from stacked company/title lines and PDF-flattened headers", () => {
    const result = heuristicExtractResume(
      "JANE DOE jane.doe@example.com EXPERIENCE Senior Software Engineer Shopify Jan 2020 - Present Built checkout EDUCATION B.Eng Software Engineering, University of Waterloo 2016 - 2020",
    );

    expect(result.experience.length).toBeGreaterThanOrEqual(1);
    expect(result.experience[0]).toEqual(
      expect.objectContaining({
        jobTitle: expect.stringMatching(/software engineer/i),
        company: "Shopify",
        isCurrent: true,
      }),
    );
    expect(result.education.length).toBeGreaterThanOrEqual(1);
  });

  it("extracts a two-line company/title CV like Nour El Houda Bouajila's", () => {
    const result = heuristicExtractResume(`Nour El Houda Bouajila
+1 (418)570-2244 — nourhb58@gmail.com — linkedin.com/in/nour-el-houda-bouajila — www.nour-el-houda-bouajila.rf.gd/
Summary — Full-Stack Developer with 3+ years of experience building and deploying scalable web applications using React, Node.js, and modern cloud technologies.

Skills
– Programming Languages: Python, JavaScript, HTML, CSS, PHP, SQL, TypeScript
– Cloud & Virtualization: AWS, Azure, Docker, Kubernetes, Terraform

Experience
Digital Men January 2025 - July 2026
Full-stack Developer Tunis, Tunisia
– Built and maintained full-stack web applications using React, Node.js, and Nextjs
GrowthLab March 2024 - December 2024
Full Stack Developer Tunis, Tunisia
– Developed and deployed web applications using MERN stack
Freelance Web Developer Oct 2023 - Present
Remote
– Delivered full-stack web applications using MERN and Nextjs
Windeco August 2022 - September 2023
Information Technology Assistant Tunisia
– Developed internal web platform using React, Node.js, and MongoDB

Education
iTeam University
Engineer's Degree, Cloud Computing & Virtualization 2023 - 2026
Institut Supérieur de Gestion de Sousse
Bachelor's in Business Intelligence & Data Analytics 2020 - 2022

Languages
– Arabic: Native
– French: Advanced
– English: Professional
`);

    expect(result.personal.firstName).toBe("Nour");
    expect(result.personal.lastName).toBe("Bouajila");
    expect(result.personal.email).toBe("nourhb58@gmail.com");
    expect(result.yearsOfExperience).toBe(3);
    expect(result.summary).toMatch(/Full-Stack Developer/i);
    expect(result.experience).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          company: "Digital Men",
          jobTitle: "Full-stack Developer",
          location: "Tunis, Tunisia",
          startDate: "2025-01-01",
        }),
        expect.objectContaining({
          company: "GrowthLab",
          jobTitle: "Full Stack Developer",
        }),
        expect.objectContaining({
          company: "Freelance",
          jobTitle: expect.stringMatching(/freelance web developer/i),
          isCurrent: true,
        }),
        expect.objectContaining({
          company: "Windeco",
          jobTitle: "Information Technology Assistant",
        }),
      ]),
    );
    expect(result.education).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          institution: "iTeam University",
          degree: expect.stringMatching(/engineer/i),
        }),
        expect.objectContaining({
          institution: expect.stringMatching(/Sousse/i),
          degree: expect.stringMatching(/bachelor/i),
        }),
      ]),
    );
    expect(result.skills.map((s) => s.name)).toEqual(expect.arrayContaining(["Python", "TypeScript", "AWS", "Docker"]));
    expect(result.workAuthorization).toBeUndefined();
  });

  it("reads comma-separated skills that are not in the known keyword list", () => {
    const result = heuristicExtractResume(`Skills
Looker, dbt, Airflow, Kubernetes
`);
    expect(result.skills.map((s) => s.name)).toEqual(expect.arrayContaining(["Looker", "dbt", "Airflow", "Kubernetes"]));
  });
});

describe("scoreResumeExtraction", () => {
  it("scores a labelled typical resume highly", () => {
    const extraction = heuristicExtractResume(SAMPLE_RESUME);
    const { score } = scoreResumeExtraction(extraction);
    expect(score).toBeGreaterThanOrEqual(0.8);
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
  it("seeds the MockAIProvider with the heuristic extraction of a labelled resume", async () => {
    const provider = new MockAIProvider();
    const result = await parseResume(provider, SAMPLE_RESUME);

    expect(result.data.personal.email).toBe("jane.doe@example.com");
    expect(result.data.experience).toHaveLength(1);
    expect(result.promptVersion).toBe("resume-parser-v1");
  });

  it("flags review when the resume has no structured sections", async () => {
    const provider = new MockAIProvider();
    const result = await parseResume(provider, "just a name jane");
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
