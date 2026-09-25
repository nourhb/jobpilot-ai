import { describe, expect, it } from "vitest";
import { inferEmploymentType, inferExperienceLevel, inferRemoteType } from "./infer";

describe("inferExperienceLevel", () => {
  it("reads seniority from the title", () => {
    expect(inferExperienceLevel("Senior Software Engineer")).toBe("SENIOR");
    expect(inferExperienceLevel("Staff Platform Engineer")).toBe("LEAD");
    expect(inferExperienceLevel("Junior Developer")).toBe("ENTRY");
    expect(inferExperienceLevel("Software Engineering Intern")).toBe("INTERNSHIP");
  });
});

describe("inferEmploymentType", () => {
  it("prefers an explicit type, then the title", () => {
    expect(inferEmploymentType("Engineer", "Full-time")).toBe("FULL_TIME");
    expect(inferEmploymentType("Backend Intern")).toBe("INTERNSHIP");
  });
});

describe("inferRemoteType", () => {
  it("treats worldwide locations as remote", () => {
    expect(inferRemoteType("Remote, Canada")).toBe("REMOTE");
    expect(inferRemoteType("Toronto, ON", "Hybrid Product Manager")).toBe("HYBRID");
  });
});
