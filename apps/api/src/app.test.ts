import { describe, expect, it, vi } from "vitest";
import request from "supertest";

// Avoid opening real network connections during this unit-level HTTP test.
vi.mock("./lib/prisma", () => ({ prisma: { $queryRaw: vi.fn(), $disconnect: vi.fn() } }));
vi.mock("./lib/redis", () => ({
  redis: { ping: vi.fn().mockResolvedValue("PONG"), quit: vi.fn() },
}));

describe("app", () => {
  it("responds to GET /api/health with 200 OK", async () => {
    const { createApp } = await import("./app");
    const app = createApp();

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, data: { status: "OK", service: "api" } });
  });

  it("responds to GET /api/ready when dependencies are up", async () => {
    const { createApp } = await import("./app");
    const app = createApp();

    const response = await request(app).get("/api/ready");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, data: { status: "OK", service: "ready" } });
  });

  it("exposes Prometheus text on GET /api/metrics", async () => {
    const { createApp } = await import("./app");
    const app = createApp();

    const response = await request(app).get("/api/metrics");

    expect(response.status).toBe(200);
    expect(response.text).toContain("jobpilot_up 1");
  });

  it("returns a structured 404 for unknown routes", async () => {
    const { createApp } = await import("./app");
    const app = createApp();

    const response = await request(app).get("/api/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ success: false, error: { code: "NOT_FOUND" } });
  });

  it("rejects registration with an invalid payload with a structured 400", async () => {
    const { createApp } = await import("./app");
    const app = createApp();

    const response = await request(app).post("/api/auth/register").send({ email: "not-an-email" });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ success: false, error: { code: "VALIDATION_ERROR" } });
  });
});
