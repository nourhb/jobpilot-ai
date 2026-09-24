import { describe, expect, it } from "vitest";
import type { HybridScoreBreakdown } from "@jobpilot/shared";
import { heuristicJobMatchInterpretation } from "./jobMatch.heuristic";

function makeBreakdown(overrides: Partial<HybridScoreBreakdown> = {}): HybridScoreBreakdown {
  return {
    score: 85,
    matchCategory: "STRONG",
    skillsScore: 90,
    experienceScore: 90,
    titleScore: 90,
    locationScore: 100,
    authorizationScore: 100,
    salaryScore: 90,
    employmentTypeScore: 100,
    preferencesScore: 90,
    matchedSkills: ["Kubernetes", "Docker"],
    ...overrides,
  };
}

describe("heuristicJobMatchInterpretation", () => {
  it("praises matched skills and a strong location/authorization fit", () => {
    const result = heuristicJobMatchInterpretation(makeBreakdown());

    expect(result.reasons.some((r) => r.includes("Kubernetes"))).toBe(true);
    expect(result.reasons.some((r) => r.includes("location"))).toBe(true);
    expect(result.reasons.some((r) => r.includes("authorization"))).toBe(true);
    expect(result.riskFlags).toEqual([]);
    expect(result.missingRequirements).toEqual([]);
    expect(result.decision).toBe("APPLY");
  });

  it("flags missing requirements when no skills matched", () => {
    const result = heuristicJobMatchInterpretation(makeBreakdown({ matchedSkills: [], skillsScore: 0, score: 55 }));
    expect(result.missingRequirements.length).toBeGreaterThan(0);
    expect(result.decision).toBe("SKIP");
  });

  it("flags a risk when authorization score is low", () => {
    const result = heuristicJobMatchInterpretation(makeBreakdown({ authorizationScore: 20 }));
    expect(result.riskFlags.some((r) => r.includes("sponsorship"))).toBe(true);
  });

  it("flags a risk when the experience score is low", () => {
    const result = heuristicJobMatchInterpretation(makeBreakdown({ experienceScore: 20 }));
    expect(result.riskFlags.some((r) => r.includes("experience"))).toBe(true);
  });

  it("flags a risk when the salary score is low", () => {
    const result = heuristicJobMatchInterpretation(makeBreakdown({ salaryScore: 20 }));
    expect(result.riskFlags.some((r) => r.includes("salary"))).toBe(true);
  });

  it("suggests REVIEW for a middling score", () => {
    const result = heuristicJobMatchInterpretation(makeBreakdown({ score: 72 }));
    expect(result.decision).toBe("REVIEW");
  });
});
