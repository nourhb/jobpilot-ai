import { createProcessors } from "../workers/processors";
import type { AgentQueue } from "../scheduler/agentScheduler.service";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { logger } from "../lib/logger";

/**
 * In-process AgentScheduler tick -- the same stopgap role `discover:run`
 * / `apply:run` play for Phases 3 and 6. Runs discovery then matching
 * then (rate-limited) auto-apply without requiring the worker process,
 * so Phase 8 is testable locally (`local_only`) against Docker
 * Postgres + the Mock ATS.
 *
 * Usage: pnpm --filter api run agent:run
 */
async function main(): Promise<void> {
  const box: { processors: ReturnType<typeof createProcessors> | null } = { processors: null };

  const queue: AgentQueue = {
    enqueueDiscovery: async () => {
      await box.processors!.processDiscovery();
    },
    enqueueMatch: async (userId, jobId) => {
      await box.processors!.processMatch({ userId, jobId });
    },
    enqueueApplication: async (userId, jobId) => {
      await box.processors!.processApplication({ userId, jobId });
    },
  };

  box.processors = createProcessors(queue);
  const processors = box.processors;

  logger.info("Running in-process agent tick (discovery + match + auto-apply)");
  await processors.processDiscovery();
  logger.info("In-process agent tick finished");
}

main()
  .catch((error) => {
    logger.error({ err: error }, "In-process agent tick failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
  });
