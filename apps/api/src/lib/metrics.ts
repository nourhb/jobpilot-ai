/**
 * Minimal Prometheus text exposition (section 89/11) -- no extra
 * dependency. Scraped by the local Prometheus in
 * deploy/monitoring, never by a cloud vendor.
 */
const counters = {
  httpRequests: 0,
};

export function recordHttpRequest(): void {
  counters.httpRequests += 1;
}

export function renderMetrics(): string {
  return [
    "# HELP jobpilot_up 1 if the process is running.",
    "# TYPE jobpilot_up gauge",
    "jobpilot_up 1",
    "# HELP jobpilot_http_requests_total HTTP requests handled by this process.",
    "# TYPE jobpilot_http_requests_total counter",
    `jobpilot_http_requests_total ${counters.httpRequests}`,
    "",
  ].join("\n");
}
