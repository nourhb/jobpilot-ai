/**
 * Real integration test: boots the Express app against a real Postgres
 * database (no mocks) and drives the register -> login -> me flow.
 *
 * Requires: `docker compose up -d postgres` and
 * `pnpm --filter api run db:migrate` against DATABASE_URL first.
 * Run with `pnpm --filter api run test:integration`.
 */
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./app";
import { prisma } from "./lib/prisma";
import { redis } from "./lib/redis";

const testEmail = `integration-${Date.now()}@jobpilot.ai`;

describe("auth flow (integration)", () => {
  const app = createApp();

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.$disconnect();
    await redis.quit();
  });

  it("connects to the real database via GET /api/health/database", async () => {
    const response = await request(app).get("/api/health/database");
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("OK");
  });

  let accessToken: string;

  it("registers a new user", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: testEmail,
      password: "StrongPass123",
      firstName: "Integration",
      lastName: "Test",
    });

    expect(response.status).toBe(201);
    expect(response.body.data.user.email).toBe(testEmail);
    accessToken = response.body.data.accessToken;
  });

  it("rejects a duplicate registration", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: testEmail,
      password: "StrongPass123",
      firstName: "Integration",
      lastName: "Test",
    });

    expect(response.status).toBe(409);
  });

  it("logs in with the correct password", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: testEmail,
      password: "StrongPass123",
    });

    expect(response.status).toBe(200);
    accessToken = response.body.data.accessToken;
  });

  it("rejects login with the wrong password", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: testEmail,
      password: "WrongPassword1",
    });

    expect(response.status).toBe(401);
  });

  it("returns the current user for GET /api/auth/me with a valid token", async () => {
    const response = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe(testEmail);
  });

  it("rejects GET /api/auth/me without a token", async () => {
    const response = await request(app).get("/api/auth/me");
    expect(response.status).toBe(401);
  });
});
