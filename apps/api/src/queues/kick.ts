import { Queue } from "bullmq";
import { createBullmqConnection } from "../lib/redis";
import { logger } from "../lib/logger";
import { BULLMQ_PREFIX, QUEUE_NAMES } from "./queueNames";

/**
 * API-side enqueue only. Do not start BullMQ workers in the API process.
 * The worker container consumes these jobs.
 */
export async function kickAgentNow(): Promise<void> {
  const connection = createBullmqConnection();
  const agentTick = new Queue(QUEUE_NAMES.AGENT_TICK, { connection, prefix: BULLMQ_PREFIX });
  try {
    await agentTick.add(
      "tick",
      {},
      {
        jobId: `tick:kick:${Date.now()}`,
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 200 },
      },
    );
  } finally {
    await Promise.allSettled([agentTick.close(), connection.quit()]);
  }
  logger.info("Enqueued an immediate agent tick");
}
