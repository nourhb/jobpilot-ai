import { Router } from "express";
import { getQuestionsFor, isJobActive, simulateSubmit } from "./mockAts.fixtures";

/**
 * Section 60: a fake employer-side application system, reachable over
 * genuine HTTP (not just in-process function calls) so
 * apps/api/src/applications/adapters/mockAts.adapter.ts is a real HTTP
 * client -- the same shape Phase 7's Lever/Ashby/Greenhouse adapters
 * will use. Mounted only in non-production environments (see
 * routes/index.ts) -- this must never be reachable once real adapters
 * exist.
 */
export const mockAtsRouter = Router();

mockAtsRouter.get("/jobs/:externalId", (req, res) => {
  res.status(200).json({ active: isJobActive(req.params.externalId) });
});

mockAtsRouter.get("/jobs/:externalId/questions", (req, res) => {
  res.status(200).json({ questions: getQuestionsFor(req.params.externalId) });
});

mockAtsRouter.post("/jobs/:externalId/applications", (req, res) => {
  const outcome = simulateSubmit(req.params.externalId);

  if (outcome.kind === "captcha") {
    res.status(409).json({ error: "CAPTCHA_REQUIRED", message: "This application requires solving a CAPTCHA." });
    return;
  }
  if (outcome.kind === "unavailable") {
    res.status(503).json({ error: "ATS_UNAVAILABLE", message: "The application system is temporarily unavailable." });
    return;
  }

  res.status(201).json({ applicationId: outcome.externalApplicationId, status: "received" });
});
