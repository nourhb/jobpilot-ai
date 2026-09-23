import { logger } from "./lib/logger";
import { redis } from "./lib/redis";
import { prisma } from "./lib/prisma";

/**
 * PHASE 1 PLACEHOLDER.
 *
 * The real BullMQ worker processes (job-discovery, job-matching,
 * cover-letter-generation, application-preparation/validation/
 * submission/verification, notifications -- see docs/architecture.md,
 * "Queues") are implemented in Phase 8 once there is a job/application
 * pipeline to actually process.
 *
 * This entrypoint exists now so the `worker` Docker service and
 * `pnpm dev:worker` command are already wired end-to-end (connects to
 * Redis + Postgres, logs, shuts down cleanly) rather than being added
 * later as an afterthought.
 */
async function main(): Promise<void> {
  logger.info("Worker process starting (Phase 1 placeholder — no queues registered yet)");

  const heartbeat = setInterval(() => {
    logger.debug("worker heartbeat");
  }, 30_000);

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Worker received ${signal}, shutting down...`);
    clearInterval(heartbeat);
    await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
  logger.error({ err: error }, "Fatal error during worker startup");
  process.exit(1);
});
