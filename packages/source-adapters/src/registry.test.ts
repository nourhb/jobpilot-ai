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
    expect(registry.isSupported("GREENHOUSE")).toBe(false);
  });

  it("throws a clear error when creating an unregistered adapter type", () => {
    const registry = new SourceAdapterRegistry();
    expect(() => registry.create("LEVER")).toThrow(/Phase 7/);
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
