import { Queue, Worker, type JobsOptions } from "bullmq";
import { createBullmqConnection } from "../lib/redis";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { BULLMQ_PREFIX, QUEUE_NAMES } from "./queueNames";
import { createProcessors } from "../workers/processors";
import type { AgentQueue } from "../scheduler/agentScheduler.service";
import type { ApplicationJobData, MatchJobData } from "../workers/processors";

const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 5_000 },
  removeOnComplete: { count: 200 },
  removeOnFail: { count: 200 },
};

function isDuplicateJobError(error: unknown): boolean {
  return error instanceof Error && /already (exists|exists with this id)/i.test(error.message);
}

async function addIdempotent(queue: Queue, name: string, data: object, jobId: string): Promise<void> {
  try {
    await queue.add(name, data, { ...defaultJobOptions, jobId });
  } catch (error) {
    if (isDuplicateJobError(error)) return;
    throw error;
  }
}

export interface WorkerRuntime {
  queues: {
    discovery: Queue;
    matching: Queue;
    application: Queue;
    notifications: Queue;
    agentTick: Queue;
  };
  workers: Worker[];
  agentQueue: AgentQueue;
  close(): Promise<void>;
}

/**
 * Builds the live BullMQ queues + workers. The scheduler talks only to
 * `agentQueue` (enqueue*), so swapping this for an in-process fake in
 * tests/scripts never requires changing scheduler logic.
 */
export function createWorkerRuntime(): WorkerRuntime {
  const connection = createBullmqConnection();
  const queueConnection = createBullmqConnection();

  const discovery = new Queue(QUEUE_NAMES.JOB_DISCOVERY, { connection: queueConnection, prefix: BULLMQ_PREFIX });
  const matching = new Queue(QUEUE_NAMES.JOB_MATCHING, { connection: queueConnection, prefix: BULLMQ_PREFIX });
  const application = new Queue(QUEUE_NAMES.APPLICATION_PREPARATION, { connection: queueConnection, prefix: BULLMQ_PREFIX });
  const notifications = new Queue(QUEUE_NAMES.NOTIFICATIONS, { connection: queueConnection, prefix: BULLMQ_PREFIX });
  const agentTick = new Queue(QUEUE_NAMES.AGENT_TICK, { connection: queueConnection, prefix: BULLMQ_PREFIX });

  const agentQueue: AgentQueue = {
    enqueueDiscovery: () => addIdempotent(discovery, "discover", {}, "discovery:run"),
    enqueueMatch: (userId, jobId) => addIdempotent(matching, "match", { userId, jobId }, `match:${userId}:${jobId}`),
    enqueueApplication: (userId, jobId) => addIdempotent(application, "apply", { userId, jobId }, `apply:${userId}:${jobId}`),
  };

  const processors = createProcessors(agentQueue);

  const workers = [
    new Worker(QUEUE_NAMES.JOB_DISCOVERY, async () => processors.processDiscovery(), { connection, prefix: BULLMQ_PREFIX, concurrency: 1 }),
    new Worker(QUEUE_NAMES.JOB_MATCHING, async (job) => processors.processMatch(job.data as MatchJobData), { connection, prefix: BULLMQ_PREFIX, concurrency: 2 }),
    new Worker(QUEUE_NAMES.APPLICATION_PREPARATION, async (job) => processors.processApplication(job.data as ApplicationJobData), { connection, prefix: BULLMQ_PREFIX, concurrency: 1 }),
    new Worker(QUEUE_NAMES.AGENT_TICK, async () => processors.processTick(), { connection, prefix: BULLMQ_PREFIX, concurrency: 1 }),
    new Worker(QUEUE_NAMES.NOTIFICATIONS, async () => processors.processNotification(), { connection, prefix: BULLMQ_PREFIX, concurrency: 1 }),
  ];

  for (const worker of workers) {
    worker.on("failed", (job, error) => {
      logger.error({ err: error, queue: worker.name, jobId: job?.id }, "Worker job failed");
    });
  }

  return {
    queues: { discovery, matching, application, notifications, agentTick },
    workers,
    agentQueue,
    async close() {
      await Promise.allSettled([...workers.map((worker) => worker.close()), discovery.close(), matching.close(), application.close(), notifications.close(), agentTick.close()]);
      await Promise.allSettled([connection.quit(), queueConnection.quit()]);
    },
  };
}

export async function registerRepeatableJobs(runtime: WorkerRuntime): Promise<void> {
  await runtime.queues.discovery.upsertJobScheduler("discovery:repeatable", { every: env.DISCOVERY_INTERVAL_MINUTES * 60_000 }, { name: "discover", data: {} });
  await runtime.queues.agentTick.upsertJobScheduler("agent-tick:repeatable", { every: env.AGENT_TICK_INTERVAL_MINUTES * 60_000 }, { name: "tick", data: {} });
  logger.info(
    {
      discoveryIntervalMinutes: env.DISCOVERY_INTERVAL_MINUTES,
      agentTickIntervalMinutes: env.AGENT_TICK_INTERVAL_MINUTES,
    },
    "Registered repeatable agent scheduler jobs",
  );
}
