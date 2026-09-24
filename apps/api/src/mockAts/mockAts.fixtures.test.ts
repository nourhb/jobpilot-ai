import { describe, expect, it } from "vitest";
import { getQuestionsFor, isJobActive, simulateSubmit } from "./mockAts.fixtures";

describe("mockAts.fixtures", () => {
  it("treats a plain externalId as active with the base question set", () => {
    expect(isJobActive("ext-1")).toBe(true);
    expect(getQuestionsFor("ext-1")).toHaveLength(3);
  });

  it("treats an expired/closed marker as inactive", () => {
    expect(isJobActive("ext-expired")).toBe(false);
    expect(isJobActive("ext-closed")).toBe(false);
  });

  it("adds a HIGH_RISK-style question for a highrisk marker", () => {
    const questions = getQuestionsFor("ext-highrisk");
    expect(questions.some((q) => q.text.includes("disability"))).toBe(true);
  });

  it("adds an unanswerable question for an unanswerable marker", () => {
    const questions = getQuestionsFor("ext-unanswerable");
    expect(questions.some((q) => q.text.includes("Terraform"))).toBe(true);
  });

  it("simulates a successful submission by default", () => {
    const outcome = simulateSubmit("ext-1");
    expect(outcome.kind).toBe("success");
  });

  it("simulates a CAPTCHA challenge for a captcha marker", () => {
    expect(simulateSubmit("ext-captcha").kind).toBe("captcha");
  });

  it("simulates an unavailable source for a fail marker", () => {
    expect(simulateSubmit("ext-fail").kind).toBe("unavailable");
  });
});
