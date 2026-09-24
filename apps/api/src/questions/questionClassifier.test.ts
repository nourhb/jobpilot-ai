import { describe, expect, it } from "vitest";
import { classifyQuestion } from "./questionClassifier";

describe("classifyQuestion", () => {
  it("classifies a work authorization question as LEGAL, never HIGH_RISK", () => {
    expect(classifyQuestion("Are you legally authorized to work in Canada?")).toEqual({
      category: "LEGAL",
      responseShape: "YES_NO",
    });
  });

  it("classifies a sponsorship question as LEGAL", () => {
    const result = classifyQuestion("Will you now or in the future require sponsorship?");
    expect(result.category).toBe("LEGAL");
  });

  it("classifies criminal history questions as HIGH_RISK", () => {
    expect(classifyQuestion("Have you ever been convicted of a criminal offense?").category).toBe("HIGH_RISK");
  });

  it("classifies medical/disability questions as HIGH_RISK", () => {
    expect(classifyQuestion("Do you have any disability we should accommodate?").category).toBe("HIGH_RISK");
  });

  it("classifies a numeric years-of-experience question as EXPERIENCE_FACT/NUMERIC", () => {
    expect(classifyQuestion("How many years of Kubernetes experience do you have?")).toEqual({
      category: "EXPERIENCE_FACT",
      responseShape: "NUMERIC",
    });
  });

  it("classifies a yes/no experience question as EXPERIENCE_FACT/YES_NO", () => {
    expect(classifyQuestion("Do you have AWS experience?")).toEqual({
      category: "EXPERIENCE_FACT",
      responseShape: "YES_NO",
    });
  });

  it("classifies a descriptive experience question as EXPERIENCE_FACT/DESCRIPTIVE", () => {
    expect(classifyQuestion("Describe your Terraform experience.")).toEqual({
      category: "EXPERIENCE_FACT",
      responseShape: "DESCRIPTIVE",
    });
  });

  it("classifies education questions as EDUCATION_FACT", () => {
    expect(classifyQuestion("Do you have a bachelor's degree?").category).toBe("EDUCATION_FACT");
  });

  it("classifies salary/relocation questions as PREFERENCE", () => {
    expect(classifyQuestion("What is your expected salary?").category).toBe("PREFERENCE");
    expect(classifyQuestion("Are you willing to relocate?").category).toBe("PREFERENCE");
  });

  it("classifies motivational questions as MOTIVATIONAL", () => {
    expect(classifyQuestion("Why do you want to work at our company?").category).toBe("MOTIVATIONAL");
  });

  it("classifies contact-detail questions as PROFILE_FACT", () => {
    expect(classifyQuestion("What is your full name?").category).toBe("PROFILE_FACT");
  });

  it("classifies an unmatched open question as UNKNOWN", () => {
    expect(classifyQuestion("Describe a challenge you solved using quantum entanglement.").category).toBe("UNKNOWN");
  });
});
