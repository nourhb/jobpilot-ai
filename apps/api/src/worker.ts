import { logger } from "./lib/logger";
import { redis } from "./lib/redis";
import { prisma } from "./lib/prisma";
import { createWorkerRuntime, registerRepeatableJobs } from "./queues/bullmq";

/**
 * Phase 8 worker process: consumes the BullMQ queues from section 40
 * and runs the AgentScheduler (section 39) on a repeatable tick.
 *
 * The API process (`server.ts`) never starts these workers -- they
 * share the same codebase but run as a separate Docker service so a
 * stuck submit cannot block HTTP.
 */
async function main(): Promise<void> {
  logger.info("Worker process starting (Phase 8 — BullMQ queues registered)");

  const runtime = createWorkerRuntime();
  await registerRepeatableJobs(runtime);

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Worker received ${signal}, shutting down...`);
    await runtime.close();
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
