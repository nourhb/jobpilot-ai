import type { JobSourceType } from "@prisma/client";
import { jobPreferenceRepository } from "../repositories/jobPreference.repository";
import { jobRepository } from "../repositories/job.repository";
import { jobMatchRepository } from "../repositories/jobMatch.repository";
import { applicationRepository } from "../repositories/application.repository";
import { logger } from "../lib/logger";

/**
 * Narrow enqueue surface the scheduler depends on -- so unit tests can
 * drive it with a fake, and the worker can drive it with real BullMQ
 * queues, without the scheduler importing `bullmq` itself.
 */
export interface AgentQueue {
  enqueueDiscovery(): Promise<void>;
  enqueueMatch(userId: string, jobId: string): Promise<void>;
  enqueueApplication(userId: string, jobId: string): Promise<void>;
}

export interface TickResult {
  usersConsidered: number;
  matchesEnqueued: number;
  applicationsEnqueued: number;
  applicationsSkipped: number;
}

export interface AutoApplyDecision {
  allowed: boolean;
  reason?: string;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Spec section 39 (`AgentScheduler`). Pure orchestration -- never
 * submits an application itself. Auto-apply only *enqueues* an
 * application job; `application.service.ts` (Phase 6) still runs the
 * full Zero Mistake pipeline (validate + policy) before any adapter
 * `submit()`.
 *
 * Rate limits (`maxApplicationsPerDay` / `maxApplicationsPerHour`)
 * apply only to scheduler-enqueued applications. Manual
 * `apply:run` / API retry is never blocked by these.
 */
export const agentSchedulerService = {
  async canAutoApply(
    userId: string,
    jobId: string,
    preferences: {
      autoApplyEnabled: boolean;
      maxApplicationsPerDay: number;
      maxApplicationsPerHour: number;
      allowedSourceTypes: JobSourceType[];
    },
  ): Promise<AutoApplyDecision> {
    if (!preferences.autoApplyEnabled) {
      return { allowed: false, reason: "auto-apply is disabled" };
    }

    const existing = await applicationRepository.findByUserAndJob(userId, jobId);
    if (existing) {
      return { allowed: false, reason: "application already exists" };
    }

    if (preferences.allowedSourceTypes.length > 0) {
      const job = await jobRepository.findByIdWithSource(jobId);
      if (!job) return { allowed: false, reason: "job not found" };
      if (!preferences.allowedSourceTypes.includes(job.source.type)) {
        return { allowed: false, reason: `source type ${job.source.type} is not in the allowlist` };
      }
    }

    const [hourCount, dayCount] = await Promise.all([
      applicationRepository.countCreatedSince(userId, new Date(Date.now() - HOUR_MS)),
      applicationRepository.countCreatedSince(userId, new Date(Date.now() - DAY_MS)),
    ]);

    if (hourCount >= preferences.maxApplicationsPerHour) {
      return { allowed: false, reason: `hourly cap reached (${preferences.maxApplicationsPerHour}/hour)` };
    }
    if (dayCount >= preferences.maxApplicationsPerDay) {
      return { allowed: false, reason: `daily cap reached (${preferences.maxApplicationsPerDay}/day)` };
    }

    return { allowed: true };
  },

  /**
   * After a match is computed: enqueue an application only when the
   * system's own decision is APPLY *and* the user opted into auto-apply
   * *and* rate limits allow it. REVIEW/SKIP never auto-apply -- REVIEW
   * is a human decision (section 28).
   */
  async afterMatch(queue: AgentQueue, userId: string, jobId: string, decision: string): Promise<AutoApplyDecision> {
    if (decision !== "APPLY") {
      return { allowed: false, reason: `match decision is ${decision}, not APPLY` };
    }

    const preferences = await jobPreferenceRepository.getOrCreateForUser(userId);
    const autoApply = await this.canAutoApply(userId, jobId, preferences);
    if (!autoApply.allowed) return autoApply;

    await queue.enqueueApplication(userId, jobId);
    return { allowed: true };
  },

  /**
   * One scheduler tick (section 39). For every user with auto-apply on:
   * enqueue matching for active jobs they have not matched yet, then
   * retry APPLY matches that were previously rate-limited.
   */
  async tick(queue: AgentQueue): Promise<TickResult> {
    const result: TickResult = { usersConsidered: 0, matchesEnqueued: 0, applicationsEnqueued: 0, applicationsSkipped: 0 };
    const users = await jobPreferenceRepository.listAutoApplyEnabled();
    result.usersConsidered = users.length;

    for (const preferences of users) {
      const jobs = await jobRepository.listActiveIds(preferences.allowedSourceTypes);
      const alreadyMatched = new Set((await jobMatchRepository.listJobIdsForUser(preferences.userId)).map((row) => row.jobId));

      for (const job of jobs) {
        if (alreadyMatched.has(job.id)) continue;
        await queue.enqueueMatch(preferences.userId, job.id);
        result.matchesEnqueued += 1;
      }

      const applyJobIds = await jobMatchRepository.listApplyJobIdsForUser(preferences.userId);
      for (const row of applyJobIds) {
        const decision = await this.canAutoApply(preferences.userId, row.jobId, preferences);
        if (!decision.allowed) {
          result.applicationsSkipped += 1;
          continue;
        }
        await queue.enqueueApplication(preferences.userId, row.jobId);
        result.applicationsEnqueued += 1;
      }
    }

    logger.info(result, "Agent scheduler tick completed");
    return result;
  },
};
