import { describe, expect, it } from "vitest";
import { scoreTitleSimilarity } from "./titleSimilarity";

describe("scoreTitleSimilarity", () => {
  it("returns 0 when there are no reference titles", () => {
    expect(scoreTitleSimilarity("Cloud Support Engineer", [])).toBe(0);
  });

  it("scores an exact title match at 100", () => {
    expect(scoreTitleSimilarity("Cloud Support Engineer", ["Cloud Support Engineer"])).toBe(100);
  });

  it("scores a partial word overlap between 0 and 100", () => {
    const score = scoreTitleSimilarity("Senior Cloud Support Engineer", ["Cloud Support Engineer"]);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });

  it("scores completely unrelated titles at 0", () => {
    expect(scoreTitleSimilarity("Marketing Manager", ["Cloud Support Engineer"])).toBe(0);
  });

  it("picks the best match across multiple reference titles", () => {
    const score = scoreTitleSimilarity("DevOps Engineer", ["Marketing Manager", "DevOps Engineer"]);
    expect(score).toBe(100);
  });
});
