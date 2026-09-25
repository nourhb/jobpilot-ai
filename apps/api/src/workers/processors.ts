import { jobDiscoveryService } from "../jobs/jobDiscovery.service";
import { jobMatchService } from "../matching/jobMatch.service";
import { applicationService } from "../applications/application.service";
import { agentSchedulerService, type AgentQueue } from "../scheduler/agentScheduler.service";
import { logger } from "../lib/logger";

export interface MatchJobData {
  userId: string;
  jobId: string;
}

export interface ApplicationJobData {
  userId: string;
  jobId: string;
}

/**
 * Spec section 41 workers, implemented as plain async functions so they
 * stay unit-testable without Redis. The BullMQ `Worker` wrappers in
 * `queues/bullmq.ts` call these.
 *
 * Every processor is idempotent (section 41 / 42):
 * - discovery upserts by (sourceId, externalId)
 * - matching upserts by (userId, jobId)
 * - application createAndProcess returns the existing row if one exists
 */
export function createProcessors(queue: AgentQueue) {
  return {
    async processDiscovery(): Promise<void> {
      const results = await jobDiscoveryService.runForAllEnabledSources();
      logger.info({ results }, "Job discovery worker finished");
      await agentSchedulerService.tick(queue);
    },

    async processMatch(data: MatchJobData): Promise<void> {
      const match = await jobMatchService.getOrComputeMatch(data.userId, data.jobId);
      await agentSchedulerService.afterMatch(queue, data.userId, data.jobId, match.decision);
    },

    async processApplication(data: ApplicationJobData): Promise<void> {
      await applicationService.createAndProcess(data.userId, data.jobId);
    },

    async processTick(): Promise<void> {
      await agentSchedulerService.tick(queue);
    },

    async processNotification(): Promise<void> {
      // Phase 9 owns the real notification fan-out. The queue exists now
      // (section 40) so Phase 8 can register it without inventing a
      // delivery channel.
    },
  };
}
