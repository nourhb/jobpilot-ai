import type { AgentStatus } from "@prisma/client";
import { jobPreferenceRepository } from "../repositories/jobPreference.repository";
import { dashboardRepository } from "../repositories/dashboard.repository";
import { notificationService } from "../notifications/notification.service";
import { auditService } from "../audit/audit.service";
import { profileService } from "../profile/profile.service";
import { kickAgentNow } from "../queues/kick";
import { AppError } from "../middleware/errorHandler";
import { logger } from "../lib/logger";

const AUDIT_BY_STATUS: Record<Exclude<AgentStatus, "ERROR">, "AGENT_STARTED" | "AGENT_PAUSED" | "AGENT_STOPPED"> = {
  RUNNING: "AGENT_STARTED",
  PAUSED: "AGENT_PAUSED",
  STOPPED: "AGENT_STOPPED",
};

/**
 * Runtime control for the job-search agent. START turns auto-apply on
 * and kicks an immediate tick so the agent actually looks and applies.
 */
export const agentService = {
  async getState(userId: string) {
    const [preferences, profile] = await Promise.all([
      jobPreferenceRepository.getOrCreateForUser(userId),
      profileService.getVerifiedCandidateProfile(userId),
    ]);
    return {
      agentStatus: preferences.agentStatus,
      autoApplyEnabled: preferences.autoApplyEnabled,
      minimumMatchScore: preferences.minimumMatchScore,
      maxApplicationsPerDay: preferences.maxApplicationsPerDay,
      maxApplicationsPerHour: preferences.maxApplicationsPerHour,
      allowedSourceTypes: preferences.allowedSourceTypes,
      autoCoverLetterEnabled: preferences.autoCoverLetterEnabled,
      autoQuestionAnswerEnabled: preferences.autoQuestionAnswerEnabled,
      profileReady: profile.skills.length > 0 || profile.experience.length > 0,
    };
  },

  async setStatus(userId: string, agentStatus: Exclude<AgentStatus, "ERROR">) {
    await jobPreferenceRepository.getOrCreateForUser(userId);
    const updated = await jobPreferenceRepository.update(userId, {
      agentStatus,
      ...(agentStatus === "RUNNING"
        ? {
            autoApplyEnabled: true,
            autoCoverLetterEnabled: true,
            autoQuestionAnswerEnabled: true,
          }
        : {}),
    });
    await auditService.log(AUDIT_BY_STATUS[agentStatus], { userId, entityType: "JobPreference", entityId: updated.id });

    if (agentStatus === "RUNNING") {
      try {
        await kickAgentNow();
      } catch (error) {
        logger.warn({ err: error }, "Could not enqueue an immediate agent tick");
      }
    }

    if (agentStatus === "STOPPED") {
      await notificationService.notify({
        userId,
        type: "AGENT_STOPPED",
        title: "Agent stopped",
        body: "The job search agent is stopped and will not auto-apply.",
      });
    }

    return this.getState(userId);
  },

  async listLogs(userId: string) {
    const events = await dashboardRepository.listRecentApplicationEvents(userId);
    return events.map((event) => ({
      at: event.createdAt,
      status: event.status,
      message: event.message ?? event.status,
      company: event.application.job.company,
      title: event.application.job.title,
      applicationId: event.applicationId,
    }));
  },
};

export function parseAgentCommand(command: string): Exclude<AgentStatus, "ERROR"> {
  switch (command) {
    case "start":
      return "RUNNING";
    case "pause":
      return "PAUSED";
    case "stop":
      return "STOPPED";
    default:
      throw new AppError(400, "INVALID_AGENT_COMMAND", "Agent command must be start, pause, or stop.");
  }
}
