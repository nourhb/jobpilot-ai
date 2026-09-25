import { describe, expect, it } from "vitest";
import { recordHttpRequest, renderMetrics } from "./metrics";

describe("renderMetrics", () => {
  it("exposes process-up and request-count gauges for Prometheus", () => {
    recordHttpRequest();
    const text = renderMetrics();
    expect(text).toContain("jobpilot_up 1");
    expect(text).toMatch(/jobpilot_http_requests_total \d+/);
  });
});
