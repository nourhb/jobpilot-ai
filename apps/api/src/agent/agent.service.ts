import type { AgentStatus } from "@prisma/client";
import { jobPreferenceRepository } from "../repositories/jobPreference.repository";
import { dashboardRepository } from "../repositories/dashboard.repository";
import { notificationService } from "../notifications/notification.service";
import { auditService } from "../audit/audit.service";
import { AppError } from "../middleware/errorHandler";

const AUDIT_BY_STATUS: Record<Exclude<AgentStatus, "ERROR">, "AGENT_STARTED" | "AGENT_PAUSED" | "AGENT_STOPPED"> = {
  RUNNING: "AGENT_STARTED",
  PAUSED: "AGENT_PAUSED",
  STOPPED: "AGENT_STOPPED",
};

/**
 * Phase 9 (sections 47-49). Runtime control for the AgentScheduler.
 * START/PAUSE/STOP only flip `JobPreference.agentStatus`; the worker
 * still requires `autoApplyEnabled` before it will enqueue applications.
 */
export const agentService = {
  async getState(userId: string) {
    const preferences = await jobPreferenceRepository.getOrCreateForUser(userId);
    return {
      agentStatus: preferences.agentStatus,
      autoApplyEnabled: preferences.autoApplyEnabled,
      minimumMatchScore: preferences.minimumMatchScore,
      maxApplicationsPerDay: preferences.maxApplicationsPerDay,
      maxApplicationsPerHour: preferences.maxApplicationsPerHour,
      allowedSourceTypes: preferences.allowedSourceTypes,
      autoCoverLetterEnabled: preferences.autoCoverLetterEnabled,
      autoQuestionAnswerEnabled: preferences.autoQuestionAnswerEnabled,
    };
  },

  async setStatus(userId: string, agentStatus: Exclude<AgentStatus, "ERROR">) {
    await jobPreferenceRepository.getOrCreateForUser(userId);
    const updated = await jobPreferenceRepository.update(userId, { agentStatus });
    await auditService.log(AUDIT_BY_STATUS[agentStatus], { userId, entityType: "JobPreference", entityId: updated.id });

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
