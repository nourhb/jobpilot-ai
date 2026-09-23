import Redis from "ioredis";
import { env } from "../config/env";
import { logger } from "./logger";

/**
 * Shared Redis connection. Used for health checks now; BullMQ queues
 * (job-discovery, job-matching, application-submission, etc.) are added
 * in Phase 8 on top of the same connection factory.
 */
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redis.on("error", (error) => {
  logger.error({ err: error }, "Redis connection error");
});
