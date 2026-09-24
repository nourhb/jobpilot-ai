import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { mockAtsRouter } from "./mockAts.router";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/_mock-ats", mockAtsRouter);
  return app;
}

describe("mockAtsRouter", () => {
  it("GET /jobs/:externalId reports active for a plain externalId", async () => {
    const response = await request(buildApp()).get("/api/_mock-ats/jobs/ext-1");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ active: true });
  });

  it("GET /jobs/:externalId reports inactive for an expired marker", async () => {
    const response = await request(buildApp()).get("/api/_mock-ats/jobs/ext-expired");
    expect(response.body).toEqual({ active: false });
  });

  it("GET /jobs/:externalId/questions returns the base question set", async () => {
    const response = await request(buildApp()).get("/api/_mock-ats/jobs/ext-1/questions");
    expect(response.status).toBe(200);
    expect(response.body.questions).toHaveLength(3);
  });

  it("POST /jobs/:externalId/applications succeeds for a plain externalId", async () => {
    const response = await request(buildApp())
      .post("/api/_mock-ats/jobs/ext-1/applications")
      .send({ candidateName: "Demo", candidateEmail: "demo@jobpilot.ai", coverLetter: "...", answers: [] });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe("received");
  });

  it("POST /jobs/:externalId/applications returns 409 for a captcha marker", async () => {
    const response = await request(buildApp()).post("/api/_mock-ats/jobs/ext-captcha/applications").send({});
    expect(response.status).toBe(409);
    expect(response.body.error).toBe("CAPTCHA_REQUIRED");
  });

  it("POST /jobs/:externalId/applications returns 503 for a fail marker", async () => {
    const response = await request(buildApp()).post("/api/_mock-ats/jobs/ext-fail/applications").send({});
    expect(response.status).toBe(503);
    expect(response.body.error).toBe("ATS_UNAVAILABLE");
  });
});
