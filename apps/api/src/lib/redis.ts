import Redis from "ioredis";
import { env } from "../config/env";
import { logger } from "./logger";

/**
 * Shared Redis connection for health checks and ad-hoc commands.
 * BullMQ workers need their own connections with
 * `maxRetriesPerRequest: null` -- see `createBullmqConnection()`.
 */
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redis.on("error", (error) => {
  logger.error({ err: error }, "Redis connection error");
});

/**
 * BullMQ-compatible ioredis connection. BullMQ blocks on BRPOP and
 * requires `maxRetriesPerRequest: null` -- the shared `redis` instance
 * above must not be reused for queues/workers.
 */
export function createBullmqConnection(): Redis {
  const connection = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: false,
  });
  connection.on("error", (error) => {
    logger.error({ err: error }, "BullMQ Redis connection error");
  });
  return connection;
}
