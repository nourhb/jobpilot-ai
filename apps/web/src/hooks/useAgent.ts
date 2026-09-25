import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agentService } from "@/services/agentService";

const AGENT_KEY = ["agent"] as const;

export function useAgent() {
  return useQuery({
    queryKey: AGENT_KEY,
    queryFn: async () => (await agentService.getState()).agent,
  });
}

export function useAgentLogs() {
  return useQuery({
    queryKey: [...AGENT_KEY, "logs"],
    queryFn: async () => (await agentService.listLogs()).logs,
  });
}

export function useAgentCommand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: "start" | "pause" | "stop") => agentService.command(command),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: AGENT_KEY });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
