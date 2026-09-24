import { describe, expect, it } from "vitest";
import { SourceAdapterRegistry } from "./registry";

describe("SourceAdapterRegistry", () => {
  it("creates the built-in MOCK adapter", () => {
    const registry = new SourceAdapterRegistry();
    const adapter = registry.create("MOCK");
    expect(adapter.sourceName).toBe("mock");
  });

  it("reports unsupported source types as such", () => {
    const registry = new SourceAdapterRegistry();
    expect(registry.isSupported("WORKABLE")).toBe(false);
  });

  it("reports Phase 7's real sources as supported", () => {
    const registry = new SourceAdapterRegistry();
    expect(registry.isSupported("GREENHOUSE")).toBe(true);
    expect(registry.isSupported("LEVER")).toBe(true);
    expect(registry.isSupported("ASHBY")).toBe(true);
  });

  it("creates real adapters with their per-source config", () => {
    const registry = new SourceAdapterRegistry();
    expect(registry.create("GREENHOUSE", { boardToken: "acmeco" }).sourceName).toBe("greenhouse:acmeco");
    expect(registry.create("LEVER", { company: "acmeco" }).sourceName).toBe("lever:acmeco");
    expect(registry.create("ASHBY", { jobBoardName: "acmeco" }).sourceName).toBe("ashby:acmeco");
  });

  it("throws a clear error when creating an unregistered adapter type", () => {
    const registry = new SourceAdapterRegistry();
    expect(() => registry.create("WORKABLE")).toThrow(/out of project scope/);
  });

  it("allows registering a new adapter factory at runtime", () => {
    const registry = new SourceAdapterRegistry();
    registry.register("COMPANY", () => ({
      sourceName: "custom-company",
      discoverJobs: async () => [],
      getJobDetails: async () => {
        throw new Error("not implemented");
      },
    }));

    expect(registry.isSupported("COMPANY")).toBe(true);
    expect(registry.create("COMPANY").sourceName).toBe("custom-company");
  });
});
