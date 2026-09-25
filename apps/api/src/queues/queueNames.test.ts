import { describe, expect, it } from "vitest";
import { QUEUE_NAMES } from "./queueNames";

describe("QUEUE_NAMES", () => {
  it("includes every queue named in spec section 40", () => {
    expect(Object.values(QUEUE_NAMES)).toEqual(
      expect.arrayContaining([
        "job-discovery",
        "job-normalization",
        "job-matching",
        "cover-letter-generation",
        "application-preparation",
        "application-validation",
        "application-submission",
        "application-verification",
        "notifications",
      ]),
    );
  });
});
