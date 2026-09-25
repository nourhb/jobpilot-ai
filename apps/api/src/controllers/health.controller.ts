import type { Request, Response } from "express";
import type { HealthStatus } from "@jobpilot/shared";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { createAIProvider } from "@jobpilot/ai";
import { env } from "../config/env";

export const healthController = {
  async liveness(_req: Request, res: Response): Promise<void> {
    const body: HealthStatus = { status: "OK", service: "api", timestamp: new Date().toISOString() };
    res.status(200).json({ success: true, data: body });
  },

  /**
   * Always-on readiness probe for Docker/k8s (Phase 10/11). Production
   * responses never include dependency error strings.
   */
  async readiness(_req: Request, res: Response): Promise<void> {
    const timestamp = new Date().toISOString();
    try {
      await prisma.$queryRaw`SELECT 1`;
      const pong = await redis.ping();
      if (pong !== "PONG") {
        throw new Error("Redis did not respond with PONG");
      }
      const body: HealthStatus = { status: "OK", service: "ready", timestamp };
      res.status(200).json({ success: true, data: body });
    } catch (error) {
      const body: HealthStatus = {
        status: "DOWN",
        service: "ready",
        timestamp,
        ...(env.NODE_ENV !== "production"
          ? { details: { message: error instanceof Error ? error.message : "Unknown error" } }
          : {}),
      };
      res.status(503).json({
        success: false,
        error: { code: "NOT_READY", message: "Service is not ready" },
        data: body,
      });
    }
  },

  async database(_req: Request, res: Response): Promise<void> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      const body: HealthStatus = { status: "OK", service: "database", timestamp: new Date().toISOString() };
      res.status(200).json({ success: true, data: body });
    } catch (error) {
      const body: HealthStatus = {
        status: "DOWN",
        service: "database",
        timestamp: new Date().toISOString(),
        details: { message: error instanceof Error ? error.message : "Unknown error" },
      };
      res.status(503).json({ success: false, error: { code: "DATABASE_UNAVAILABLE", message: "Database unavailable" }, data: body });
    }
  },

  async redisHealth(_req: Request, res: Response): Promise<void> {
    try {
      const pong = await redis.ping();
      const status = pong === "PONG" ? "OK" : "DEGRADED";
      const body: HealthStatus = { status, service: "redis", timestamp: new Date().toISOString() };
      res.status(status === "OK" ? 200 : 503).json({ success: true, data: body });
    } catch (error) {
      const body: HealthStatus = {
        status: "DOWN",
        service: "redis",
        timestamp: new Date().toISOString(),
        details: { message: error instanceof Error ? error.message : "Unknown error" },
      };
      res.status(503).json({ success: false, error: { code: "REDIS_UNAVAILABLE", message: "Redis unavailable" }, data: body });
    }
  },

  async ai(_req: Request, res: Response): Promise<void> {
    const provider = createAIProvider({ provider: env.AI_PROVIDER, apiKey: env.AI_API_KEY, model: env.AI_MODEL });
    const healthy = await provider.isHealthy().catch(() => false);
    const body: HealthStatus = {
      status: healthy ? "OK" : "DOWN",
      service: `ai:${provider.name}`,
      timestamp: new Date().toISOString(),
    };
    res.status(healthy ? 200 : 503).json({ success: healthy, data: body });
  },
};
