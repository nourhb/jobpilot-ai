import { apiRequest } from "./apiClient";

export interface AgentState {
  agentStatus: string;
  autoApplyEnabled: boolean;
  minimumMatchScore: number;
  maxApplicationsPerDay: number;
  maxApplicationsPerHour: number;
  allowedSourceTypes: string[];
  autoCoverLetterEnabled: boolean;
  autoQuestionAnswerEnabled: boolean;
}

export interface AgentLog {
  at: string;
  status: string;
  message: string;
  company: string;
  title: string;
  applicationId: string;
}

export const agentService = {
  getState() {
    return apiRequest<{ agent: AgentState }>("/api/agent");
  },

  command(command: "start" | "pause" | "stop") {
    return apiRequest<{ agent: AgentState }>(`/api/agent/${command}`, { method: "POST" });
  },

  listLogs() {
    return apiRequest<{ logs: AgentLog[] }>("/api/agent/logs");
  },
};
