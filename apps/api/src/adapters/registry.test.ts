import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env", () => ({
  env: { GREENHOUSE_ENABLED: false, LEVER_ENABLED: false, ASHBY_ENABLED: false },
}));
vi.mock("@jobpilot/source-adapters", () => ({
  sourceAdapterRegistry: { create: vi.fn().mockReturnValue({ sourceName: "stub" }) },
}));

describe("getAdapterForSource", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("creates the MOCK adapter without checking any environment flag", async () => {
    const { getAdapterForSource } = await import("./registry");
    const { sourceAdapterRegistry } = await import("@jobpilot/source-adapters");

    const adapter = getAdapterForSource({ type: "MOCK", config: {} } as never);

    expect(adapter.sourceName).toBe("stub");
    expect(sourceAdapterRegistry.create).toHaveBeenCalledWith("MOCK", {});
  });

  it("throws instead of calling out to a real source when its environment flag is disabled", async () => {
    const { getAdapterForSource } = await import("./registry");
    const { sourceAdapterRegistry } = await import("@jobpilot/source-adapters");

    expect(() => getAdapterForSource({ type: "GREENHOUSE", config: { boardToken: "acme" } } as never)).toThrow(/disabled by its environment flag/);
    expect(sourceAdapterRegistry.create).not.toHaveBeenCalled();
  });

  it("creates a real adapter when its environment flag is enabled", async () => {
    vi.doMock("../config/env", () => ({
      env: { GREENHOUSE_ENABLED: true, LEVER_ENABLED: false, ASHBY_ENABLED: false },
    }));

    const { getAdapterForSource } = await import("./registry");
    const { sourceAdapterRegistry } = await import("@jobpilot/source-adapters");

    const adapter = getAdapterForSource({ type: "GREENHOUSE", config: { boardToken: "acme" } } as never);

    expect(adapter.sourceName).toBe("stub");
    expect(sourceAdapterRegistry.create).toHaveBeenCalledWith("GREENHOUSE", { boardToken: "acme" });
  });
});
