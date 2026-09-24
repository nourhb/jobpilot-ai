import { describe, expect, it } from "vitest";
import { resolveApplicationAdapter } from "./applicationRouter";
import { mockAtsAdapter } from "./mockAts.adapter";

describe("resolveApplicationAdapter", () => {
  it("resolves the Mock ATS adapter for MOCK-sourced jobs", () => {
    expect(resolveApplicationAdapter("MOCK")).toBe(mockAtsAdapter);
  });

  it("returns null (no adapter yet) for every real ATS source -- Phase 7", () => {
    expect(resolveApplicationAdapter("GREENHOUSE")).toBeNull();
    expect(resolveApplicationAdapter("LEVER")).toBeNull();
    expect(resolveApplicationAdapter("ASHBY")).toBeNull();
    expect(resolveApplicationAdapter("WORKABLE")).toBeNull();
    expect(resolveApplicationAdapter("COMPANY")).toBeNull();
  });
});
