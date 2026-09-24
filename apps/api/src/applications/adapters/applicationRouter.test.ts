import { beforeEach, describe, expect, it, vi } from "vitest";

describe("resolveApplicationAdapter", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("resolves the Mock ATS adapter for MOCK-sourced jobs", async () => {
    // Re-imported alongside `applicationRouter` (after `resetModules`)
    // so both come from the same module registry instance -- `toBe`
    // across a stale top-level import vs. a freshly reset module graph
    // would otherwise fail on reference equality alone.
    const { resolveApplicationAdapter } = await import("./applicationRouter");
    const { mockAtsAdapter } = await import("./mockAts.adapter");
    expect(resolveApplicationAdapter({ type: "MOCK", config: {} })).toBe(mockAtsAdapter);
  });

  it("always returns null for GREENHOUSE (its adapter never implements submitApplication)", async () => {
    const { resolveApplicationAdapter } = await import("./applicationRouter");
    expect(resolveApplicationAdapter({ type: "GREENHOUSE", config: { boardToken: "acme" } })).toBeNull();
  });

  it("returns null for out-of-scope source types", async () => {
    const { resolveApplicationAdapter } = await import("./applicationRouter");
    expect(resolveApplicationAdapter({ type: "WORKABLE", config: {} })).toBeNull();
    expect(resolveApplicationAdapter({ type: "COMPANY", config: {} })).toBeNull();
  });

  it("returns null for LEVER/ASHBY when their environment flag is disabled (the default)", async () => {
    vi.doMock("../../config/env", () => ({ env: { LEVER_ENABLED: false, ASHBY_ENABLED: false } }));
    const { resolveApplicationAdapter } = await import("./applicationRouter");

    expect(resolveApplicationAdapter({ type: "LEVER", config: { company: "acme" } })).toBeNull();
    expect(resolveApplicationAdapter({ type: "ASHBY", config: { jobBoardName: "acme" } })).toBeNull();
  });

  it("resolves a real bridged adapter for LEVER when its environment flag is enabled", async () => {
    vi.doMock("../../config/env", () => ({ env: { LEVER_ENABLED: true, ASHBY_ENABLED: false } }));
    const { resolveApplicationAdapter } = await import("./applicationRouter");

    const adapter = resolveApplicationAdapter({ type: "LEVER", config: { company: "acme" } });
    expect(adapter?.name).toBe("lever");
  });

  it("resolves a real bridged adapter for ASHBY when its environment flag is enabled", async () => {
    vi.doMock("../../config/env", () => ({ env: { LEVER_ENABLED: false, ASHBY_ENABLED: true } }));
    const { resolveApplicationAdapter } = await import("./applicationRouter");

    const adapter = resolveApplicationAdapter({ type: "ASHBY", config: { jobBoardName: "acme" } });
    expect(adapter?.name).toBe("ashby");
  });
});
